import { env } from "../../../config/env.js";
import { prisma } from "../../../config/prisma.js";
import type { ImageRef } from "../types/site-content.types.js";

const MEDIA_FILE_URL = /\/api\/media\/files\/([0-9a-f-]{36})(?:[/?#]|$)/i;

const TYPE_BY_EXTENSION: Record<string, string> = {
  ico: "image/x-icon",
  png: "image/png",
  svg: "image/svg+xml",
  gif: "image/gif",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  avif: "image/avif",
};

/** Formats iOS accepts for the home-screen icon. */
const TOUCH_ICON_TYPES = new Set(["image/png", "image/jpeg"]);

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function absolute(url: string): string {
  if (url.startsWith("/") && !url.startsWith("//")) return `${env.API_PUBLIC_URL}${url}`;
  return url;
}

/** The file type for the `type` attribute: from a data URI, the media library row, or the extension. */
async function mimeTypeOf(url: string): Promise<string | null> {
  const dataType = /^data:(image\/[a-z0-9.+-]+)[;,]/i.exec(url)?.[1];
  if (dataType) return dataType.toLowerCase();
  const mediaId = MEDIA_FILE_URL.exec(url)?.[1];
  if (mediaId) {
    const file = await prisma.mediaFile.findUnique({ where: { id: mediaId }, select: { mimeType: true } });
    return file?.mimeType ?? null;
  }
  const extension = /\.([a-z0-9]+)(?:[?#]|$)/i.exec(url)?.[1]?.toLowerCase();
  return (extension && TYPE_BY_EXTENSION[extension]) || null;
}

/**
 * `<link>` tags for the browser-tab icon: the theme's favicon, else the website logo. Adds an
 * apple-touch-icon when the file is PNG or JPEG. Empty when neither is set.
 */
export async function faviconHeadTags(
  favicon: ImageRef | null | undefined,
  logo: { id: string; mimeType: string } | null | undefined,
): Promise<string> {
  const themeUrl = favicon?.url?.trim();
  const url = themeUrl ? absolute(themeUrl) : logo ? `${env.API_PUBLIC_URL}/api/media/files/${logo.id}` : "";
  if (!url) return "";
  const mimeType = themeUrl ? await mimeTypeOf(themeUrl) : logo!.mimeType;
  const href = escapeAttr(url);
  const tags = [`<link rel="icon"${mimeType ? ` type="${escapeAttr(mimeType)}"` : ""} href="${href}" />`];
  if (mimeType && TOUCH_ICON_TYPES.has(mimeType)) tags.push(`<link rel="apple-touch-icon" href="${href}" />`);
  return tags.join("\n    ");
}
