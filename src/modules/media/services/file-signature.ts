import { MediaKind } from "../../../common/constants/media.js";

export type DetectedFile = {
  kind: MediaKind;
  mimeType: string;
  extension: string;
  width?: number;
  height?: number;
};

type Dimensions = { width: number; height: number };

const JPEG_SOF_MARKERS = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
const MP4_BRANDS = new Set(["isom", "iso2", "iso4", "iso5", "iso6", "mp41", "mp42", "avc1", "dash", "M4V "]);
const AVIF_BRANDS = new Set(["avif", "avis"]);

function ascii(buffer: Buffer, start: number, end: number): string {
  return buffer.subarray(start, end).toString("latin1");
}

function pngSize(buffer: Buffer): Dimensions | undefined {
  if (buffer.length < 24 || ascii(buffer, 12, 16) !== "IHDR") return undefined;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function gifSize(buffer: Buffer): Dimensions | undefined {
  if (buffer.length < 10) return undefined;
  return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
}

function webpSize(buffer: Buffer): Dimensions | undefined {
  const chunk = ascii(buffer, 12, 16);
  if (chunk === "VP8 " && buffer.length >= 30) {
    return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
  }
  if (chunk === "VP8L" && buffer.length >= 25) {
    const [b0, b1, b2, b3] = [buffer[21], buffer[22], buffer[23], buffer[24]];
    return {
      width: 1 + (((b1 & 0x3f) << 8) | b0),
      height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
    };
  }
  if (chunk === "VP8X" && buffer.length >= 30) {
    return { width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3) };
  }
  return undefined;
}

function jpegSize(buffer: Buffer): Dimensions | undefined {
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) return undefined;
    const marker = buffer[offset + 1];
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    if (JPEG_SOF_MARKERS.has(marker)) {
      return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
    }
    offset += 2 + buffer.readUInt16BE(offset + 2);
  }
  return undefined;
}

function image(mimeType: string, extension: string, size: Dimensions | undefined): DetectedFile {
  return size && size.width > 0 && size.height > 0
    ? { kind: MediaKind.IMAGE, mimeType, extension, width: size.width, height: size.height }
    : { kind: MediaKind.IMAGE, mimeType, extension };
}

/**
 * Identifies an upload from its leading bytes; the browser-supplied type and name are not trusted.
 * Returns null for anything outside the allowed formats (SVG and HTML are deliberately excluded).
 */
export function detectFile(buffer: Buffer): DetectedFile | null {
  if (buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return image("image/jpeg", "jpg", jpegSize(buffer));
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return image("image/png", "png", pngSize(buffer));
  }
  const head = ascii(buffer, 0, 6);
  if (head === "GIF87a" || head === "GIF89a") return image("image/gif", "gif", gifSize(buffer));
  if (ascii(buffer, 0, 4) === "RIFF" && ascii(buffer, 8, 12) === "WEBP") return image("image/webp", "webp", webpSize(buffer));

  if (ascii(buffer, 4, 8) === "ftyp") {
    const brand = ascii(buffer, 8, 12);
    if (AVIF_BRANDS.has(brand)) return image("image/avif", "avif", undefined);
    if (MP4_BRANDS.has(brand)) return { kind: MediaKind.VIDEO, mimeType: "video/mp4", extension: "mp4" };
    return null;
  }
  if (buffer.readUInt32BE(0) === 0x1a45dfa3 && ascii(buffer, 0, 64).includes("webm")) {
    return { kind: MediaKind.VIDEO, mimeType: "video/webm", extension: "webm" };
  }
  if (ascii(buffer, 0, 5) === "%PDF-") return { kind: MediaKind.DOCUMENT, mimeType: "application/pdf", extension: "pdf" };

  return null;
}

/** Web font file types an HTML import may bring along; stored as documents in the media library. */
export const FONT_MIME_TYPES: ReadonlySet<string> = new Set(["font/woff2", "font/woff", "font/ttf", "font/otf"]);

/**
 * Recognises a web font by its signature. Only HTML imports store fonts (their CSS @font-face rules
 * point at them); the media library upload keeps using detectFile, which does not accept fonts.
 */
export function detectFont(buffer: Buffer): DetectedFile | null {
  if (buffer.length < 12) return null;
  const tag = ascii(buffer, 0, 4);
  if (tag === "wOF2") return { kind: MediaKind.DOCUMENT, mimeType: "font/woff2", extension: "woff2" };
  if (tag === "wOFF") return { kind: MediaKind.DOCUMENT, mimeType: "font/woff", extension: "woff" };
  if (tag === "OTTO") return { kind: MediaKind.DOCUMENT, mimeType: "font/otf", extension: "otf" };
  if (buffer.readUInt32BE(0) === 0x00010000 || tag === "true") {
    return { kind: MediaKind.DOCUMENT, mimeType: "font/ttf", extension: "ttf" };
  }
  return null;
}

/** Windows .ico (favicon). Only HTML imports store these, for the site favicon; library uploads use detectFile. */
export function detectIcon(buffer: Buffer): DetectedFile | null {
  if (buffer.length < 22) return null;
  // ICONDIR: reserved 0, type 1 (icon), at least one image.
  if (buffer.readUInt16LE(0) !== 0 || buffer.readUInt16LE(2) !== 1 || buffer.readUInt16LE(4) < 1) return null;
  return { kind: MediaKind.IMAGE, mimeType: "image/x-icon", extension: "ico" };
}
