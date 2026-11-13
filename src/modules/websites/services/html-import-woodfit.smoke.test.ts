import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { planHtmlImport } from "./html-import.service.js";

const WOODFIT_DIR = "/home/udith/Downloads/Woodfit Furnita Website";

test("Woodfit SPA (untagged, JS-built grids) imports with full fidelity", { timeout: 90_000 }, async (t) => {
  if (!fs.existsSync(path.join(WOODFIT_DIR, "index.html"))) {
    t.skip("Woodfit sample not present on this machine");
    return;
  }
  const files = new Map<string, Buffer>();
  for (const name of fs.readdirSync(WOODFIT_DIR)) files.set(name.toLowerCase(), fs.readFileSync(path.join(WOODFIT_DIR, name)));

  const plan = await planHtmlImport({
    files,
    htmlPaths: ["index.html"],
    siteName: "Woodfit Furnita",
    upload: async (needed) => new Map([...needed].map((key) => [key, `/api/media/files/${key}`])),
  });

  assert.deepEqual(
    plan.pages.map((p) => p.slug),
    ["/", "/products", "/furniture", "/about", "/contact"],
  );
  type Data = { html: string; css?: string; chrome?: string };
  const home = plan.pages[0]!.sections.map((s) => s.data as Data);
  assert.match((plan.header.imported as Data).html, /href="\/products"/, "SPA hash links become page paths");
  assert.ok(plan.footer.imported);
  assert.deepEqual(plan.theme, {
    colors: { primary: "#2a3a98", secondary: "#f4d21f", background: "#ffffff", surface: "#f4f6fb", text: "#1a1f36", muted: "#5b6275" },
    fonts: { heading: "poppins", body: "nunito" },
    radius: "lg",
  });

  const homeHtml = home.map((d) => d.html).join("");
  if (process.env.HTML_IMPORT_PRERENDER !== "false") {
    // Product + furniture cards only exist after the page script runs.
    assert.match(homeHtml, /Waterproof Plywood/);
    assert.match(homeHtml, /Sofas &amp; Seating/);
  }
  for (const data of home) {
    assert.match(data.css ?? "", /--blue:#2A3A98/, "theme variables reach every block");
    assert.ok((data.css ?? "").length < 12_000, "each block carries only the CSS it uses");
  }
});
