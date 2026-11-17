import { openBrowser } from "../../../common/browser.js";

/** Renders HTML to a PDF buffer, in the Chromium service when configured (see openBrowser). */
export async function htmlToPdf(html: string): Promise<Buffer> {
  const browser = await openBrowser(["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]);

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
