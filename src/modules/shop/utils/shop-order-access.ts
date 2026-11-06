import { randomBytes } from "node:crypto";

export function newOrderAccessToken(): string {
  return randomBytes(32).toString("base64url");
}

export function orderTrackPath(token: string): string {
  return `/?wbOrderTrack=${encodeURIComponent(token)}`;
}

export function orderTrackUrl(siteBaseUrl: string, token: string): string {
  const base = siteBaseUrl.replace(/\/$/, "");
  return `${base}${orderTrackPath(token)}`;
}
