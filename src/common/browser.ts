import { accessSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import puppeteer, { type Browser } from "puppeteer";
import { env } from "../config/env.js";

const SYSTEM_CHROME_CANDIDATES = [
  process.env.PUPPETEER_EXECUTABLE_PATH?.trim(),
  process.env.CHROME_PATH?.trim(),
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "/snap/bin/chromium",
].filter((value): value is string => Boolean(value));

function exists(path: string): boolean {
  try {
    accessSync(path);
    return true;
  } catch {
    return false;
  }
}

/** Prefer an explicit/system binary; otherwise Puppeteer's downloaded Chrome. */
export function resolveChromeExecutable(): string | undefined {
  for (const candidate of SYSTEM_CHROME_CANDIDATES) {
    if (exists(candidate)) return candidate;
  }

  // Reuse Chromium already downloaded by another Puppeteer install on this machine.
  const cacheRoots = [
    process.env.PUPPETEER_CACHE_DIR?.trim(),
    join(homedir(), ".cache", "puppeteer"),
  ].filter((value): value is string => Boolean(value));

  for (const root of cacheRoots) {
    const chromeRoot = join(root, "chrome");
    if (!exists(chromeRoot)) continue;
    try {
      const versions = readdirSync(chromeRoot).sort().reverse();
      for (const version of versions) {
        const linux = join(chromeRoot, version, "chrome-linux64", "chrome");
        const mac = join(chromeRoot, version, "chrome-mac-x64", "Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing");
        if (exists(linux)) return linux;
        if (exists(mac)) return mac;
      }
    } catch {
      // ignore unreadable cache
    }
  }

  return undefined;
}

/**
 * A fresh browser for one job (an HTML import prerender, an invoice PDF). Close it when done.
 *
 * With CHROMIUM_WS_URL set (production), the browser runs in the separate `chromium` container,
 * which starts a new Chromium per connection, so untrusted imported pages never run next to the
 * backend's secrets. Without it (local development), Chromium is launched here with `localArgs`.
 */
export async function openBrowser(localArgs: string[]): Promise<Browser> {
  if (env.CHROMIUM_WS_URL) {
    return puppeteer.connect({ browserWSEndpoint: env.CHROMIUM_WS_URL, defaultViewport: null, protocolTimeout: 120_000 });
  }
  const executablePath = resolveChromeExecutable();
  return puppeteer.launch({
    ...(executablePath ? { executablePath } : {}),
    headless: true,
    args: localArgs,
  });
}
