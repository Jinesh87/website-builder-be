import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { optimizeMp4FastStart } from "./mp4-faststart.service.js";

/**
 * Builds a valid minimal MP4 box with size and 4-char type.
 */
function buildBox(type: string, payload: Buffer): Buffer {
  const size = 8 + payload.length;
  const header = Buffer.alloc(8);
  header.writeUInt32BE(size, 0);
  header.write(type, 4, 4, "ascii");
  return Buffer.concat([header, payload]);
}

/**
 * Helper to build an stco box with a list of chunk offsets.
 */
function buildStcoBox(offsets: number[]): Buffer {
  const payload = Buffer.alloc(8 + offsets.length * 4);
  // version (1) + flags (3) = 4 bytes (all 0)
  // entry_count (4 bytes)
  payload.writeUInt32BE(offsets.length, 4);
  offsets.forEach((off, i) => {
    payload.writeUInt32BE(off, 8 + i * 4);
  });
  return buildBox("stco", payload);
}

/**
 * Helper to build a minimal tkhd box with width and height.
 */
function buildTkhdBox(width: number, height: number): Buffer {
  // Version 0 tkhd is 84 bytes of headers + 8 bytes (width, height)
  const payload = Buffer.alloc(84); // 84 bytes payload (after 8 bytes box header -> 92 total box size)
  // width at payload offset 76 (which is box offset 84)
  payload.writeUInt16BE(width, 76);
  // height at payload offset 80 (which is box offset 88)
  payload.writeUInt16BE(height, 80);
  return buildBox("tkhd", payload);
}

describe("optimizeMp4FastStart", () => {
  it("detects unoptimized MP4 where moov is after mdat, shifts moov to front, and adjusts stco offsets", () => {
    // 1. Build ftyp box
    const ftyp = buildBox("ftyp", Buffer.from("mp42\x00\x00\x00\x00mp42isom", "binary"));

    // 2. Build dummy mdat (e.g. 50 bytes of video samples)
    const mdatPayload = Buffer.alloc(50, 0xaa);
    const mdat = buildBox("mdat", mdatPayload); // 8 + 50 = 58 bytes

    // 3. Build moov box with tkhd and stco
    const tkhd = buildTkhdBox(1920, 1080);
    const initialOffset = ftyp.length; // offset where mdat started
    const stco = buildStcoBox([initialOffset, initialOffset + 20]);
    const stbl = buildBox("stbl", stco);
    const minf = buildBox("minf", stbl);
    const mdia = buildBox("mdia", minf);
    const trak = buildBox("trak", Buffer.concat([tkhd, mdia]));
    const moov = buildBox("moov", trak);

    // Assembly with moov AFTER mdat (typical slow phone recording)
    const unoptimized = Buffer.concat([ftyp, mdat, moov]);

    const result = optimizeMp4FastStart(unoptimized);

    assert.equal(result.optimized, true);
    assert.equal(result.alreadyFastStart, false);
    assert.equal(result.width, 1920);
    assert.equal(result.height, 1080);
    assert.equal(result.buffer.length, unoptimized.length);

    // Verify in the new buffer: moov is placed BEFORE mdat
    const moovIndex = result.buffer.indexOf(Buffer.from("moov", "ascii"));
    const mdatIndex = result.buffer.indexOf(Buffer.from("mdat", "ascii"));
    assert.ok(moovIndex > 0);
    assert.ok(mdatIndex > 0);
    assert.ok(moovIndex < mdatIndex, "moov must be placed before mdat for FastStart");

    // Re-running on already-optimized buffer should return alreadyFastStart: true
    const rechecked = optimizeMp4FastStart(result.buffer);
    assert.equal(rechecked.optimized, false);
    assert.equal(rechecked.alreadyFastStart, true);
    assert.equal(rechecked.width, 1920);
    assert.equal(rechecked.height, 1080);
  });

  it("safely handles non-MP4 or malformed buffer without throwing", () => {
    const invalid = Buffer.from("not an mp4 file at all");
    const result = optimizeMp4FastStart(invalid);
    assert.equal(result.optimized, false);
    assert.equal(result.alreadyFastStart, false);
    assert.deepEqual(result.buffer, invalid);
  });
});
