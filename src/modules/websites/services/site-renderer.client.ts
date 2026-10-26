import { env } from "../../../config/env.js";
import { logger } from "../../../config/logger.js";
import type { PublishSnapshot } from "../types/website.types.js";

/** Output of the frontend site-renderer service (frontend/src/site-renderer). */
export type RenderedSitePage = {
  /** Font stylesheets and image preloads for <head> */
  head: string;
  body: string;
  assetsVersion: string;
};

export type SiteAssets = { version: string; css: string; js: string };

const RENDER_TIMEOUT_MS = 10_000;

let assets: SiteAssets | null = null;
let assetsRequest: Promise<SiteAssets> | null = null;

async function call<T>(path: string, init?: RequestInit): Promise<{ status: number; body: T }> {
  const response = await fetch(`${env.SITE_RENDERER_URL}${path}`, { ...init, signal: AbortSignal.timeout(RENDER_TIMEOUT_MS) });
  return { status: response.status, body: (await response.json()) as T };
}

export const siteRendererClient = {
  /** Null when the page doesn't exist; throws when the renderer is unreachable or fails. */
  async render(snapshot: PublishSnapshot & { shop?: unknown }, slug: string): Promise<RenderedSitePage | null> {
    const { status, body } = await call<RenderedSitePage & { error?: string }>("/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ site: snapshot, slug }),
    });
    if (status === 404) return null;
    if (status !== 200) throw new Error(`Site renderer returned ${status}: ${body.error ?? "unknown error"}`);
    // A redeployed renderer ships new CSS/JS; drop ours so the next asset request refetches it.
    if (assets && assets.version !== body.assetsVersion) assets = null;
    return body;
  },

  async assets(): Promise<SiteAssets> {
    if (assets) return assets;
    assetsRequest ??= call<SiteAssets>("/assets")
      .then(({ status, body }) => {
        if (status !== 200) throw new Error(`Site renderer returned ${status} for assets`);
        assets = body;
        return body;
      })
      .catch((error: unknown) => {
        logger.warn({ err: error }, "Site renderer assets unavailable");
        throw error;
      })
      .finally(() => {
        assetsRequest = null;
      });
    return assetsRequest;
  },
};
