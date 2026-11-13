import assert from "node:assert/strict";
import { test } from "node:test";
import { planHtmlImport } from "./html-import.service.js";

type Data = {
  title?: string;
  html: string;
  css?: string;
  scope?: string;
  chrome?: string;
  texts?: { id: string; value: string }[];
  mediaSlots?: { url: string }[];
};

function pkg(files: Record<string, string>) {
  return {
    files: new Map(Object.entries(files).map(([name, body]) => [name, Buffer.from(body)])),
    htmlPaths: Object.keys(files).filter((name) => name.endsWith(".html")),
  };
}

const upload = async (needed: Set<string>) => new Map([...needed].map((key) => [key, `/api/media/files/${key}`]));

test("untagged SPA: views become pages, chrome is kept, links and CSS are rewritten", async () => {
  const { files, htmlPaths } = pkg({
    "index.html": `<!doctype html><html><head><title>Shop</title>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins">
      <style>
        :root{--blue:#123}
        body{margin:0;overflow-x:hidden;color:var(--blue)}
        body::before{content:"";position:fixed}
        .hero h1{font-size:40px} .hero h1 span{color:gold}
        .unused{color:red}
        .btn{border:2px solid transparent} .btn-line{border-color:var(--blue)}
        @media (max-width:600px){.hero h1{font-size:20px}}
        @keyframes fade{from{opacity:0}to{opacity:1}}
        .hero{animation:fade 1s;background:url(img/bg.jpg)}
        footer{padding:20px}
      </style></head><body>
      <header><a href="#home">Home</a><a href="#about">About</a></header>
      <main>
        <div class="view" data-view="home">
          <section class="hero"><h1>Hello <span>world</span></h1><img src="img/a.png" alt="A"></section>
          <section class="cta"><a class="btn btn-line" href="#about">Learn more</a></section>
        </div>
        <div class="view" data-view="about" hidden><section><h2>About us</h2></section></div>
      </main>
      <footer><p>© Shop</p></footer>
      <script>document.querySelector('.cta').insertAdjacentHTML('beforeend','<p>from js</p>')</script>
    </body></html>`,
  });

  const plan = await planHtmlImport({ files, htmlPaths, siteName: "Shop", upload, prerender: false });

  assert.deepEqual(plan.pages.map((p) => [p.name, p.slug]), [["Home", "/"], ["About", "/about"]]);
  assert.equal(plan.header.hidden, true, "builder header is hidden when the original header is imported");

  const home = plan.pages[0]!.sections.map((s) => s.data as Data);
  assert.deepEqual(home.map((d) => d.chrome ?? "content"), ["header", "content", "content", "footer"]);

  const header = home[0]!;
  assert.match(header.html, /href="\/"/);
  assert.match(header.html, /href="\/about"/);

  const hero = home[1]!;
  assert.match(hero.scope!, /^wbi-[a-z0-9]+$/);
  assert.notEqual(hero.scope, home[2]!.scope, "each block has its own scope");
  assert.match(hero.html, /src="\/api\/media\/files\/img\/a\.png"/);
  // Variables survive (:root → scope) and body box props are not repeated per block.
  assert.match(hero.css!, new RegExp(`\\.wb-site \\.${hero.scope}\\{--blue:#123\\}`));
  assert.doesNotMatch(hero.css!, /overflow-x|::before/);
  // Only rules used by the block are kept.
  assert.match(hero.css!, /\.hero h1 span\{color:gold\}/);
  assert.doesNotMatch(hero.css!, /\.unused|\.btn-line|footer/);
  // Breakpoints follow the builder frame; keyframes are prefixed; url() is uploaded.
  assert.match(hero.css!, /@container wb-site \(max-width:600px\)/);
  assert.match(hero.css!, /@keyframes wbi-[a-z0-9]+-fade/);
  assert.match(hero.css!, /animation:wbi-[a-z0-9]+-fade 1s/);
  assert.match(hero.css!, /url\("\/api\/media\/files\/img\/bg\.jpg"\)/);
  assert.match(hero.css!, /^@import url\("https:\/\/fonts\.googleapis\.com/);

  // Text is editable per element while inner markup (<span>) is kept.
  assert.ok(hero.texts!.some((t) => t.value === "Hello"));
  assert.ok(hero.texts!.some((t) => t.value === "world"));
  assert.match(hero.html, /<h1 data-wb-text-id="t\d+">Hello <span data-wb-text-id="t\d+">world<\/span><\/h1>/);
  assert.equal(hero.mediaSlots?.[0]?.url, "/api/media/files/img/a.png");

  const cta = home[2]!;
  assert.match(cta.html, /href="\/about"/);
  assert.match(cta.css!, /\.btn\{[^}]*\}\s*\.wb-site \.wbi-[a-z0-9]+ \.btn-line\{/);
  assert.doesNotMatch(cta.html, /<script/);
});

test("data-wb-section marks control the split and names", async () => {
  const { files, htmlPaths } = pkg({
    "index.html": `<html><body><main>
      <div data-wb-section="hero" data-wb-component="Hero Banner"><h1>Hi</h1></div>
      <div><div data-wb-section data-wb-component="CTA Band"><h2>Ready?</h2></div></div>
    </main></body></html>`,
  });
  const plan = await planHtmlImport({ files, htmlPaths, siteName: "S", upload, prerender: false });
  assert.deepEqual(
    plan.components.map((c) => c.name),
    ["Hero Banner", "CTA Band"],
  );
});

test("multi-file ZIP: html links map to page slugs", async () => {
  const { files, htmlPaths } = pkg({
    "index.html": `<html><body><header><a href="about.html">About</a></header><main><section><h1>Home</h1></section></main></body></html>`,
    "about.html": `<html><body><header><a href="index.html">Home</a></header><main><section><h1>About</h1><a href="./index.html#top">top</a></section></main></body></html>`,
  });
  const plan = await planHtmlImport({ files, htmlPaths, siteName: "S", upload, prerender: false });
  assert.deepEqual(plan.pages.map((p) => p.slug), ["/", "/about"]);
  const aboutBody = plan.pages[1]!.sections.map((s) => (s.data as Data).html).join("");
  assert.match(aboutBody, /href="\/#top"/);
  assert.match((plan.pages[0]!.sections[0]!.data as Data).html, /href="\/about"/);
});

test("page JavaScript runs before import (headless Chrome, network blocked)", { timeout: 60_000 }, async (t) => {
  if (process.env.HTML_IMPORT_PRERENDER === "false") return t.skip("prerender disabled");
  const { files, htmlPaths } = pkg({
    "index.html": `<html><body><main><section><h2>Products</h2><div id="grid"></div></section></main>
      <script src="app.js"></script>
      <script>fetch("http://169.254.169.254/latest/meta-data").then(() => { document.body.dataset.leak = "1"; }).catch(() => {});</script>
    </body></html>`,
    "app.js": `document.getElementById("grid").innerHTML = ["Plywood", "Multiwood"].map((n) => "<article><h3>" + n + "</h3></article>").join("");`,
  });
  const plan = await planHtmlImport({ files, htmlPaths, siteName: "S", upload });
  const html = plan.pages[0]!.sections.map((s) => (s.data as Data).html).join("");
  assert.match(html, /<h3[^>]*>Plywood<\/h3>/);
  assert.match(html, /<h3[^>]*>Multiwood<\/h3>/);
});
