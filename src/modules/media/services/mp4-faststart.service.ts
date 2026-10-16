import { logger } from "../../../config/logger.js";

export interface Mp4Metadata {
  width?: number;
  height?: number;
  durationSec?: number;
  alreadyFastStart: boolean;
  optimized: boolean;
  buffer: Buffer;
}

interface Mp4Box {
  type: string;
  offset: number;
  size: number;
  headerSize: number;
}

const CONTAINER_TYPES = new Set(["moov", "trak", "edts", "mdia", "minf", "dinf", "stbl", "udta"]);

/**
 * Traverses boxes within a slice of an MP4 buffer.
 */
function walkBoxes(
  buf: Buffer,
  start: number,
  end: number,
  onBox: (type: string, boxStart: number, boxSize: number, headerSize: number) => void,
): void {
  let curr = start;
  while (curr + 8 <= end) {
    let size = buf.readUInt32BE(curr);
    const type = buf.toString("ascii", curr + 4, curr + 8);
    let headerSize = 8;

    if (size === 1) {
      if (curr + 16 > end) break;
      const extSize = buf.readBigUInt64BE(curr + 8);
      // In JS, numbers are safe up to 2^53 - 1 (9 PB)
      size = Number(extSize);
      headerSize = 16;
    } else if (size === 0) {
      size = end - curr;
    }

    if (size < headerSize || curr + size > end) {
      break;
    }

    onBox(type, curr, size, headerSize);

    if (CONTAINER_TYPES.has(type)) {
      walkBoxes(buf, curr + headerSize, curr + size, onBox);
    }

    curr += size;
  }
}

/**
 * Reads top-level boxes only.
 */
function readTopLevelBoxes(buf: Buffer): Mp4Box[] {
  const boxes: Mp4Box[] = [];
  let curr = 0;
  const end = buf.length;

  while (curr + 8 <= end) {
    let size = buf.readUInt32BE(curr);
    const type = buf.toString("ascii", curr + 4, curr + 8);
    let headerSize = 8;

    if (size === 1) {
      if (curr + 16 > end) break;
      size = Number(buf.readBigUInt64BE(curr + 8));
      headerSize = 16;
    } else if (size === 0) {
      size = end - curr;
    }

    if (size < headerSize || curr + size > end) {
      break;
    }

    boxes.push({ type, offset: curr, size, headerSize });
    curr += size;
  }

  return boxes;
}

/**
 * Optimizes an MP4 video buffer for instant, zero-buffering web playback.
 * 
 * 1. Visually Lossless: Does not touch or re-encode video/audio samples in `mdat`.
 * 2. Zero-CPU / Zero-Lag: Shifts the `moov` (movie metadata index) ahead of `mdat`
 *    and increments chunk offset tables (`stco`/`co64`) in milliseconds.
 * 3. Extracts video track dimensions (`width`, `height`) and `durationSec`.
 * 4. Completely immune to CPU exhaustion and server crashes (pure in-memory Buffer manipulation).
 */
