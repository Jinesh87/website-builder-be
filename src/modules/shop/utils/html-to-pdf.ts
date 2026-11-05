import { accessSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { readdirSync } from "node:fs";
import puppeteer from "puppeteer";

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
function resolveChromeExecutable(): string | undefined {
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

/** Renders HTML to a PDF buffer. Uses system Chrome if present, else Puppeteer's bundled browser. */
export async function htmlToPdf(html: string): Promise<Buffer> {
  const executablePath = resolveChromeExecutable();
  const browser = await puppeteer.launch({
    ...(executablePath ? { executablePath } : {}),
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage();
    // Match the on-screen invoice (avoid @media print rules that strip card border/background).
    await page.emulateMediaType("screen");
    await page.setViewport({ width: 900, height: 1200, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: "load", timeout: 30_000 });
    await page.waitForNetworkIdle({ idleTime: 250, timeout: 5_000 }).catch(() => undefined);
    // Hide download chrome before capturing.
    await page.addStyleTag({
      content: ".no-print{display:none!important} body{padding:16px!important}",
    });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: false,
      margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
