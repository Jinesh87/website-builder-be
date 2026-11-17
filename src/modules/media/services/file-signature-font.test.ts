import assert from "node:assert/strict";
import { test } from "node:test";
import { MediaKind } from "../../../common/constants/media.js";
import { detectFile, detectFont } from "./file-signature.js";

const withHeader = (head: number[] | string) =>
  Buffer.concat([typeof head === "string" ? Buffer.from(head, "latin1") : Buffer.from(head), Buffer.alloc(32)]);

test("recognises web fonts by signature, stored as documents", () => {
  assert.deepEqual(detectFont(withHeader("wOF2")), { kind: MediaKind.DOCUMENT, mimeType: "font/woff2", extension: "woff2" });
  assert.equal(detectFont(withHeader("wOFF"))?.mimeType, "font/woff");
  assert.equal(detectFont(withHeader("OTTO"))?.mimeType, "font/otf");
  assert.equal(detectFont(withHeader([0x00, 0x01, 0x00, 0x00]))?.mimeType, "font/ttf");
  assert.equal(detectFont(withHeader("true"))?.mimeType, "font/ttf");
});

test("rejects non-fonts, and the media library detector still ignores fonts", () => {
  assert.equal(detectFont(withHeader("%PDF-")), null);
  assert.equal(detectFont(Buffer.from("wOF2")), null);
  assert.equal(detectFile(withHeader("wOF2")), null);
});