export function optimizeMp4FastStart(inputBuffer: Buffer): Mp4Metadata {
  try {
    const topBoxes = readTopLevelBoxes(inputBuffer);
    const moovBox = topBoxes.find((b) => b.type === "moov");
    const mdatBox = topBoxes.find((b) => b.type === "mdat");

    let detectedWidth: number | undefined;
    let detectedHeight: number | undefined;
    let detectedDurationSec: number | undefined;

    // Helper to inspect metadata inside moov
    const inspectMoovMetadata = (buf: Buffer, moovOffset: number, moovSize: number, headerSize: number) => {
      walkBoxes(buf, moovOffset + headerSize, moovOffset + moovSize, (type, boxStart, boxSize) => {
        // Track Header (tkhd) -> width & height
        if (type === "tkhd" && boxSize >= 84) {
          const version = buf.readUInt8(boxStart + 8);
          const widthOffset = version === 0 ? boxStart + 84 : boxStart + 96;
          const heightOffset = version === 0 ? boxStart + 88 : boxStart + 100;

          if (heightOffset + 4 <= boxStart + boxSize) {
            const w = buf.readUInt16BE(widthOffset);
            const h = buf.readUInt16BE(heightOffset);
            // Valid visual video track has non-zero dimensions
            if (w > 0 && h > 0 && (!detectedWidth || !detectedHeight)) {
              detectedWidth = w;
              detectedHeight = h;
            }
          }
        }

        // Movie Header (mvhd) -> duration & timescale
        if (type === "mvhd" && boxSize >= 28) {
          const version = buf.readUInt8(boxStart + 8);
          if (version === 0 && boxStart + 28 <= buf.length) {
            const timescale = buf.readUInt32BE(boxStart + 20);
            const duration = buf.readUInt32BE(boxStart + 24);
            if (timescale > 0) {
              detectedDurationSec = Math.round((duration / timescale) * 100) / 100;
            }
          } else if (version === 1 && boxStart + 40 <= buf.length) {
            const timescale = buf.readUInt32BE(boxStart + 28);
            const duration = Number(buf.readBigUInt64BE(boxStart + 32));
            if (timescale > 0) {
              detectedDurationSec = Math.round((duration / timescale) * 100) / 100;
            }
          }
        }
      });
    };

    // If no moov or mdat found, we cannot optimize, return original
    if (!moovBox || !mdatBox) {
      return {
        alreadyFastStart: false,
        optimized: false,
        buffer: inputBuffer,
      };
    }

    // Inspect metadata from moov
    inspectMoovMetadata(inputBuffer, moovBox.offset, moovBox.size, moovBox.headerSize);

    // If moov is already positioned before mdat, the file is ALREADY FastStart!
    if (moovBox.offset < mdatBox.offset) {
      return {
        width: detectedWidth,
        height: detectedHeight,
        durationSec: detectedDurationSec,
        alreadyFastStart: true,
        optimized: false,
        buffer: inputBuffer,
      };
    }

    // moov is AFTER mdat. We must shift moov before mdat.
    // When moov moves ahead of mdat, all offsets inside mdat shift by `delta = moovBox.size`.
    const delta = moovBox.size;
    const moovCopy = Buffer.from(inputBuffer.subarray(moovBox.offset, moovBox.offset + moovBox.size));

    // Walk all boxes inside moovCopy and adjust chunk offsets in `stco` and `co64`
    walkBoxes(moovCopy, 0, moovCopy.length, (type, boxStart, boxSize) => {
      // 32-bit chunk offset box
      if (type === "stco" && boxSize >= 16) {
        const entryCount = moovCopy.readUInt32BE(boxStart + 12);
        const maxEntries = Math.floor((boxSize - 16) / 4);
        const count = Math.min(entryCount, maxEntries);

        for (let i = 0; i < count; i++) {
          const pos = boxStart + 16 + i * 4;
          const currentVal = moovCopy.readUInt32BE(pos);
          moovCopy.writeUInt32BE(currentVal + delta, pos);
        }
      }

      // 64-bit chunk offset box
      if (type === "co64" && boxSize >= 16) {
        const entryCount = moovCopy.readUInt32BE(boxStart + 12);
        const maxEntries = Math.floor((boxSize - 16) / 8);
        const count = Math.min(entryCount, maxEntries);
        const bigDelta = BigInt(delta);

        for (let i = 0; i < count; i++) {
          const pos = boxStart + 16 + i * 8;
          const currentVal = moovCopy.readBigUInt64BE(pos);
          moovCopy.writeBigUInt64BE(currentVal + bigDelta, pos);
        }
      }
    });

    // Reassemble:
    // [0 ... mdatBox.offset) (ftyp and any preceding headers)
    // [moovCopy] (shifted moov with updated chunk offsets)
    // [mdatBox.offset ... moovBox.offset) (mdat and any intervening boxes)
    // [moovBox.offset + moovBox.size ... EOF) (any trailing boxes)
    const beforeMdat = inputBuffer.subarray(0, mdatBox.offset);
    const mdatToMoov = inputBuffer.subarray(mdatBox.offset, moovBox.offset);
    const afterMoov = inputBuffer.subarray(moovBox.offset + moovBox.size);

    const optimizedBuffer = Buffer.concat([beforeMdat, moovCopy, mdatToMoov, afterMoov]);

    return {
      width: detectedWidth,
      height: detectedHeight,
      durationSec: detectedDurationSec,
      alreadyFastStart: false,
      optimized: true,
      buffer: optimizedBuffer,
    };
  } catch (err) {
    logger.warn({ err }, "MP4 FastStart optimization skipped due to parsing error; keeping original file");
    return {
      alreadyFastStart: false,
      optimized: false,
      buffer: inputBuffer,
    };
  }
}
