import { env } from "../../../config/env.js";
import type { ThemeSettings } from "../../../modules/websites/types/site-content.types.js";
import type { TemplateFooter, TemplateHeader, TemplatePage } from "../../../modules/websites/types/template.types.js";
import type { ThemeSeed } from "../themes.js";
import type { WebsiteTemplateSeed } from "../templates.js";

/**
 * "ARA Shops": the client's own HTML design imported with "Keep the exact look".
 * Its photos are served by the frontend from /template-assets/ara-shops (website-builder-fe public folder).
 */
export const ARA_SHOPS_EXACT_THEME: ThemeSeed = {
  name: "ARA Shops",
  settings: {
    "fonts": {
      "body": "plus-jakarta-sans",
      "heading": "plex-sans"
    },
    "colors": {
      "text": "#1c1c1a",
      "muted": "#5f5a50",
      "primary": "#1f4d3a",
      "surface": "#e3ede6",
      "secondary": "#eae2d3",
      "background": "#fbf7ef"
    },
    "radius": "lg",
    "cardStyle": "border",
    "buttonStyle": "filled",
    "containerWidth": 1200,
    "sectionSpacing": "normal"
  } as ThemeSettings,
};

const ASSETS = `${env.FRONTEND_URL}/template-assets/ara-shops`;

/** Imported header, footer and pages; {{ARA_ASSETS}} marks where each photo lives. */
const DATA = {
  "header": {
    "logo": {
      "alt": "ARA Shops",
      "url": "{{ARA_ASSETS}}/ara-logo.png"
    },
    "design": "logo-left",
    "hidden": false,
    "sticky": true,
    "imported": {
      "css": "@import url(\"https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap\");\n.wb-site .wbi-a735d833cbc2{--bg:#FBF7EF;--card:#FFFFFF;--line:#EAE2D3;--line-2:#D9CFBD;--ink:#1C1C1A;--ink-2:#3F3B34;--muted:#5F5A50;--off:#6E685D;--green:#1F4D3A;--green-2:#2C6550;--green-soft:#E3EDE6;--green-ink:#CFE3D6;--chip:#F1ECE2;--veg:#2E7D32;--nonveg:#8B2E1A;--radius:16px;--wrap:1240px}\n.wb-site .wbi-a735d833cbc2 *{box-sizing:border-box;min-width:0}\n.wb-site .wbi-a735d833cbc2{-webkit-text-size-adjust:100%}\n.wb-site .wbi-a735d833cbc2{background:var(--bg);color:var(--ink);font:15px/1.5 'Plus Jakarta Sans',system-ui,sans-serif}\n.wb-site .wbi-a735d833cbc2 a{color:var(--green);text-decoration:none}\n.wb-site .wbi-a735d833cbc2 a:hover{color:#163a2b}\n.wb-site .wbi-a735d833cbc2 img{display:block;max-width:100%}\n.wb-site .wbi-a735d833cbc2 button{font:inherit;color:inherit}\n.wb-site .wbi-a735d833cbc2 :focus-visible{outline:3px solid #8FB8A0;outline-offset:2px;border-radius:6px}\n.wb-site .wbi-a735d833cbc2 .wrap{max-width:var(--wrap);margin:0 auto;padding-inline:16px}\n.wb-site .wbi-a735d833cbc2 .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}\n.wb-site .wbi-a735d833cbc2 .site-header{background:var(--card);border-bottom:1px solid var(--line);z-index:20}\n@container wb-site (min-width:960px){.wb-site .wbi-a735d833cbc2 .site-header{position:sticky;top:0}}\n.wb-site .wbi-a735d833cbc2 .hdr{display:grid;grid-template-columns:1fr auto;grid-template-areas:\"loc cart\" \"logo logo\" \"search search\";gap:10px 12px;padding-top:12px;padding-bottom:12px;align-items:center}\n.wb-site .wbi-a735d833cbc2 .logo{grid-area:logo;display:flex;align-items:center;min-height:40px}\n.wb-site .wbi-a735d833cbc2 .logo img{height:30px;width:auto}\n.wb-site .wbi-a735d833cbc2 .loc{grid-area:loc;all:unset;cursor:pointer;display:flex;flex-direction:column;min-height:44px;justify-content:center}\n.wb-site .wbi-a735d833cbc2 .loc small{font-size:12px;color:var(--muted)}\n.wb-site .wbi-a735d833cbc2 .loc strong{font-size:15px;display:flex;align-items:center;gap:6px}\n.wb-site .wbi-a735d833cbc2 .search{grid-area:search;display:flex;align-items:center;gap:10px;height:48px;padding:0 14px;background:var(--bg);border:1px solid var(--line);border-radius:12px}\n.wb-site .wbi-a735d833cbc2 .search input{all:unset;flex:1;font-size:16px}\n.wb-site .wbi-a735d833cbc2 .search input::placeholder{color:var(--off)}\n.wb-site .wbi-a735d833cbc2 .account{display:none}\n.wb-site .wbi-a735d833cbc2 .cart-btn{grid-area:cart;position:relative;display:flex;align-items:center;justify-content:center;gap:10px;height:44px;min-width:44px;border-radius:22px;border:1px solid var(--line);background:var(--card);color:var(--ink);font-weight:700;font-size:14px}\n.wb-site .wbi-a735d833cbc2 .cart-btn .label{display:none}\n.wb-site .wbi-a735d833cbc2 .badge{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;border-radius:9px;background:var(--green);color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 4px}\n.wb-site .wbi-a735d833cbc2 .dept-nav{display:flex;gap:8px 20px;overflow-x:auto;padding-bottom:12px;font-size:14px;font-weight:600;scrollbar-width:none;white-space:nowrap}\n.wb-site .wbi-a735d833cbc2 .dept-nav::-webkit-scrollbar{display:none}\n.wb-site .wbi-a735d833cbc2 .dept-nav>*{flex:none}\n.wb-site .wbi-a735d833cbc2 .dept-nav .grp{color:var(--muted);font-weight:500;margin-right:-10px}\n.wb-site .wbi-a735d833cbc2 .dept-nav .grp:not(:first-child){margin-left:12px}\n@container wb-site (min-width:600px){.wb-site .wbi-a735d833cbc2 .wrap{padding-inline:24px}}\n@container wb-site (min-width:960px){.wb-site .wbi-a735d833cbc2 .wrap{padding-inline:32px}\n.wb-site .wbi-a735d833cbc2 .hdr{grid-template-columns:auto auto 1fr auto auto;grid-template-areas:\"logo loc search account cart\";gap:16px 28px;padding-top:14px;padding-bottom:14px}\n.wb-site .wbi-a735d833cbc2 .logo img{height:38px}\n.wb-site .wbi-a735d833cbc2 .loc strong{font-size:14px}\n.wb-site .wbi-a735d833cbc2 .account{grid-area:account;display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600;color:var(--ink);min-height:44px}\n.wb-site .wbi-a735d833cbc2 .cart-btn{background:var(--green);border-color:var(--green);color:#fff;border-radius:12px;height:48px;padding:0 18px}\n.wb-site .wbi-a735d833cbc2 .cart-btn .label{display:inline}\n.wb-site .wbi-a735d833cbc2 .cart-btn .badge{display:none}\n.wb-site .wbi-a735d833cbc2 .cart-btn svg{stroke:#fff}}",
      "html": "<header class=\"site-header\">\n  <div class=\"wrap hdr\">\n    <a class=\"logo\" href=\"/\"><img src=\"{{ARA_ASSETS}}/ara-logo.png\" alt=\"ARA Shops\" data-wb-media-key=\"m0\"></a>\n    <button class=\"loc\" type=\"button\">\n      <small data-wb-text-id=\"t0\">Deliver to</small>\n      <strong data-wb-text-id=\"t1\"><svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1F4D3A\" stroke-width=\"2.2\" aria-hidden=\"true\"><path d=\"M12 22s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z\"></path><circle cx=\"12\" cy=\"10\" r=\"2.5\"></circle></svg>Indiranagar, Bengaluru<svg width=\"12\" height=\"12\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.6\" aria-hidden=\"true\"><path d=\"m6 9 6 6 6-6\"></path></svg></strong>\n    </button>\n    <form class=\"search\" role=\"search\" data-wb-imported-form=\"\" data-wb-form-index=\"0\">\n      <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#5F5A50\" stroke-width=\"2.2\" aria-hidden=\"true\"><circle cx=\"11\" cy=\"11\" r=\"7\"></circle><path d=\"m20 20-3.5-3.5\"></path></svg>\n      <label class=\"sr\" for=\"q\" data-wb-text-id=\"t2\">Search</label>\n      <input id=\"q\" type=\"search\" placeholder=\"Search chicken, mutton, biryani…\" name=\"search\">\n    <input type=\"text\" name=\"_wb_hp\" tabindex=\"-1\" autocomplete=\"off\" aria-hidden=\"true\" style=\"position:absolute;left:-10000px;width:1px;height:1px;opacity:0\"></form>\n    <a class=\"account\" href=\"#\" data-wb-text-id=\"t3\"><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"8\" r=\"4\"></circle><path d=\"M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6\"></path></svg>Account</a>\n    <a class=\"cart-btn\" href=\"/cart\" aria-label=\"Cart: 6 items, ₹1,584\">\n      <svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1C1C1A\" stroke-width=\"2\" aria-hidden=\"true\"><path d=\"M5 7h14l-1.5 12h-11z\"></path><path d=\"M9 7a3 3 0 0 1 6 0\"></path></svg>\n      <span class=\"label\" data-wb-text-id=\"t4\">6 items · ₹1,584</span><span class=\"badge\" data-wb-text-id=\"t5\">6</span>\n    </a>\n  </div>\n  <nav class=\"wrap dept-nav\" aria-label=\"Departments\">\n    <span class=\"grp\" data-wb-text-id=\"t6\">Fresh meat:</span><a href=\"/chicken\" data-wb-text-id=\"t7\">Chicken</a><a href=\"#\" data-wb-text-id=\"t8\">Mutton</a><a href=\"#\" data-wb-text-id=\"t9\">Beef</a>\n    <span class=\"grp\" data-wb-text-id=\"t10\">Ready to eat:</span><a href=\"/ready-to-eat#breakfast\" data-wb-text-id=\"t11\">Breakfast</a><a href=\"/ready-to-eat#meals\" data-wb-text-id=\"t12\">Meals</a><a href=\"/ready-to-eat#biryani\" data-wb-text-id=\"t13\">Biryani</a>\n  </nav>\n</header>",
      "scope": "wbi-a735d833cbc2",
      "texts": [
        {
          "id": "t0",
          "label": "Small text",
          "value": "Deliver to"
        },
        {
          "id": "t1",
          "label": "Bold text",
          "value": "Indiranagar, Bengaluru"
        },
        {
          "id": "t2",
          "label": "Label",
          "value": "Search"
        },
        {
          "id": "t3",
          "label": "Link",
          "value": "Account"
        },
        {
          "id": "t4",
          "label": "Text",
          "value": "6 items · ₹1,584"
        },
        {
          "id": "t5",
          "label": "Text",
          "value": "6"
        },
        {
          "id": "t6",
          "label": "Text",
          "value": "Fresh meat:"
        },
        {
          "id": "t7",
          "label": "Link",
          "value": "Chicken"
        },
        {
          "id": "t8",
          "label": "Link",
          "value": "Mutton"
        },
        {
          "id": "t9",
          "label": "Link",
          "value": "Beef"
        },
        {
          "id": "t10",
          "label": "Text",
          "value": "Ready to eat:"
        },
        {
          "id": "t11",
          "label": "Link",
          "value": "Breakfast"
        },
        {
          "id": "t12",
          "label": "Link",
          "value": "Meals"
        },
        {
          "id": "t13",
          "label": "Link",
          "value": "Biryani"
        }
      ],
      "title": "Site header",
      "mediaSlots": [
        {
          "alt": "ARA Shops",
          "key": "m0",
          "url": "{{ARA_ASSETS}}/ara-logo.png",
          "kind": "image"
        }
      ]
    }
  },
  "footer": {
    "design": "simple",
    "hidden": false,
    "social": [],
    "columns": [],
    "imported": {
      "css": "@import url(\"https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap\");\n.wb-site .wbi-a735d8dcf4ac{--bg:#FBF7EF;--card:#FFFFFF;--line:#EAE2D3;--line-2:#D9CFBD;--ink:#1C1C1A;--ink-2:#3F3B34;--muted:#5F5A50;--off:#6E685D;--green:#1F4D3A;--green-2:#2C6550;--green-soft:#E3EDE6;--green-ink:#CFE3D6;--chip:#F1ECE2;--veg:#2E7D32;--nonveg:#8B2E1A;--radius:16px;--wrap:1240px}\n.wb-site .wbi-a735d8dcf4ac *{box-sizing:border-box;min-width:0}\n.wb-site .wbi-a735d8dcf4ac{-webkit-text-size-adjust:100%}\n.wb-site .wbi-a735d8dcf4ac{background:var(--bg);color:var(--ink);font:15px/1.5 'Plus Jakarta Sans',system-ui,sans-serif}\n.wb-site .wbi-a735d8dcf4ac a{color:var(--green);text-decoration:none}\n.wb-site .wbi-a735d8dcf4ac a:hover{color:#163a2b}\n.wb-site .wbi-a735d8dcf4ac img{display:block;max-width:100%}\n.wb-site .wbi-a735d8dcf4ac :focus-visible{outline:3px solid #8FB8A0;outline-offset:2px;border-radius:6px}\n.wb-site .wbi-a735d8dcf4ac .wrap{max-width:var(--wrap);margin:0 auto;padding-inline:16px}\n.wb-site .wbi-a735d8dcf4ac .tabbar{position:fixed;left:0;right:0;bottom:0;z-index:30;display:flex;justify-content:space-around;background:var(--card);border-top:1px solid var(--line);padding:8px 4px calc(10px + env(safe-area-inset-bottom))}\n.wb-site .wbi-a735d8dcf4ac .tabbar a{display:flex;flex-direction:column;align-items:center;gap:3px;min-width:64px;min-height:44px;font-size:11px;font-weight:500;color:var(--muted)}\n.wb-site .wbi-a735d8dcf4ac .tabbar a[aria-current]{color:var(--green);font-weight:700}\n.wb-site .wbi-a735d8dcf4ac .site-footer{border-top:1px solid var(--line);background:var(--card)}\n.wb-site .wbi-a735d8dcf4ac .site-footer .wrap{padding-top:20px;padding-bottom:20px;display:flex;flex-wrap:wrap;align-items:center;gap:10px 28px;font-size:13px;color:var(--muted)}\n.wb-site .wbi-a735d8dcf4ac .site-footer img{height:24px;width:auto}\n.wb-site .wbi-a735d8dcf4ac .site-footer a{color:var(--muted)}\n@container wb-site (min-width:600px){.wb-site .wbi-a735d8dcf4ac .wrap{padding-inline:24px}}\n@container wb-site (min-width:960px){.wb-site .wbi-a735d8dcf4ac .wrap{padding-inline:32px}\n.wb-site .wbi-a735d8dcf4ac .tabbar{display:none}}",
      "html": "<footer class=\"site-footer\">\n  <div class=\"wrap\">\n    <img src=\"{{ARA_ASSETS}}/ara-logo.png\" alt=\"ARA Shops\" data-wb-media-key=\"m0\">\n    <span data-wb-text-id=\"t0\">Deliveries at 8:00 AM, 1:00 PM and 7:00 PM</span>\n    <a href=\"#\" data-wb-text-id=\"t1\">Help</a><a href=\"#\" data-wb-text-id=\"t2\">Terms</a><a href=\"#\" data-wb-text-id=\"t3\">Privacy</a>\n  </div>\n</footer>\n<nav class=\"tabbar\" aria-label=\"Main\">\n  <a href=\"/\" aria-current=\"page\" data-wb-text-id=\"t4\"><svg width=\"22\" height=\"22\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" aria-hidden=\"true\"><path d=\"M3 11 12 4l9 7v9h-6v-6H9v6H3z\"></path></svg>Home</a>\n  <a href=\"/chicken\" data-wb-text-id=\"t5\"><svg width=\"22\" height=\"22\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" aria-hidden=\"true\"><rect x=\"4\" y=\"4\" width=\"7\" height=\"7\" rx=\"1.5\"></rect><rect x=\"13\" y=\"4\" width=\"7\" height=\"7\" rx=\"1.5\"></rect><rect x=\"4\" y=\"13\" width=\"7\" height=\"7\" rx=\"1.5\"></rect><rect x=\"13\" y=\"13\" width=\"7\" height=\"7\" rx=\"1.5\"></rect></svg>Categories</a>\n  <a href=\"#\" data-wb-text-id=\"t6\"><svg width=\"22\" height=\"22\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" aria-hidden=\"true\"><path d=\"M6 3h12v18l-3-2-3 2-3-2-3 2z\"></path><path d=\"M9 8h6M9 12h6\"></path></svg>Orders</a>\n  <a href=\"#\" data-wb-text-id=\"t7\"><svg width=\"22\" height=\"22\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"8\" r=\"4\"></circle><path d=\"M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6\"></path></svg>Account</a>\n</nav>",
      "scope": "wbi-a735d8dcf4ac",
      "texts": [
        {
          "id": "t0",
          "label": "Text",
          "value": "Deliveries at 8:00 AM, 1:00 PM and 7:00 PM"
        },
        {
          "id": "t1",
          "label": "Link",
          "value": "Help"
        },
        {
          "id": "t2",
          "label": "Link",
          "value": "Terms"
        },
        {
          "id": "t3",
          "label": "Link",
          "value": "Privacy"
        },
        {
          "id": "t4",
          "label": "Link",
          "value": "Home"
        },
        {
          "id": "t5",
          "label": "Link",
          "value": "Categories"
        },
        {
          "id": "t6",
          "label": "Link",
          "value": "Orders"
        },
        {
          "id": "t7",
          "label": "Link",
          "value": "Account"
        }
      ],
      "title": "Site footer",
      "mediaSlots": [
        {
          "alt": "ARA Shops",
          "key": "m0",
          "url": "{{ARA_ASSETS}}/ara-logo.png",
          "kind": "image"
        }
      ]
    }
  },
  "pages": [
    {
      "name": "Home",
      "slug": "/",
      "pageType": "HOME",
      "sections": [
        {
          "data": {
            "css": "@import url(\"https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap\");\n.wb-site .wbi-a735d85bd547{--bg:#FBF7EF;--card:#FFFFFF;--line:#EAE2D3;--line-2:#D9CFBD;--ink:#1C1C1A;--ink-2:#3F3B34;--muted:#5F5A50;--off:#6E685D;--green:#1F4D3A;--green-2:#2C6550;--green-soft:#E3EDE6;--green-ink:#CFE3D6;--chip:#F1ECE2;--veg:#2E7D32;--nonveg:#8B2E1A;--radius:16px;--wrap:1240px}\n.wb-site .wbi-a735d85bd547 *{box-sizing:border-box;min-width:0}\n.wb-site .wbi-a735d85bd547{-webkit-text-size-adjust:100%}\n.wb-site .wbi-a735d85bd547{background:var(--bg);color:var(--ink);font:15px/1.5 'Plus Jakarta Sans',system-ui,sans-serif}\n.wb-site .wbi-a735d85bd547 h1{margin:0;line-height:1.2}\n.wb-site .wbi-a735d85bd547 :focus-visible{outline:3px solid #8FB8A0;outline-offset:2px;border-radius:6px}\n.wb-site .wbi-a735d85bd547 .wrap{max-width:var(--wrap);margin:0 auto;padding-inline:16px}\n.wb-site .wbi-a735d85bd547 main{padding-top:20px;padding-bottom:40px;display:flex;flex-direction:column;gap:28px}\n.wb-site .wbi-a735d85bd547 .hero{background:var(--green);color:#fff;border-radius:20px;padding:20px;display:flex;flex-direction:column;gap:16px}\n.wb-site .wbi-a735d85bd547 .hero .eyebrow{font-size:12px;font-weight:600;color:var(--green-ink)}\n.wb-site .wbi-a735d85bd547 .hero h1{font-size:28px;font-weight:700;line-height:1.1}\n.wb-site .wbi-a735d85bd547 .hero p{margin:0;color:var(--green-soft);font-size:14px;max-width:460px}\n.wb-site .wbi-a735d85bd547 .slots-mini{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}\n.wb-site .wbi-a735d85bd547 .slots-mini div{background:var(--green-2);border-radius:12px;padding:10px;display:flex;flex-direction:column;gap:2px}\n.wb-site .wbi-a735d85bd547 .slots-mini b{font-size:16px}\n.wb-site .wbi-a735d85bd547 .slots-mini span{font-size:12px;color:var(--green-soft)}\n.wb-site .wbi-a735d85bd547 .slots-mini .past b, .wb-site .wbi-a735d85bd547 .slots-mini .past span{color:#BFD6C7}\n.wb-site .wbi-a735d85bd547 .slots-mini .past b{text-decoration:line-through}\n.wb-site .wbi-a735d85bd547 .slots-mini .next{background:var(--bg);color:var(--green)}\n.wb-site .wbi-a735d85bd547 .slots-mini .next span{color:var(--green);font-weight:600}\n@container wb-site (min-width:600px){.wb-site .wbi-a735d85bd547 .wrap{padding-inline:24px}\n.wb-site .wbi-a735d85bd547 .hero{padding:28px}\n.wb-site .wbi-a735d85bd547 .hero h1{font-size:36px}}\n@container wb-site (min-width:960px){.wb-site .wbi-a735d85bd547 .wrap{padding-inline:32px}\n.wb-site .wbi-a735d85bd547 main{padding-top:28px;padding-bottom:56px;gap:40px}\n.wb-site .wbi-a735d85bd547 .hero{flex-direction:row;align-items:center;gap:32px;padding:36px 40px;border-radius:24px}\n.wb-site .wbi-a735d85bd547 .hero>div:first-child{flex:1}\n.wb-site .wbi-a735d85bd547 .hero h1{font-size:44px}\n.wb-site .wbi-a735d85bd547 .hero p{font-size:16px}\n.wb-site .wbi-a735d85bd547 .slots-mini{flex:1;gap:12px}\n.wb-site .wbi-a735d85bd547 .slots-mini div{padding:18px;border-radius:16px}\n.wb-site .wbi-a735d85bd547 .slots-mini b{font-size:22px}\n.wb-site .wbi-a735d85bd547 .slots-mini span{font-size:13px}}",
            "html": "<div data-wb-import-spacing=\"\" style=\"padding-top:28px;padding-bottom:0px\"><main class=\"wrap\" style=\"margin-top:0;margin-bottom:0;padding-top:0;padding-bottom:0;min-height:0;height:auto\" data-wb-import-ancestor=\"\"><section class=\"hero\" aria-labelledby=\"next\">\n    <div>\n      <span class=\"eyebrow\" data-wb-text-id=\"t0\">NEXT DELIVERY</span>\n      <h1 id=\"next\" data-wb-text-id=\"t1\">Today, 1:00 PM</h1>\n      <p data-wb-text-id=\"t2\">Fresh meat and hot food in one cart, one delivery. We deliver three times a day.</p>\n    </div>\n    <div class=\"slots-mini\">\n      <div class=\"past\"><b data-wb-text-id=\"t3\">8:00 AM</b><span data-wb-text-id=\"t4\">Unavailable</span></div>\n      <div class=\"next\"><b data-wb-text-id=\"t5\">1:00 PM</b><span data-wb-text-id=\"t6\">Next available</span></div>\n      <div><b data-wb-text-id=\"t7\">7:00 PM</b><span data-wb-text-id=\"t8\">Available</span></div>\n    </div>\n  </section></main></div>",
            "scope": "wbi-a735d85bd547",
            "texts": [
              {
                "id": "t0",
                "label": "Text",
                "value": "NEXT DELIVERY"
              },
              {
                "id": "t1",
                "label": "Heading",
                "value": "Today, 1:00 PM"
              },
              {
                "id": "t2",
                "label": "Paragraph",
                "value": "Fresh meat and hot food in one cart, one delivery. We deliver three times a day."
              },
              {
                "id": "t3",
                "label": "Bold text",
                "value": "8:00 AM"
              },
              {
                "id": "t4",
                "label": "Text",
                "value": "Unavailable"
              },
              {
                "id": "t5",
                "label": "Bold text",
                "value": "1:00 PM"
              },
              {
                "id": "t6",
                "label": "Text",
                "value": "Next available"
              },
              {
                "id": "t7",
                "label": "Bold text",
                "value": "7:00 PM"
              },
              {
                "id": "t8",
                "label": "Text",
                "value": "Available"
              }
            ],
            "title": "Today, 1:00 PM",
            "mediaSlots": []
          },
          "type": "imported_html",
          "hidden": false,
          "settings": {
            "background": "default",
            "hideOnMobile": false
          }
        },
        {
          "data": {
            "css": "@import url(\"https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap\");\n.wb-site .wbi-a735d80459aa{--bg:#FBF7EF;--card:#FFFFFF;--line:#EAE2D3;--line-2:#D9CFBD;--ink:#1C1C1A;--ink-2:#3F3B34;--muted:#5F5A50;--off:#6E685D;--green:#1F4D3A;--green-2:#2C6550;--green-soft:#E3EDE6;--green-ink:#CFE3D6;--chip:#F1ECE2;--veg:#2E7D32;--nonveg:#8B2E1A;--radius:16px;--wrap:1240px}\n.wb-site .wbi-a735d80459aa *{box-sizing:border-box;min-width:0}\n.wb-site .wbi-a735d80459aa{-webkit-text-size-adjust:100%}\n.wb-site .wbi-a735d80459aa{background:var(--bg);color:var(--ink);font:15px/1.5 'Plus Jakarta Sans',system-ui,sans-serif}\n.wb-site .wbi-a735d80459aa a{color:var(--green);text-decoration:none}\n.wb-site .wbi-a735d80459aa a:hover{color:#163a2b}\n.wb-site .wbi-a735d80459aa img{display:block;max-width:100%}\n.wb-site .wbi-a735d80459aa h2{margin:0;line-height:1.2}\n.wb-site .wbi-a735d80459aa :focus-visible{outline:3px solid #8FB8A0;outline-offset:2px;border-radius:6px}\n.wb-site .wbi-a735d80459aa .wrap{max-width:var(--wrap);margin:0 auto;padding-inline:16px}\n.wb-site .wbi-a735d80459aa .nowrap{white-space:nowrap}\n.wb-site .wbi-a735d80459aa main{padding-top:20px;padding-bottom:40px;display:flex;flex-direction:column;gap:28px}\n.wb-site .wbi-a735d80459aa .sec{display:flex;flex-direction:column;gap:12px}\n.wb-site .wbi-a735d80459aa .sec-h{display:flex;align-items:baseline;justify-content:space-between;gap:12px}\n.wb-site .wbi-a735d80459aa .sec-h h2{font-size:19px;font-weight:700}\n.wb-site .wbi-a735d80459aa .sec-h a{font-size:14px;font-weight:600}\n.wb-site .wbi-a735d80459aa .cat-groups{display:grid;gap:24px}\n.wb-site .wbi-a735d80459aa .tiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}\n.wb-site .wbi-a735d80459aa .tile{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:8px 8px 12px;display:flex;flex-direction:column;gap:4px;color:var(--ink)}\n.wb-site .wbi-a735d80459aa .tile img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:10px;margin-bottom:4px}\n.wb-site .wbi-a735d80459aa .tile b{font-size:14px;padding-left:2px}\n.wb-site .wbi-a735d80459aa .tile small{font-size:11px;font-weight:600;color:var(--green);padding-left:2px}\n@container wb-site (min-width:600px){.wb-site .wbi-a735d80459aa .wrap{padding-inline:24px}\n.wb-site .wbi-a735d80459aa .cat-groups{grid-template-columns:1fr 1fr}}\n@container wb-site (min-width:960px){.wb-site .wbi-a735d80459aa .wrap{padding-inline:32px}\n.wb-site .wbi-a735d80459aa main{padding-top:28px;padding-bottom:56px;gap:40px}\n.wb-site .wbi-a735d80459aa .cat-groups{gap:32px}\n.wb-site .wbi-a735d80459aa .tiles{gap:14px}\n.wb-site .wbi-a735d80459aa .tile b{font-size:16px}\n.wb-site .wbi-a735d80459aa .tile small{font-size:12px}}\n@media (prefers-reduced-motion:no-preference){.wb-site .wbi-a735d80459aa .tile{transition:transform .15s ease,box-shadow .15s ease}\n.wb-site .wbi-a735d80459aa .tile:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(60,45,25,.08)}}",
            "html": "<div data-wb-import-spacing=\"\" style=\"padding-top:40px;padding-bottom:0px\"><main class=\"wrap\" style=\"margin-top:0;margin-bottom:0;padding-top:0;padding-bottom:0;min-height:0;height:auto\" data-wb-import-ancestor=\"\"><div class=\"cat-groups\">\n    <section class=\"sec\">\n      <div class=\"sec-h\"><h2 data-wb-text-id=\"t0\">Fresh meat</h2><a href=\"/chicken\" data-wb-text-id=\"t1\">See all</a></div>\n      <div class=\"tiles\">\n        <a class=\"tile\" href=\"/chicken\"><img src=\"{{ARA_ASSETS}}/chicken-curry.png\" alt=\"\" data-wb-media-key=\"m0\"><b data-wb-text-id=\"t2\">Chicken</b></a>\n        <a class=\"tile\" href=\"#\"><img src=\"{{ARA_ASSETS}}/mutton-curry.png\" alt=\"\" data-wb-media-key=\"m1\"><b data-wb-text-id=\"t3\">Mutton</b></a>\n        <a class=\"tile\" href=\"#\"><img src=\"{{ARA_ASSETS}}/beef-steak.png\" alt=\"\" data-wb-media-key=\"m2\"><b data-wb-text-id=\"t4\">Beef</b></a>\n      </div>\n    </section>\n    <section class=\"sec\">\n      <div class=\"sec-h\"><h2 data-wb-text-id=\"t5\">Ready to eat</h2><a href=\"/ready-to-eat\" data-wb-text-id=\"t6\">See all</a></div>\n      <div class=\"tiles\">\n        <a class=\"tile\" href=\"/ready-to-eat#breakfast\"><img src=\"{{ARA_ASSETS}}/idli-vada.png\" alt=\"\" data-wb-media-key=\"m3\"><b data-wb-text-id=\"t7\">Breakfast</b><small data-wb-text-id=\"t8\">8:00 AM</small></a>\n        <a class=\"tile\" href=\"/ready-to-eat#meals\"><img src=\"{{ARA_ASSETS}}/veg-meals.png\" alt=\"\" data-wb-media-key=\"m4\"><b data-wb-text-id=\"t9\">Meals</b><small data-wb-text-id=\"t10\">1:00 PM</small></a>\n        <a class=\"tile\" href=\"/ready-to-eat#biryani\"><img src=\"{{ARA_ASSETS}}/chicken-biryani.png\" alt=\"\" data-wb-media-key=\"m5\"><b data-wb-text-id=\"t11\">Biryani</b><small class=\"nowrap\" data-wb-text-id=\"t12\">1 PM · 7 PM</small></a>\n      </div>\n    </section>\n  </div></main></div>",
            "scope": "wbi-a735d80459aa",
            "texts": [
              {
                "id": "t0",
                "label": "Heading",
                "value": "Fresh meat"
              },
              {
                "id": "t1",
                "label": "Link",
                "value": "See all"
              },
              {
                "id": "t2",
                "label": "Bold text",
                "value": "Chicken"
              },
              {
                "id": "t3",
                "label": "Bold text",
                "value": "Mutton"
              },
              {
                "id": "t4",
                "label": "Bold text",
                "value": "Beef"
              },
              {
                "id": "t5",
                "label": "Heading",
                "value": "Ready to eat"
              },
              {
                "id": "t6",
                "label": "Link",
                "value": "See all"
              },
              {
                "id": "t7",
                "label": "Bold text",
                "value": "Breakfast"
              },
              {
                "id": "t8",
                "label": "Small text",
                "value": "8:00 AM"
              },
              {
                "id": "t9",
                "label": "Bold text",
                "value": "Meals"
              },
              {
                "id": "t10",
                "label": "Small text",
                "value": "1:00 PM"
              },
              {
                "id": "t11",
                "label": "Bold text",
                "value": "Biryani"
              },
              {
                "id": "t12",
                "label": "Small text",
                "value": "1 PM · 7 PM"
              }
            ],
            "title": "Fresh meat",
            "mediaSlots": [
              {
                "key": "m0",
                "url": "{{ARA_ASSETS}}/chicken-curry.png",
                "kind": "image"
              },
              {
                "key": "m1",
                "url": "{{ARA_ASSETS}}/mutton-curry.png",
                "kind": "image"
              },
              {
                "key": "m2",
                "url": "{{ARA_ASSETS}}/beef-steak.png",
                "kind": "image"
              },
              {
                "key": "m3",
                "url": "{{ARA_ASSETS}}/idli-vada.png",
                "kind": "image"
              },
              {
                "key": "m4",
                "url": "{{ARA_ASSETS}}/veg-meals.png",
                "kind": "image"
              },
              {
                "key": "m5",
                "url": "{{ARA_ASSETS}}/chicken-biryani.png",
                "kind": "image"
              }
            ]
          },
          "type": "imported_html",
          "hidden": false,
          "settings": {
            "background": "default",
            "hideOnMobile": false
          }
        },
        {
          "data": {
            "css": "@import url(\"https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap\");\n.wb-site .wbi-a735d8d2db21{--bg:#FBF7EF;--card:#FFFFFF;--line:#EAE2D3;--line-2:#D9CFBD;--ink:#1C1C1A;--ink-2:#3F3B34;--muted:#5F5A50;--off:#6E685D;--green:#1F4D3A;--green-2:#2C6550;--green-soft:#E3EDE6;--green-ink:#CFE3D6;--chip:#F1ECE2;--veg:#2E7D32;--nonveg:#8B2E1A;--radius:16px;--wrap:1240px}\n.wb-site .wbi-a735d8d2db21 *{box-sizing:border-box;min-width:0}\n.wb-site .wbi-a735d8d2db21{-webkit-text-size-adjust:100%}\n.wb-site .wbi-a735d8d2db21{background:var(--bg);color:var(--ink);font:15px/1.5 'Plus Jakarta Sans',system-ui,sans-serif}\n.wb-site .wbi-a735d8d2db21 a{color:var(--green);text-decoration:none}\n.wb-site .wbi-a735d8d2db21 a:hover{color:#163a2b}\n.wb-site .wbi-a735d8d2db21 img{display:block;max-width:100%}\n.wb-site .wbi-a735d8d2db21 button{font:inherit;color:inherit}\n.wb-site .wbi-a735d8d2db21 h2{margin:0;line-height:1.2}\n.wb-site .wbi-a735d8d2db21 :focus-visible{outline:3px solid #8FB8A0;outline-offset:2px;border-radius:6px}\n.wb-site .wbi-a735d8d2db21 .wrap{max-width:var(--wrap);margin:0 auto;padding-inline:16px}\n.wb-site .wbi-a735d8d2db21 main{padding-top:20px;padding-bottom:40px;display:flex;flex-direction:column;gap:28px}\n.wb-site .wbi-a735d8d2db21 .sec{display:flex;flex-direction:column;gap:12px}\n.wb-site .wbi-a735d8d2db21 .sec-h{display:flex;align-items:baseline;justify-content:space-between;gap:12px}\n.wb-site .wbi-a735d8d2db21 .sec-h h2{font-size:19px;font-weight:700}\n.wb-site .wbi-a735d8d2db21 .sec-h a{font-size:14px;font-weight:600}\n.wb-site .wbi-a735d8d2db21 .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}\n.wb-site .wbi-a735d8d2db21 .card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);overflow:hidden;display:flex;flex-direction:column}\n.wb-site .wbi-a735d8d2db21 .card>img{width:100%;aspect-ratio:4/3;object-fit:cover}\n.wb-site .wbi-a735d8d2db21 .card .body{padding:10px 12px 12px;display:flex;flex-direction:column;gap:5px;flex:1}\n.wb-site .wbi-a735d8d2db21 .card .name{font-size:15px;font-weight:700;line-height:1.3;display:flex;gap:8px;align-items:flex-start}\n.wb-site .wbi-a735d8d2db21 .card .desc{font-size:12px;color:var(--muted)}\n.wb-site .wbi-a735d8d2db21 .card .foot{display:flex;align-items:flex-end;justify-content:space-between;gap:8px;margin-top:auto;padding-top:6px}\n.wb-site .wbi-a735d8d2db21 .card .price{font-size:17px;font-weight:700}\n.wb-site .wbi-a735d8d2db21 .tag{font-size:11px;font-weight:600;color:var(--green);background:var(--green-soft);align-self:flex-start;padding:3px 8px;border-radius:6px}\n.wb-site .wbi-a735d8d2db21 .btn-add{all:unset;cursor:pointer;box-sizing:border-box;height:38px;padding:0 18px;border-radius:10px;border:1.5px solid var(--green);color:var(--green);font-size:14px;font-weight:700;line-height:35px;text-align:center}\n.wb-site .wbi-a735d8d2db21 .btn-add:hover{background:var(--green-soft)}\n@container wb-site (min-width:600px){.wb-site .wbi-a735d8d2db21 .wrap{padding-inline:24px}\n.wb-site .wbi-a735d8d2db21 .grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}}\n@container wb-site (min-width:960px){.wb-site .wbi-a735d8d2db21 .wrap{padding-inline:32px}\n.wb-site .wbi-a735d8d2db21 main{padding-top:28px;padding-bottom:56px;gap:40px}\n.wb-site .wbi-a735d8d2db21 .grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}\n.wb-site .wbi-a735d8d2db21 .card .body{padding:14px 16px 16px}\n.wb-site .wbi-a735d8d2db21 .card .name{font-size:16px}\n.wb-site .wbi-a735d8d2db21 .card .price{font-size:18px}}\n@media (prefers-reduced-motion:no-preference){.wb-site .wbi-a735d8d2db21 .card{transition:transform .15s ease,box-shadow .15s ease}\n.wb-site .wbi-a735d8d2db21 .card:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(60,45,25,.08)}}",
            "html": "<div data-wb-import-spacing=\"\" style=\"padding-top:40px;padding-bottom:0px\"><main class=\"wrap\" style=\"margin-top:0;margin-bottom:0;padding-top:0;padding-bottom:0;min-height:0;height:auto\" data-wb-import-ancestor=\"\"><section class=\"sec\">\n    <div class=\"sec-h\"><h2 data-wb-text-id=\"t0\">Popular cuts</h2><a href=\"/chicken\" data-wb-text-id=\"t1\">See all</a></div>\n    <div class=\"grid\">\n      <article class=\"card\"><img src=\"{{ARA_ASSETS}}/chicken-curry.png\" alt=\"Chicken Curry Cut, packed tray\" data-wb-media-key=\"m0\">\n        <div class=\"body\"><span class=\"tag\" data-wb-text-id=\"t2\">Bone-in</span><span class=\"name\" data-wb-text-id=\"t3\">Chicken Curry Cut</span><span class=\"desc\" data-wb-text-id=\"t4\">500 g · 12–16 pieces</span>\n          <div class=\"foot\"><span class=\"price\" data-wb-text-id=\"t5\">₹189</span><button type=\"button\" class=\"btn-add\" data-wb-text-id=\"t6\">Add</button></div></div></article>\n      <article class=\"card\"><img src=\"{{ARA_ASSETS}}/chicken-boneless.png\" alt=\"Boneless Chicken, packed tray\" data-wb-media-key=\"m1\">\n        <div class=\"body\"><span class=\"tag\" data-wb-text-id=\"t7\">Boneless</span><span class=\"name\" data-wb-text-id=\"t8\">Boneless Chicken</span><span class=\"desc\" data-wb-text-id=\"t9\">500 g · bite-size</span>\n          <div class=\"foot\"><span class=\"price\" data-wb-text-id=\"t10\">₹259</span><button type=\"button\" class=\"btn-add\" data-wb-text-id=\"t11\">Add</button></div></div></article>\n      <article class=\"card\"><img src=\"{{ARA_ASSETS}}/mutton-curry.png\" alt=\"Mutton Curry Cut, packed tray\" data-wb-media-key=\"m2\">\n        <div class=\"body\"><span class=\"tag\" data-wb-text-id=\"t12\">Bone-in</span><span class=\"name\" data-wb-text-id=\"t13\">Mutton Curry Cut</span><span class=\"desc\" data-wb-text-id=\"t14\">500 g · 10–14 pieces</span>\n          <div class=\"foot\"><span class=\"price\" data-wb-text-id=\"t15\">₹449</span><button type=\"button\" class=\"btn-add\" data-wb-text-id=\"t16\">Add</button></div></div></article>\n      <article class=\"card\"><img src=\"{{ARA_ASSETS}}/mutton-keema.png\" alt=\"Mutton Keema, packed tray\" data-wb-media-key=\"m3\">\n        <div class=\"body\"><span class=\"tag\" data-wb-text-id=\"t17\">Minced</span><span class=\"name\" data-wb-text-id=\"t18\">Mutton Keema</span><span class=\"desc\" data-wb-text-id=\"t19\">500 g</span>\n          <div class=\"foot\"><span class=\"price\" data-wb-text-id=\"t20\">₹479</span><button type=\"button\" class=\"btn-add\" data-wb-text-id=\"t21\">Add</button></div></div></article>\n    </div>\n  </section></main></div>",
            "scope": "wbi-a735d8d2db21",
            "texts": [
              {
                "id": "t0",
                "label": "Heading",
                "value": "Popular cuts"
              },
              {
                "id": "t1",
                "label": "Link",
                "value": "See all"
              },
              {
                "id": "t2",
                "label": "Text",
                "value": "Bone-in"
              },
              {
                "id": "t3",
                "label": "Text",
                "value": "Chicken Curry Cut"
              },
              {
                "id": "t4",
                "label": "Text",
                "value": "500 g · 12–16 pieces"
              },
              {
                "id": "t5",
                "label": "Text",
                "value": "₹189"
              },
              {
                "id": "t6",
                "label": "Button",
                "value": "Add"
              },
              {
                "id": "t7",
                "label": "Text",
                "value": "Boneless"
              },
              {
                "id": "t8",
                "label": "Text",
                "value": "Boneless Chicken"
              },
              {
                "id": "t9",
                "label": "Text",
                "value": "500 g · bite-size"
              },
              {
                "id": "t10",
                "label": "Text",
                "value": "₹259"
              },
              {
                "id": "t11",
                "label": "Button",
                "value": "Add"
              },
              {
                "id": "t12",
                "label": "Text",
                "value": "Bone-in"
              },
              {
                "id": "t13",
                "label": "Text",
                "value": "Mutton Curry Cut"
              },
              {
                "id": "t14",
                "label": "Text",
                "value": "500 g · 10–14 pieces"
              },
              {
                "id": "t15",
                "label": "Text",
                "value": "₹449"
              },
              {
                "id": "t16",
                "label": "Button",
                "value": "Add"
              },
              {
                "id": "t17",
                "label": "Text",
                "value": "Minced"
              },
              {
                "id": "t18",
                "label": "Text",
                "value": "Mutton Keema"
              },
              {
                "id": "t19",
                "label": "Text",
                "value": "500 g"
              },
              {
                "id": "t20",
                "label": "Text",
                "value": "₹479"
              },
              {
                "id": "t21",
                "label": "Button",
                "value": "Add"
              }
            ],
            "title": "Popular cuts",
            "mediaSlots": [
              {
                "alt": "Chicken Curry Cut, packed tray",
                "key": "m0",
                "url": "{{ARA_ASSETS}}/chicken-curry.png",
                "kind": "image"
              },
              {
                "alt": "Boneless Chicken, packed tray",
                "key": "m1",
                "url": "{{ARA_ASSETS}}/chicken-boneless.png",
                "kind": "image"
              },
              {
                "alt": "Mutton Curry Cut, packed tray",
                "key": "m2",
                "url": "{{ARA_ASSETS}}/mutton-curry.png",
                "kind": "image"
              },
              {
                "alt": "Mutton Keema, packed tray",
                "key": "m3",
                "url": "{{ARA_ASSETS}}/mutton-keema.png",
                "kind": "image"
              }
            ]
          },
          "type": "imported_html",
          "hidden": false,
          "settings": {
            "background": "default",
            "hideOnMobile": false
          }
        },
        {
          "data": {
            "css": "@import url(\"https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap\");\n.wb-site .wbi-a735d8d3b11c{--bg:#FBF7EF;--card:#FFFFFF;--line:#EAE2D3;--line-2:#D9CFBD;--ink:#1C1C1A;--ink-2:#3F3B34;--muted:#5F5A50;--off:#6E685D;--green:#1F4D3A;--green-2:#2C6550;--green-soft:#E3EDE6;--green-ink:#CFE3D6;--chip:#F1ECE2;--veg:#2E7D32;--nonveg:#8B2E1A;--radius:16px;--wrap:1240px}\n.wb-site .wbi-a735d8d3b11c *{box-sizing:border-box;min-width:0}\n.wb-site .wbi-a735d8d3b11c{-webkit-text-size-adjust:100%}\n.wb-site .wbi-a735d8d3b11c{background:var(--bg);color:var(--ink);font:15px/1.5 'Plus Jakarta Sans',system-ui,sans-serif}\n.wb-site .wbi-a735d8d3b11c a{color:var(--green);text-decoration:none}\n.wb-site .wbi-a735d8d3b11c a:hover{color:#163a2b}\n.wb-site .wbi-a735d8d3b11c img{display:block;max-width:100%}\n.wb-site .wbi-a735d8d3b11c button{font:inherit;color:inherit}\n.wb-site .wbi-a735d8d3b11c h2{margin:0;line-height:1.2}\n.wb-site .wbi-a735d8d3b11c :focus-visible{outline:3px solid #8FB8A0;outline-offset:2px;border-radius:6px}\n.wb-site .wbi-a735d8d3b11c .wrap{max-width:var(--wrap);margin:0 auto;padding-inline:16px}\n.wb-site .wbi-a735d8d3b11c main{padding-top:20px;padding-bottom:40px;display:flex;flex-direction:column;gap:28px}\n.wb-site .wbi-a735d8d3b11c .sec{display:flex;flex-direction:column;gap:12px}\n.wb-site .wbi-a735d8d3b11c .sec-h{display:flex;align-items:baseline;justify-content:space-between;gap:12px}\n.wb-site .wbi-a735d8d3b11c .sec-h h2{font-size:19px;font-weight:700}\n.wb-site .wbi-a735d8d3b11c .sec-h a{font-size:14px;font-weight:600}\n.wb-site .wbi-a735d8d3b11c .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}\n.wb-site .wbi-a735d8d3b11c .card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);overflow:hidden;display:flex;flex-direction:column}\n.wb-site .wbi-a735d8d3b11c .card>img{width:100%;aspect-ratio:4/3;object-fit:cover}\n.wb-site .wbi-a735d8d3b11c .card .body{padding:10px 12px 12px;display:flex;flex-direction:column;gap:5px;flex:1}\n.wb-site .wbi-a735d8d3b11c .card .name{font-size:15px;font-weight:700;line-height:1.3;display:flex;gap:8px;align-items:flex-start}\n.wb-site .wbi-a735d8d3b11c .card .desc{font-size:12px;color:var(--muted)}\n.wb-site .wbi-a735d8d3b11c .card .foot{display:flex;align-items:flex-end;justify-content:space-between;gap:8px;margin-top:auto;padding-top:6px}\n.wb-site .wbi-a735d8d3b11c .card .price{font-size:17px;font-weight:700}\n.wb-site .wbi-a735d8d3b11c .tag{font-size:11px;font-weight:600;color:var(--green);background:var(--green-soft);align-self:flex-start;padding:3px 8px;border-radius:6px}\n.wb-site .wbi-a735d8d3b11c .diet{flex:none;width:13px;height:13px;margin-top:3px;border:1.5px solid currentColor;border-radius:2px;display:inline-flex;align-items:center;justify-content:center}\n.wb-site .wbi-a735d8d3b11c .diet::after{content:\"\";width:6px;height:6px;border-radius:3px;background:currentColor}\n.wb-site .wbi-a735d8d3b11c .diet.veg{color:var(--veg)}\n.wb-site .wbi-a735d8d3b11c .diet.nonveg{color:var(--nonveg)}\n.wb-site .wbi-a735d8d3b11c .btn-add{all:unset;cursor:pointer;box-sizing:border-box;height:38px;padding:0 18px;border-radius:10px;border:1.5px solid var(--green);color:var(--green);font-size:14px;font-weight:700;line-height:35px;text-align:center}\n.wb-site .wbi-a735d8d3b11c .btn-add:hover{background:var(--green-soft)}\n@container wb-site (min-width:600px){.wb-site .wbi-a735d8d3b11c .wrap{padding-inline:24px}\n.wb-site .wbi-a735d8d3b11c .grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}}\n@container wb-site (min-width:960px){.wb-site .wbi-a735d8d3b11c .wrap{padding-inline:32px}\n.wb-site .wbi-a735d8d3b11c main{padding-top:28px;padding-bottom:56px;gap:40px}\n.wb-site .wbi-a735d8d3b11c .grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}\n.wb-site .wbi-a735d8d3b11c .card .body{padding:14px 16px 16px}\n.wb-site .wbi-a735d8d3b11c .card .name{font-size:16px}\n.wb-site .wbi-a735d8d3b11c .card .price{font-size:18px}}\n@media (prefers-reduced-motion:no-preference){.wb-site .wbi-a735d8d3b11c .card{transition:transform .15s ease,box-shadow .15s ease}\n.wb-site .wbi-a735d8d3b11c .card:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(60,45,25,.08)}}",
            "html": "<div data-wb-import-spacing=\"\" style=\"padding-top:40px;padding-bottom:56px\"><main class=\"wrap\" style=\"margin-top:0;margin-bottom:0;padding-top:0;padding-bottom:0;min-height:0;height:auto\" data-wb-import-ancestor=\"\"><section class=\"sec\">\n    <div class=\"sec-h\"><h2 data-wb-text-id=\"t0\">Hot from the kitchen</h2><a href=\"/ready-to-eat\" data-wb-text-id=\"t1\">See all</a></div>\n    <div class=\"grid\">\n      <article class=\"card\"><img src=\"{{ARA_ASSETS}}/chicken-biryani.png\" alt=\"Chicken Biryani\" data-wb-media-key=\"m0\">\n        <div class=\"body\"><span class=\"tag\" data-wb-text-id=\"t2\">1 PM · 7 PM</span><span class=\"name\" data-wb-text-id=\"t3\"><span class=\"diet nonveg\" role=\"img\" aria-label=\"Non-veg\"></span>Chicken Biryani</span><span class=\"desc\" data-wb-text-id=\"t4\">Serves 1 · with raita</span>\n          <div class=\"foot\"><span class=\"price\" data-wb-text-id=\"t5\">₹249</span><button type=\"button\" class=\"btn-add\" data-wb-text-id=\"t6\">Add</button></div></div></article>\n      <article class=\"card\"><img src=\"{{ARA_ASSETS}}/mutton-biryani.png\" alt=\"Mutton Biryani\" data-wb-media-key=\"m1\">\n        <div class=\"body\"><span class=\"tag\" data-wb-text-id=\"t7\">1 PM · 7 PM</span><span class=\"name\" data-wb-text-id=\"t8\"><span class=\"diet nonveg\" role=\"img\" aria-label=\"Non-veg\"></span>Mutton Biryani</span><span class=\"desc\" data-wb-text-id=\"t9\">Serves 1 · with raita</span>\n          <div class=\"foot\"><span class=\"price\" data-wb-text-id=\"t10\">₹329</span><button type=\"button\" class=\"btn-add\" data-wb-text-id=\"t11\">Add</button></div></div></article>\n      <article class=\"card\"><img src=\"{{ARA_ASSETS}}/veg-meals.png\" alt=\"Veg Meals\" data-wb-media-key=\"m2\">\n        <div class=\"body\"><span class=\"tag\" data-wb-text-id=\"t12\">1 PM</span><span class=\"name\" data-wb-text-id=\"t13\"><span class=\"diet veg\" role=\"img\" aria-label=\"Veg\"></span>Veg Meals</span><span class=\"desc\" data-wb-text-id=\"t14\">Rice, dal, sambar, curd</span>\n          <div class=\"foot\"><span class=\"price\" data-wb-text-id=\"t15\">₹149</span><button type=\"button\" class=\"btn-add\" data-wb-text-id=\"t16\">Add</button></div></div></article>\n      <article class=\"card\"><img src=\"{{ARA_ASSETS}}/idli-vada.png\" alt=\"Idli and Vada\" data-wb-media-key=\"m3\">\n        <div class=\"body\"><span class=\"tag\" data-wb-text-id=\"t17\">8 AM</span><span class=\"name\" data-wb-text-id=\"t18\"><span class=\"diet veg\" role=\"img\" aria-label=\"Veg\"></span>Idli &amp; Vada</span><span class=\"desc\" data-wb-text-id=\"t19\">4 idli, 1 vada, sambar</span>\n          <div class=\"foot\"><span class=\"price\" data-wb-text-id=\"t20\">₹99</span><button type=\"button\" class=\"btn-add\" data-wb-text-id=\"t21\">Add</button></div></div></article>\n    </div>\n  </section></main></div>",
            "scope": "wbi-a735d8d3b11c",
            "texts": [
              {
                "id": "t0",
                "label": "Heading",
                "value": "Hot from the kitchen"
              },
              {
                "id": "t1",
                "label": "Link",
                "value": "See all"
              },
              {
                "id": "t2",
                "label": "Text",
                "value": "1 PM · 7 PM"
              },
              {
                "id": "t3",
                "label": "Text",
                "value": "Chicken Biryani"
              },
              {
                "id": "t4",
                "label": "Text",
                "value": "Serves 1 · with raita"
              },
              {
                "id": "t5",
                "label": "Text",
                "value": "₹249"
              },
              {
                "id": "t6",
                "label": "Button",
                "value": "Add"
              },
              {
                "id": "t7",
                "label": "Text",
                "value": "1 PM · 7 PM"
              },
              {
                "id": "t8",
                "label": "Text",
                "value": "Mutton Biryani"
              },
              {
                "id": "t9",
                "label": "Text",
                "value": "Serves 1 · with raita"
              },
              {
                "id": "t10",
                "label": "Text",
                "value": "₹329"
              },
              {
                "id": "t11",
                "label": "Button",
                "value": "Add"
              },
              {
                "id": "t12",
                "label": "Text",
                "value": "1 PM"
              },
              {
                "id": "t13",
                "label": "Text",
                "value": "Veg Meals"
              },
              {
                "id": "t14",
                "label": "Text",
                "value": "Rice, dal, sambar, curd"
              },
              {
                "id": "t15",
                "label": "Text",
                "value": "₹149"
              },
              {
                "id": "t16",
                "label": "Button",
                "value": "Add"
              },
              {
                "id": "t17",
                "label": "Text",
                "value": "8 AM"
              },
              {
                "id": "t18",
                "label": "Text",
                "value": "Idli & Vada"
              },
              {
                "id": "t19",
                "label": "Text",
                "value": "4 idli, 1 vada, sambar"
              },
              {
                "id": "t20",
                "label": "Text",
                "value": "₹99"
              },
              {
                "id": "t21",
                "label": "Button",
                "value": "Add"
              }
            ],
            "title": "Hot from the kitchen",
            "mediaSlots": [
              {
                "alt": "Chicken Biryani",
                "key": "m0",
                "url": "{{ARA_ASSETS}}/chicken-biryani.png",
                "kind": "image"
              },
              {
                "alt": "Mutton Biryani",
                "key": "m1",
                "url": "{{ARA_ASSETS}}/mutton-biryani.png",
                "kind": "image"
              },
              {
                "alt": "Veg Meals",
                "key": "m2",
                "url": "{{ARA_ASSETS}}/veg-meals.png",
                "kind": "image"
              },
              {
                "alt": "Idli and Vada",
                "key": "m3",
                "url": "{{ARA_ASSETS}}/idli-vada.png",
                "kind": "image"
              }
            ]
          },
          "type": "imported_html",
          "hidden": false,
          "settings": {
            "background": "default",
            "hideOnMobile": false
          }
        }
      ],
      "showInNav": true
    },
    {
      "name": "Cart",
      "slug": "/cart",
      "pageType": "CUSTOM",
      "sections": [
        {
          "data": {
            "css": "@import url(\"https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap\");\n.wb-site .wbi-a735d8a61a6d{--bg:#FBF7EF;--card:#FFFFFF;--line:#EAE2D3;--line-2:#D9CFBD;--ink:#1C1C1A;--ink-2:#3F3B34;--muted:#5F5A50;--off:#6E685D;--green:#1F4D3A;--green-2:#2C6550;--green-soft:#E3EDE6;--green-ink:#CFE3D6;--chip:#F1ECE2;--veg:#2E7D32;--nonveg:#8B2E1A;--radius:16px;--wrap:1240px}\n.wb-site .wbi-a735d8a61a6d *{box-sizing:border-box;min-width:0}\n.wb-site .wbi-a735d8a61a6d{-webkit-text-size-adjust:100%}\n.wb-site .wbi-a735d8a61a6d{background:var(--bg);color:var(--ink);font:15px/1.5 'Plus Jakarta Sans',system-ui,sans-serif}\n.wb-site .wbi-a735d8a61a6d a{color:var(--green);text-decoration:none}\n.wb-site .wbi-a735d8a61a6d a:hover{color:#163a2b}\n.wb-site .wbi-a735d8a61a6d h1{margin:0;line-height:1.2}\n.wb-site .wbi-a735d8a61a6d :focus-visible{outline:3px solid #8FB8A0;outline-offset:2px;border-radius:6px}\n.wb-site .wbi-a735d8a61a6d .wrap{max-width:var(--wrap);margin:0 auto;padding-inline:16px}\n.wb-site .wbi-a735d8a61a6d .muted{color:var(--muted)}\n.wb-site .wbi-a735d8a61a6d main{padding-top:20px;padding-bottom:40px;display:flex;flex-direction:column;gap:28px}\n.wb-site .wbi-a735d8a61a6d .page-title{display:flex;flex-direction:column;gap:4px}\n.wb-site .wbi-a735d8a61a6d .page-title h1{font-size:26px;font-weight:700}\n.wb-site .wbi-a735d8a61a6d .toolbar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px}\n@container wb-site (min-width:600px){.wb-site .wbi-a735d8a61a6d .wrap{padding-inline:24px}}\n@container wb-site (min-width:960px){.wb-site .wbi-a735d8a61a6d .wrap{padding-inline:32px}\n.wb-site .wbi-a735d8a61a6d main{padding-top:28px;padding-bottom:56px;gap:40px}\n.wb-site .wbi-a735d8a61a6d .page-title h1{font-size:32px}}",
            "html": "<div data-wb-import-spacing=\"\" style=\"padding-top:28px;padding-bottom:0px\"><main class=\"wrap\" style=\"margin-top:0;margin-bottom:0;padding-top:0;padding-bottom:0;min-height:0;height:auto\" data-wb-import-ancestor=\"\"><div class=\"toolbar\">\n    <div class=\"page-title\"><h1 data-wb-text-id=\"t0\">Your cart <span class=\"muted\" style=\"font-size:16px;font-weight:500\" data-wb-text-id=\"t1\">· 6 items</span></h1></div>\n    <a href=\"/\" style=\"font-size:14px;font-weight:600\" data-wb-text-id=\"t2\">Continue shopping</a>\n  </div></main></div>",
            "scope": "wbi-a735d8a61a6d",
            "texts": [
              {
                "id": "t0",
                "label": "Heading",
                "value": "Your cart"
              },
              {
                "id": "t1",
                "label": "Text",
                "value": "· 6 items"
              },
              {
                "id": "t2",
                "label": "Link",
                "value": "Continue shopping"
              }
            ],
            "title": "Your cart · 6 items",
            "mediaSlots": []
          },
          "type": "imported_html",
          "hidden": false,
          "settings": {
            "background": "default",
            "hideOnMobile": false
          }
        },
        {
          "data": {
            "css": "@import url(\"https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap\");\n.wb-site .wbi-a735d8b953ab{--bg:#FBF7EF;--card:#FFFFFF;--line:#EAE2D3;--line-2:#D9CFBD;--ink:#1C1C1A;--ink-2:#3F3B34;--muted:#5F5A50;--off:#6E685D;--green:#1F4D3A;--green-2:#2C6550;--green-soft:#E3EDE6;--green-ink:#CFE3D6;--chip:#F1ECE2;--veg:#2E7D32;--nonveg:#8B2E1A;--radius:16px;--wrap:1240px}\n.wb-site .wbi-a735d8b953ab *{box-sizing:border-box;min-width:0}\n.wb-site .wbi-a735d8b953ab{-webkit-text-size-adjust:100%}\n.wb-site .wbi-a735d8b953ab{background:var(--bg);color:var(--ink);font:15px/1.5 'Plus Jakarta Sans',system-ui,sans-serif}\n.wb-site .wbi-a735d8b953ab a{color:var(--green);text-decoration:none}\n.wb-site .wbi-a735d8b953ab a:hover{color:#163a2b}\n.wb-site .wbi-a735d8b953ab img{display:block;max-width:100%}\n.wb-site .wbi-a735d8b953ab button{font:inherit;color:inherit}\n.wb-site .wbi-a735d8b953ab h2{margin:0;line-height:1.2}\n.wb-site .wbi-a735d8b953ab :focus-visible{outline:3px solid #8FB8A0;outline-offset:2px;border-radius:6px}\n.wb-site .wbi-a735d8b953ab .wrap{max-width:var(--wrap);margin:0 auto;padding-inline:16px}\n.wb-site .wbi-a735d8b953ab .muted{color:var(--muted)}\n.wb-site .wbi-a735d8b953ab main{padding-top:20px;padding-bottom:40px;display:flex;flex-direction:column;gap:28px}\n.wb-site .wbi-a735d8b953ab .note{display:flex;gap:10px;align-items:center;padding:11px 14px;border-radius:12px;background:var(--green-soft);color:var(--green);font-size:14px}\n.wb-site .wbi-a735d8b953ab .note svg{flex:none}\n.wb-site .wbi-a735d8b953ab .panel{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:16px}\n.wb-site .wbi-a735d8b953ab .panel h2{font-size:17px;font-weight:700}\n.wb-site .wbi-a735d8b953ab .split{display:flex;flex-direction:column;gap:20px}\n.wb-site .wbi-a735d8b953ab .stepper{display:flex;align-items:center;height:38px;border-radius:10px;background:var(--green);color:#fff}\n.wb-site .wbi-a735d8b953ab .stepper.outline{background:transparent;border:1.5px solid var(--green);color:var(--green)}\n.wb-site .wbi-a735d8b953ab .stepper button{all:unset;cursor:pointer;width:36px;height:100%;text-align:center;font-size:18px;font-weight:700}\n.wb-site .wbi-a735d8b953ab .stepper output{min-width:16px;text-align:center;font-size:14px;font-weight:700}\n.wb-site .wbi-a735d8b953ab .btn-primary{all:unset;cursor:pointer;box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:8px;height:56px;padding:0 20px;border-radius:14px;background:var(--green);color:#fff;font-size:16px;font-weight:700;text-align:center}\n.wb-site .wbi-a735d8b953ab .btn-primary:hover{background:#183e2f;color:#fff}\n.wb-site .wbi-a735d8b953ab .lines{padding:0;overflow:hidden}\n.wb-site .wbi-a735d8b953ab .lines h2{padding:12px 16px;font-size:12px;font-weight:700;color:var(--muted);border-bottom:1px solid var(--line)}\n.wb-site .wbi-a735d8b953ab .line{display:grid;grid-template-columns:76px 1fr;grid-template-areas:\"img info\" \"img ctl\";gap:6px 12px;padding:14px 16px}\n.wb-site .wbi-a735d8b953ab .line+.line{border-top:1px solid var(--line)}\n.wb-site .wbi-a735d8b953ab .line img{grid-area:img;width:76px;height:76px;object-fit:cover;border-radius:10px}\n.wb-site .wbi-a735d8b953ab .line .info{grid-area:info;display:flex;flex-direction:column;gap:2px}\n.wb-site .wbi-a735d8b953ab .line .info b{font-size:15px}\n.wb-site .wbi-a735d8b953ab .line .info span{font-size:12px;color:var(--muted)}\n.wb-site .wbi-a735d8b953ab .line .ctl{grid-area:ctl;display:flex;align-items:center;justify-content:space-between;gap:12px}\n.wb-site .wbi-a735d8b953ab .line .total{font-size:16px;font-weight:700}\n.wb-site .wbi-a735d8b953ab .dashed{display:flex;align-items:center;justify-content:center;gap:8px;height:48px;border-radius:12px;border:1px dashed #B9AE99;font-size:14px;font-weight:600}\n.wb-site .wbi-a735d8b953ab .bill{display:flex;flex-direction:column;gap:12px}\n.wb-site .wbi-a735d8b953ab .bill .row{display:flex;justify-content:space-between;font-size:14px}\n.wb-site .wbi-a735d8b953ab .bill .row span:first-child{color:var(--muted)}\n.wb-site .wbi-a735d8b953ab .bill .row span:last-child{font-weight:600}\n.wb-site .wbi-a735d8b953ab .bill hr{border:0;height:1px;background:var(--line);margin:0}\n.wb-site .wbi-a735d8b953ab .bill .grand{font-size:18px;font-weight:700}\n.wb-site .wbi-a735d8b953ab .bill .grand span{color:var(--ink)!important;font-weight:700!important}\n.wb-site .wbi-a735d8b953ab .aside-cta{display:none}\n@container wb-site (min-width:600px){.wb-site .wbi-a735d8b953ab .wrap{padding-inline:24px}\n.wb-site .wbi-a735d8b953ab .line{grid-template-columns:96px 1fr auto auto;grid-template-areas:\"img info ctl\";align-items:center}\n.wb-site .wbi-a735d8b953ab .line img{width:96px;height:72px}\n.wb-site .wbi-a735d8b953ab .line .ctl{gap:20px}}\n@container wb-site (min-width:960px){.wb-site .wbi-a735d8b953ab .wrap{padding-inline:32px}\n.wb-site .wbi-a735d8b953ab main{padding-top:28px;padding-bottom:56px;gap:40px}\n.wb-site .wbi-a735d8b953ab .split{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:28px;align-items:start}\n.wb-site .wbi-a735d8b953ab .split>aside{position:sticky;top:110px}\n.wb-site .wbi-a735d8b953ab .aside-cta{display:flex;flex-direction:column;gap:12px;margin-top:6px}}",
            "html": "<div data-wb-import-spacing=\"\" style=\"padding-top:40px;padding-bottom:56px\"><main class=\"wrap\" style=\"margin-top:0;margin-bottom:0;padding-top:0;padding-bottom:0;min-height:0;height:auto\" data-wb-import-ancestor=\"\"><div class=\"split\">\n    <div style=\"display:flex;flex-direction:column;gap:16px\">\n      <div class=\"note\"><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1F4D3A\" stroke-width=\"2\" aria-hidden=\"true\"><path d=\"M3 7h11v9H3zM14 10h4l3 3v3h-7z\"></path><circle cx=\"7\" cy=\"17.5\" r=\"1.8\"></circle><circle cx=\"17\" cy=\"17.5\" r=\"1.8\"></circle></svg>\n        <span data-wb-text-id=\"t0\">Everything arrives together in one delivery. Next available: <strong data-wb-text-id=\"t1\">Today, 1:00 PM</strong>. Biryani comes at 1:00 PM or 7:00 PM.</span></div>\n\n      <section class=\"panel lines\">\n        <h2 data-wb-text-id=\"t2\">FRESH MEAT</h2>\n        <div class=\"line\"><img src=\"{{ARA_ASSETS}}/chicken-curry.png\" alt=\"\" data-wb-media-key=\"m0\">\n          <div class=\"info\"><b data-wb-text-id=\"t3\">Chicken Curry Cut</b><span data-wb-text-id=\"t4\">Bone-in · 500 g · ₹189 each</span></div>\n          <div class=\"ctl\"><div class=\"stepper outline\"><button type=\"button\" aria-label=\"Remove one\" data-dec=\"\">−</button><output data-wb-text-id=\"t5\">2</output><button type=\"button\" aria-label=\"Add one\" data-inc=\"\">+</button></div><span class=\"total\" data-wb-text-id=\"t6\">₹378</span></div></div>\n        <div class=\"line\"><img src=\"{{ARA_ASSETS}}/chicken-boneless.png\" alt=\"\" data-wb-media-key=\"m1\">\n          <div class=\"info\"><b data-wb-text-id=\"t7\">Boneless Chicken</b><span data-wb-text-id=\"t8\">Boneless · 500 g · ₹259 each</span></div>\n          <div class=\"ctl\"><div class=\"stepper outline\"><button type=\"button\" aria-label=\"Remove one\" data-dec=\"\">−</button><output data-wb-text-id=\"t9\">1</output><button type=\"button\" aria-label=\"Add one\" data-inc=\"\">+</button></div><span class=\"total\" data-wb-text-id=\"t10\">₹259</span></div></div>\n        <div class=\"line\"><img src=\"{{ARA_ASSETS}}/mutton-curry.png\" alt=\"\" data-wb-media-key=\"m2\">\n          <div class=\"info\"><b data-wb-text-id=\"t11\">Mutton Curry Cut</b><span data-wb-text-id=\"t12\">Bone-in · 500 g · ₹449 each</span></div>\n          <div class=\"ctl\"><div class=\"stepper outline\"><button type=\"button\" aria-label=\"Remove one\" data-dec=\"\">−</button><output data-wb-text-id=\"t13\">1</output><button type=\"button\" aria-label=\"Add one\" data-inc=\"\">+</button></div><span class=\"total\" data-wb-text-id=\"t14\">₹449</span></div></div>\n      </section>\n\n      <section class=\"panel lines\">\n        <h2 data-wb-text-id=\"t15\">READY TO EAT</h2>\n        <div class=\"line\"><img src=\"{{ARA_ASSETS}}/chicken-biryani.png\" alt=\"\" data-wb-media-key=\"m3\">\n          <div class=\"info\"><b data-wb-text-id=\"t16\">Chicken Biryani</b><span data-wb-text-id=\"t17\">Serves 1 · with raita and salan · ₹249 each</span></div>\n          <div class=\"ctl\"><div class=\"stepper outline\"><button type=\"button\" aria-label=\"Remove one\" data-dec=\"\">−</button><output data-wb-text-id=\"t18\">2</output><button type=\"button\" aria-label=\"Add one\" data-inc=\"\">+</button></div><span class=\"total\" data-wb-text-id=\"t19\">₹498</span></div></div>\n      </section>\n\n      <a class=\"dashed\" href=\"/\" data-wb-text-id=\"t20\"><svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1F4D3A\" stroke-width=\"2.2\" aria-hidden=\"true\"><path d=\"M12 5v14M5 12h14\"></path></svg>Add more items</a>\n    </div>\n\n    <aside class=\"panel bill\" aria-label=\"Bill details\">\n      <h2 data-wb-text-id=\"t21\">Bill details</h2>\n      <div class=\"row\"><span data-wb-text-id=\"t22\">Subtotal</span><span data-wb-text-id=\"t23\">₹1,584</span></div>\n      <div class=\"row\"><span data-wb-text-id=\"t24\">Delivery fee</span><span data-wb-text-id=\"t25\">₹29</span></div>\n      <hr>\n      <div class=\"row grand\"><span data-wb-text-id=\"t26\">To pay</span><span data-wb-text-id=\"t27\">₹1,613</span></div>\n      <div class=\"aside-cta\">\n        <a class=\"btn-primary\" href=\"/checkout\" data-wb-text-id=\"t28\">Choose delivery time →</a>\n        <span class=\"muted\" style=\"font-size:13px;text-align:center\" data-wb-text-id=\"t29\">You'll pick Today or Tomorrow on the next step.</span>\n      </div>\n    </aside>\n  </div></main></div>",
            "scope": "wbi-a735d8b953ab",
            "texts": [
              {
                "id": "t0",
                "label": "Text",
                "value": "Everything arrives together in one delivery. Next available: . Biryani comes at 1:00 PM or 7:00 PM."
              },
              {
                "id": "t1",
                "label": "Bold text",
                "value": "Today, 1:00 PM"
              },
              {
                "id": "t2",
                "label": "Heading",
                "value": "FRESH MEAT"
              },
              {
                "id": "t3",
                "label": "Bold text",
                "value": "Chicken Curry Cut"
              },
              {
                "id": "t4",
                "label": "Text",
                "value": "Bone-in · 500 g · ₹189 each"
              },
              {
                "id": "t5",
                "label": "Text",
                "value": "2"
              },
              {
                "id": "t6",
                "label": "Text",
                "value": "₹378"
              },
              {
                "id": "t7",
                "label": "Bold text",
                "value": "Boneless Chicken"
              },
              {
                "id": "t8",
                "label": "Text",
                "value": "Boneless · 500 g · ₹259 each"
              },
              {
                "id": "t9",
                "label": "Text",
                "value": "1"
              },
              {
                "id": "t10",
                "label": "Text",
                "value": "₹259"
              },
              {
                "id": "t11",
                "label": "Bold text",
                "value": "Mutton Curry Cut"
              },
              {
                "id": "t12",
                "label": "Text",
                "value": "Bone-in · 500 g · ₹449 each"
              },
              {
                "id": "t13",
                "label": "Text",
                "value": "1"
              },
              {
                "id": "t14",
                "label": "Text",
                "value": "₹449"
              },
              {
                "id": "t15",
                "label": "Heading",
                "value": "READY TO EAT"
              },
              {
                "id": "t16",
                "label": "Bold text",
                "value": "Chicken Biryani"
              },
              {
                "id": "t17",
                "label": "Text",
                "value": "Serves 1 · with raita and salan · ₹249 each"
              },
              {
                "id": "t18",
                "label": "Text",
                "value": "2"
              },
              {
                "id": "t19",
                "label": "Text",
                "value": "₹498"
              },
              {
                "id": "t20",
                "label": "Link",
                "value": "Add more items"
              },
              {
                "id": "t21",
                "label": "Heading",
                "value": "Bill details"
              },
              {
                "id": "t22",
                "label": "Text",
                "value": "Subtotal"
              },
              {
                "id": "t23",
                "label": "Text",
                "value": "₹1,584"
              },
              {
                "id": "t24",
                "label": "Text",
                "value": "Delivery fee"
              },
              {
                "id": "t25",
                "label": "Text",
                "value": "₹29"
              },
              {
                "id": "t26",
                "label": "Text",
                "value": "To pay"
              },
              {
                "id": "t27",
                "label": "Text",
                "value": "₹1,613"
              },
              {
                "id": "t28",
                "label": "Link",
                "value": "Choose delivery time →"
              },
              {
                "id": "t29",
                "label": "Text",
                "value": "You'll pick Today or Tomorrow on the next step."
              }
            ],
            "title": "FRESH MEAT",
            "mediaSlots": [
              {
                "key": "m0",
                "url": "{{ARA_ASSETS}}/chicken-curry.png",
                "kind": "image"
              },
              {
                "key": "m1",
                "url": "{{ARA_ASSETS}}/chicken-boneless.png",
                "kind": "image"
              },
              {
                "key": "m2",
                "url": "{{ARA_ASSETS}}/mutton-curry.png",
                "kind": "image"
              },
              {
                "key": "m3",
                "url": "{{ARA_ASSETS}}/chicken-biryani.png",
                "kind": "image"
              }
            ]
          },
          "type": "imported_html",
          "hidden": false,
          "settings": {
            "background": "default",
            "hideOnMobile": false
          }
        }
      ],
      "showInNav": true
    },
    {
      "name": "Checkout",
      "slug": "/checkout",
      "pageType": "CUSTOM",
      "sections": [
        {
          "data": {
            "css": "@import url(\"https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap\");\n.wb-site .wbi-a735d8a67166{--bg:#FBF7EF;--card:#FFFFFF;--line:#EAE2D3;--line-2:#D9CFBD;--ink:#1C1C1A;--ink-2:#3F3B34;--muted:#5F5A50;--off:#6E685D;--green:#1F4D3A;--green-2:#2C6550;--green-soft:#E3EDE6;--green-ink:#CFE3D6;--chip:#F1ECE2;--veg:#2E7D32;--nonveg:#8B2E1A;--radius:16px;--wrap:1240px}\n.wb-site .wbi-a735d8a67166 *{box-sizing:border-box;min-width:0}\n.wb-site .wbi-a735d8a67166{-webkit-text-size-adjust:100%}\n.wb-site .wbi-a735d8a67166{background:var(--bg);color:var(--ink);font:15px/1.5 'Plus Jakarta Sans',system-ui,sans-serif}\n.wb-site .wbi-a735d8a67166 h1{margin:0;line-height:1.2}\n.wb-site .wbi-a735d8a67166 :focus-visible{outline:3px solid #8FB8A0;outline-offset:2px;border-radius:6px}\n.wb-site .wbi-a735d8a67166 .wrap{max-width:var(--wrap);margin:0 auto;padding-inline:16px}\n.wb-site .wbi-a735d8a67166 main{padding-top:20px;padding-bottom:40px;display:flex;flex-direction:column;gap:28px}\n.wb-site .wbi-a735d8a67166 .page-title{display:flex;flex-direction:column;gap:4px}\n.wb-site .wbi-a735d8a67166 .page-title h1{font-size:26px;font-weight:700}\n@container wb-site (min-width:600px){.wb-site .wbi-a735d8a67166 .wrap{padding-inline:24px}}\n@container wb-site (min-width:960px){.wb-site .wbi-a735d8a67166 .wrap{padding-inline:32px}\n.wb-site .wbi-a735d8a67166 main{padding-top:28px;padding-bottom:56px;gap:40px}\n.wb-site .wbi-a735d8a67166 .page-title h1{font-size:32px}}",
            "html": "<div data-wb-import-spacing=\"\" style=\"padding-top:28px;padding-bottom:0px\"><main class=\"wrap\" style=\"margin-top:0;margin-bottom:0;padding-top:0;padding-bottom:0;min-height:0;height:auto\" data-wb-import-ancestor=\"\"><div class=\"page-title\"><h1 data-wb-text-id=\"t0\">Checkout</h1></div></main></div>",
            "scope": "wbi-a735d8a67166",
            "texts": [
              {
                "id": "t0",
                "label": "Heading",
                "value": "Checkout"
              }
            ],
            "title": "Checkout",
            "mediaSlots": []
          },
          "type": "imported_html",
          "hidden": false,
          "settings": {
            "background": "default",
            "hideOnMobile": false
          }
        },
        {
          "data": {
            "css": "@import url(\"https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap\");\n.wb-site .wbi-a735d894a43f{--bg:#FBF7EF;--card:#FFFFFF;--line:#EAE2D3;--line-2:#D9CFBD;--ink:#1C1C1A;--ink-2:#3F3B34;--muted:#5F5A50;--off:#6E685D;--green:#1F4D3A;--green-2:#2C6550;--green-soft:#E3EDE6;--green-ink:#CFE3D6;--chip:#F1ECE2;--veg:#2E7D32;--nonveg:#8B2E1A;--radius:16px;--wrap:1240px}\n.wb-site .wbi-a735d894a43f *{box-sizing:border-box;min-width:0}\n.wb-site .wbi-a735d894a43f{-webkit-text-size-adjust:100%}\n.wb-site .wbi-a735d894a43f{background:var(--bg);color:var(--ink);font:15px/1.5 'Plus Jakarta Sans',system-ui,sans-serif}\n.wb-site .wbi-a735d894a43f button{font:inherit;color:inherit}\n.wb-site .wbi-a735d894a43f h2{margin:0;line-height:1.2}\n.wb-site .wbi-a735d894a43f :focus-visible{outline:3px solid #8FB8A0;outline-offset:2px;border-radius:6px}\n.wb-site .wbi-a735d894a43f .wrap{max-width:var(--wrap);margin:0 auto;padding-inline:16px}\n.wb-site .wbi-a735d894a43f .muted{color:var(--muted)}\n.wb-site .wbi-a735d894a43f main{padding-top:20px;padding-bottom:40px;display:flex;flex-direction:column;gap:28px}\n.wb-site .wbi-a735d894a43f .note{display:flex;gap:10px;align-items:center;padding:11px 14px;border-radius:12px;background:var(--green-soft);color:var(--green);font-size:14px}\n.wb-site .wbi-a735d894a43f .note svg{flex:none}\n.wb-site .wbi-a735d894a43f .panel{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:16px}\n.wb-site .wbi-a735d894a43f .panel h2{font-size:17px;font-weight:700}\n.wb-site .wbi-a735d894a43f .split{display:flex;flex-direction:column;gap:20px}\n.wb-site .wbi-a735d894a43f .btn-primary{all:unset;cursor:pointer;box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:8px;height:56px;padding:0 20px;border-radius:14px;background:var(--green);color:#fff;font-size:16px;font-weight:700;text-align:center}\n.wb-site .wbi-a735d894a43f .btn-primary:hover{background:#183e2f;color:#fff}\n.wb-site .wbi-a735d894a43f .btn-primary.split-text{justify-content:space-between}\n.wb-site .wbi-a735d894a43f .link-btn{all:unset;cursor:pointer;font-size:14px;font-weight:700;color:var(--green);min-height:44px;display:inline-flex;align-items:center;padding:0 4px}\n.wb-site .wbi-a735d894a43f input[type=radio]{accent-color:var(--green);width:18px;height:18px;margin:0}\n.wb-site .wbi-a735d894a43f .bill{display:flex;flex-direction:column;gap:12px}\n.wb-site .wbi-a735d894a43f .bill .row{display:flex;justify-content:space-between;font-size:14px}\n.wb-site .wbi-a735d894a43f .bill .row span:first-child{color:var(--muted)}\n.wb-site .wbi-a735d894a43f .bill .row span:last-child{font-weight:600}\n.wb-site .wbi-a735d894a43f .bill hr{border:0;height:1px;background:var(--line);margin:0}\n.wb-site .wbi-a735d894a43f .bill .grand{font-size:18px;font-weight:700}\n.wb-site .wbi-a735d894a43f .bill .grand span{color:var(--ink)!important;font-weight:700!important}\n.wb-site .wbi-a735d894a43f .aside-cta{display:none}\n.wb-site .wbi-a735d894a43f .addr{display:flex;gap:12px;align-items:flex-start}\n.wb-site .wbi-a735d894a43f .addr .ic{flex:none;width:40px;height:40px;border-radius:20px;background:var(--green-soft);display:flex;align-items:center;justify-content:center}\n.wb-site .wbi-a735d894a43f .addr .txt{flex:1;display:flex;flex-direction:column;gap:3px}\n.wb-site .wbi-a735d894a43f .addr .txt small{font-size:12px;font-weight:600;color:var(--muted)}\n.wb-site .wbi-a735d894a43f .addr .txt span{font-size:13px;color:var(--ink-2)}\n.wb-site .wbi-a735d894a43f .day{display:flex;flex-direction:column;gap:8px}\n.wb-site .wbi-a735d894a43f .day>b{font-size:13px;color:var(--ink-2)}\n.wb-site .wbi-a735d894a43f .slot-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}\n.wb-site .wbi-a735d894a43f .slot{all:unset;cursor:pointer;box-sizing:border-box;min-height:58px;border-radius:12px;border:1.5px solid var(--line-2);background:var(--card);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}\n.wb-site .wbi-a735d894a43f .slot b{font-size:15px}\n.wb-site .wbi-a735d894a43f .slot small{font-size:11px;font-weight:600}\n.wb-site .wbi-a735d894a43f .slot[aria-pressed=true]{background:var(--green);border-color:var(--green);color:#fff}\n.wb-site .wbi-a735d894a43f .slot:disabled{cursor:not-allowed;background:var(--chip);color:var(--off);border:1px dashed #CFC5B3}\n.wb-site .wbi-a735d894a43f .pay{display:flex;flex-direction:column}\n.wb-site .wbi-a735d894a43f .pay label{display:flex;align-items:center;gap:12px;min-height:50px;font-size:15px;font-weight:600}\n.wb-site .wbi-a735d894a43f .pay label+label{border-top:1px solid var(--line)}\n.wb-site .wbi-a735d894a43f .pay label small{margin-left:auto;font-weight:500;font-size:12px;color:var(--muted)}\n.wb-site .wbi-a735d894a43f .sum-lines{display:none}\n@container wb-site (min-width:600px){.wb-site .wbi-a735d894a43f .wrap{padding-inline:24px}}\n@container wb-site (min-width:960px){.wb-site .wbi-a735d894a43f .wrap{padding-inline:32px}\n.wb-site .wbi-a735d894a43f main{padding-top:28px;padding-bottom:56px;gap:40px}\n.wb-site .wbi-a735d894a43f .split{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:28px;align-items:start}\n.wb-site .wbi-a735d894a43f .split>aside{position:sticky;top:110px}\n.wb-site .wbi-a735d894a43f .aside-cta{display:flex;flex-direction:column;gap:12px;margin-top:6px}\n.wb-site .wbi-a735d894a43f .sum-lines{display:flex;flex-direction:column;gap:8px}\n.wb-site .wbi-a735d894a43f .sum-lines div{display:flex;justify-content:space-between;gap:12px;font-size:14px}\n.wb-site .wbi-a735d894a43f .sum-lines span:first-child{color:var(--ink-2)}\n.wb-site .wbi-a735d894a43f .day{flex-direction:row;align-items:center;gap:20px}\n.wb-site .wbi-a735d894a43f .day>b{width:90px;font-size:15px}\n.wb-site .wbi-a735d894a43f .slot-grid{flex:1;gap:12px}\n.wb-site .wbi-a735d894a43f .slot{min-height:64px}\n.wb-site .wbi-a735d894a43f .slot b{font-size:17px}\n.wb-site .wbi-a735d894a43f .pay{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}\n.wb-site .wbi-a735d894a43f .pay label{padding:0 16px;border:1.5px solid var(--line-2);border-radius:12px;min-height:56px}\n.wb-site .wbi-a735d894a43f .pay label+label{border-top:1.5px solid var(--line-2)}\n.wb-site .wbi-a735d894a43f .pay label:has(input:checked){border:2px solid var(--green)}\n.wb-site .wbi-a735d894a43f .pay label small{display:none}}",
            "html": "<div data-wb-import-spacing=\"\" style=\"padding-top:40px;padding-bottom:56px\"><main class=\"wrap\" style=\"margin-top:0;margin-bottom:0;padding-top:0;padding-bottom:0;min-height:0;height:auto\" data-wb-import-ancestor=\"\"><div class=\"split\">\n    <div style=\"display:flex;flex-direction:column;gap:16px\">\n      <section class=\"panel addr\" aria-labelledby=\"addr-h\">\n        <div class=\"ic\"><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1F4D3A\" stroke-width=\"2.2\" aria-hidden=\"true\"><path d=\"M12 22s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z\"></path><circle cx=\"12\" cy=\"10\" r=\"2.5\"></circle></svg></div>\n        <div class=\"txt\">\n          <small id=\"addr-h\" data-wb-text-id=\"t0\">DELIVERY ADDRESS</small>\n          <b data-wb-text-id=\"t1\">Home</b>\n          <span data-wb-text-id=\"t2\">Flat 302, Green Park Residency, 12th Main Road, Indiranagar, Bengaluru 560038</span>\n        </div>\n        <button type=\"button\" class=\"link-btn\" data-wb-text-id=\"t3\">Change</button>\n      </section>\n\n      <section class=\"panel\" style=\"display:flex;flex-direction:column;gap:14px\" aria-labelledby=\"slot-h\">\n        <h2 id=\"slot-h\" data-wb-text-id=\"t4\">Choose delivery time</h2>\n        <div class=\"day\" data-day=\"Today\" role=\"group\" aria-label=\"Today\">\n          <b data-wb-text-id=\"t5\">Today</b>\n          <div class=\"slot-grid\">\n            <button type=\"button\" class=\"slot\" disabled=\"\" aria-pressed=\"false\"><b data-wb-text-id=\"t6\">8:00 AM</b><small data-wb-text-id=\"t7\">Unavailable</small></button>\n            <button type=\"button\" class=\"slot\" aria-pressed=\"true\"><b data-wb-text-id=\"t8\">1:00 PM</b><small data-wb-text-id=\"t9\">Selected</small></button>\n            <button type=\"button\" class=\"slot\" aria-pressed=\"false\"><b data-wb-text-id=\"t10\">7:00 PM</b><small data-wb-text-id=\"t11\">Available</small></button>\n          </div>\n        </div>\n        <div class=\"day\" data-day=\"Tomorrow\" role=\"group\" aria-label=\"Tomorrow\">\n          <b data-wb-text-id=\"t12\">Tomorrow</b>\n          <div class=\"slot-grid\">\n            <button type=\"button\" class=\"slot\" disabled=\"\" aria-pressed=\"false\"><b data-wb-text-id=\"t13\">8:00 AM</b><small data-wb-text-id=\"t14\">Unavailable</small></button>\n            <button type=\"button\" class=\"slot\" aria-pressed=\"false\"><b data-wb-text-id=\"t15\">1:00 PM</b><small data-wb-text-id=\"t16\">Available</small></button>\n            <button type=\"button\" class=\"slot\" aria-pressed=\"false\"><b data-wb-text-id=\"t17\">7:00 PM</b><small data-wb-text-id=\"t18\">Available</small></button>\n          </div>\n        </div>\n        <span class=\"muted\" style=\"font-size:13px\" data-wb-text-id=\"t19\">8:00 AM is for breakfast items only, so it isn't open for this order. Your meat and biryani arrive together.</span>\n      </section>\n\n      <section class=\"panel\" style=\"display:flex;flex-direction:column;gap:10px\" aria-labelledby=\"pay-h\">\n        <h2 id=\"pay-h\" data-wb-text-id=\"t20\">Payment</h2>\n        <div class=\"pay\">\n          <label data-wb-text-id=\"t21\"><input type=\"radio\" name=\"pay\" checked=\"\">UPI<small data-wb-text-id=\"t22\">Any UPI app</small></label>\n          <label data-wb-text-id=\"t23\"><input type=\"radio\" name=\"pay\">Credit or debit card</label>\n          <label data-wb-text-id=\"t24\"><input type=\"radio\" name=\"pay\">Cash on delivery</label>\n        </div>\n      </section>\n    </div>\n\n    <aside class=\"panel bill\" aria-label=\"Order summary\">\n      <h2 data-wb-text-id=\"t25\">Order summary</h2>\n      <div class=\"sum-lines\">\n        <div><span data-wb-text-id=\"t26\">Chicken Curry Cut, 500 g × 2</span><span data-wb-text-id=\"t27\">₹378</span></div>\n        <div><span data-wb-text-id=\"t28\">Boneless Chicken, 500 g × 1</span><span data-wb-text-id=\"t29\">₹259</span></div>\n        <div><span data-wb-text-id=\"t30\">Mutton Curry Cut, 500 g × 1</span><span data-wb-text-id=\"t31\">₹449</span></div>\n        <div><span data-wb-text-id=\"t32\">Chicken Biryani, Serves 1 × 2</span><span data-wb-text-id=\"t33\">₹498</span></div>\n      </div>\n      <hr class=\"sum-lines\">\n      <div class=\"row\"><span data-wb-text-id=\"t34\">Items (6)</span><span data-wb-text-id=\"t35\">₹1,584</span></div>\n      <div class=\"row\"><span data-wb-text-id=\"t36\">Delivery fee</span><span data-wb-text-id=\"t37\">₹29</span></div>\n      <hr>\n      <div class=\"row grand\"><span data-wb-text-id=\"t38\">Total</span><span data-wb-text-id=\"t39\">₹1,613</span></div>\n      <div class=\"aside-cta\">\n        <div class=\"note\"><svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1F4D3A\" stroke-width=\"2\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"9\"></circle><path d=\"M12 7v5l3 2\"></path></svg><span data-wb-text-id=\"t40\">Delivering <strong data-when=\"\" data-wb-text-id=\"t41\">Today, 1:00 PM</strong></span></div>\n        <button type=\"button\" class=\"btn-primary split-text\"><span data-wb-text-id=\"t42\">Place order</span><span data-wb-text-id=\"t43\">₹1,613</span></button>\n      </div>\n    </aside>\n  </div></main></div>",
            "scope": "wbi-a735d894a43f",
            "texts": [
              {
                "id": "t0",
                "label": "Small text",
                "value": "DELIVERY ADDRESS"
              },
              {
                "id": "t1",
                "label": "Bold text",
                "value": "Home"
              },
              {
                "id": "t2",
                "label": "Text",
                "value": "Flat 302, Green Park Residency, 12th Main Road, Indiranagar, Bengaluru 560038"
              },
              {
                "id": "t3",
                "label": "Button",
                "value": "Change"
              },
              {
                "id": "t4",
                "label": "Heading",
                "value": "Choose delivery time"
              },
              {
                "id": "t5",
                "label": "Bold text",
                "value": "Today"
              },
              {
                "id": "t6",
                "label": "Bold text",
                "value": "8:00 AM"
              },
              {
                "id": "t7",
                "label": "Small text",
                "value": "Unavailable"
              },
              {
                "id": "t8",
                "label": "Bold text",
                "value": "1:00 PM"
              },
              {
                "id": "t9",
                "label": "Small text",
                "value": "Selected"
              },
              {
                "id": "t10",
                "label": "Bold text",
                "value": "7:00 PM"
              },
              {
                "id": "t11",
                "label": "Small text",
                "value": "Available"
              },
              {
                "id": "t12",
                "label": "Bold text",
                "value": "Tomorrow"
              },
              {
                "id": "t13",
                "label": "Bold text",
                "value": "8:00 AM"
              },
              {
                "id": "t14",
                "label": "Small text",
                "value": "Unavailable"
              },
              {
                "id": "t15",
                "label": "Bold text",
                "value": "1:00 PM"
              },
              {
                "id": "t16",
                "label": "Small text",
                "value": "Available"
              },
              {
                "id": "t17",
                "label": "Bold text",
                "value": "7:00 PM"
              },
              {
                "id": "t18",
                "label": "Small text",
                "value": "Available"
              },
              {
                "id": "t19",
                "label": "Text",
                "value": "8:00 AM is for breakfast items only, so it isn't open for this order. Your meat and biryani arrive together."
              },
              {
                "id": "t20",
                "label": "Heading",
                "value": "Payment"
              },
              {
                "id": "t21",
                "label": "Label",
                "value": "UPI"
              },
              {
                "id": "t22",
                "label": "Small text",
                "value": "Any UPI app"
              },
              {
                "id": "t23",
                "label": "Label",
                "value": "Credit or debit card"
              },
              {
                "id": "t24",
                "label": "Label",
                "value": "Cash on delivery"
              },
              {
                "id": "t25",
                "label": "Heading",
                "value": "Order summary"
              },
              {
                "id": "t26",
                "label": "Text",
                "value": "Chicken Curry Cut, 500 g × 2"
              },
              {
                "id": "t27",
                "label": "Text",
                "value": "₹378"
              },
              {
                "id": "t28",
                "label": "Text",
                "value": "Boneless Chicken, 500 g × 1"
              },
              {
                "id": "t29",
                "label": "Text",
                "value": "₹259"
              },
              {
                "id": "t30",
                "label": "Text",
                "value": "Mutton Curry Cut, 500 g × 1"
              },
              {
                "id": "t31",
                "label": "Text",
                "value": "₹449"
              },
              {
                "id": "t32",
                "label": "Text",
                "value": "Chicken Biryani, Serves 1 × 2"
              },
              {
                "id": "t33",
                "label": "Text",
                "value": "₹498"
              },
              {
                "id": "t34",
                "label": "Text",
                "value": "Items (6)"
              },
              {
                "id": "t35",
                "label": "Text",
                "value": "₹1,584"
              },
              {
                "id": "t36",
                "label": "Text",
                "value": "Delivery fee"
              },
              {
                "id": "t37",
                "label": "Text",
                "value": "₹29"
              },
              {
                "id": "t38",
                "label": "Text",
                "value": "Total"
              },
              {
                "id": "t39",
                "label": "Text",
                "value": "₹1,613"
              },
              {
                "id": "t40",
                "label": "Text",
                "value": "Delivering"
              },
              {
                "id": "t41",
                "label": "Bold text",
                "value": "Today, 1:00 PM"
              },
              {
                "id": "t42",
                "label": "Text",
                "value": "Place order"
              },
              {
                "id": "t43",
                "label": "Text",
                "value": "₹1,613"
              }
            ],
            "title": "Choose delivery time",
            "mediaSlots": []
          },
          "type": "imported_html",
          "hidden": false,
          "settings": {
            "background": "default",
            "hideOnMobile": false
          }
        }
      ],
      "showInNav": true
    },
    {
      "name": "Chicken",
      "slug": "/chicken",
      "pageType": "CUSTOM",
      "sections": [
        {
          "data": {
            "css": "@import url(\"https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap\");\n.wb-site .wbi-a735d8524cc0{--bg:#FBF7EF;--card:#FFFFFF;--line:#EAE2D3;--line-2:#D9CFBD;--ink:#1C1C1A;--ink-2:#3F3B34;--muted:#5F5A50;--off:#6E685D;--green:#1F4D3A;--green-2:#2C6550;--green-soft:#E3EDE6;--green-ink:#CFE3D6;--chip:#F1ECE2;--veg:#2E7D32;--nonveg:#8B2E1A;--radius:16px;--wrap:1240px}\n.wb-site .wbi-a735d8524cc0 *{box-sizing:border-box;min-width:0}\n.wb-site .wbi-a735d8524cc0{-webkit-text-size-adjust:100%}\n.wb-site .wbi-a735d8524cc0{background:var(--bg);color:var(--ink);font:15px/1.5 'Plus Jakarta Sans',system-ui,sans-serif}\n.wb-site .wbi-a735d8524cc0 a{color:var(--green);text-decoration:none}\n.wb-site .wbi-a735d8524cc0 a:hover{color:#163a2b}\n.wb-site .wbi-a735d8524cc0 h1{margin:0;line-height:1.2}\n.wb-site .wbi-a735d8524cc0 :focus-visible{outline:3px solid #8FB8A0;outline-offset:2px;border-radius:6px}\n.wb-site .wbi-a735d8524cc0 .wrap{max-width:var(--wrap);margin:0 auto;padding-inline:16px}\n.wb-site .wbi-a735d8524cc0 main{padding-top:20px;padding-bottom:40px;display:flex;flex-direction:column;gap:28px}\n.wb-site .wbi-a735d8524cc0 .page-title{display:flex;flex-direction:column;gap:4px}\n.wb-site .wbi-a735d8524cc0 .page-title h1{font-size:26px;font-weight:700}\n.wb-site .wbi-a735d8524cc0 .crumbs{font-size:13px;color:var(--muted)}\n.wb-site .wbi-a735d8524cc0 .note{display:flex;gap:10px;align-items:center;padding:11px 14px;border-radius:12px;background:var(--green-soft);color:var(--green);font-size:14px}\n.wb-site .wbi-a735d8524cc0 .note svg{flex:none}\n.wb-site .wbi-a735d8524cc0 .toolbar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px}\n@container wb-site (min-width:600px){.wb-site .wbi-a735d8524cc0 .wrap{padding-inline:24px}}\n@container wb-site (min-width:960px){.wb-site .wbi-a735d8524cc0 .wrap{padding-inline:32px}\n.wb-site .wbi-a735d8524cc0 main{padding-top:28px;padding-bottom:56px;gap:40px}\n.wb-site .wbi-a735d8524cc0 .page-title h1{font-size:32px}}",
            "html": "<div data-wb-import-spacing=\"\" style=\"padding-top:28px;padding-bottom:0px\"><main class=\"wrap\" style=\"margin-top:0;margin-bottom:0;padding-top:0;padding-bottom:0;min-height:0;height:auto\" data-wb-import-ancestor=\"\"><div class=\"toolbar\">\n    <div class=\"page-title\">\n      <span class=\"crumbs\" data-wb-text-id=\"t0\"><a href=\"/\" data-wb-text-id=\"t1\">Home</a> / Fresh meat / Chicken</span>\n      <h1 data-wb-text-id=\"t2\">Chicken</h1>\n    </div>\n    <div class=\"note\"><svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1F4D3A\" stroke-width=\"2\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"9\"></circle><path d=\"M12 7v5l3 2\"></path></svg><span data-wb-text-id=\"t3\">Next delivery <strong data-wb-text-id=\"t4\">Today, 1:00 PM</strong></span></div>\n  </div></main></div>",
            "scope": "wbi-a735d8524cc0",
            "texts": [
              {
                "id": "t0",
                "label": "Text",
                "value": "/ Fresh meat / Chicken"
              },
              {
                "id": "t1",
                "label": "Link",
                "value": "Home"
              },
              {
                "id": "t2",
                "label": "Heading",
                "value": "Chicken"
              },
              {
                "id": "t3",
                "label": "Text",
                "value": "Next delivery"
              },
              {
                "id": "t4",
                "label": "Bold text",
                "value": "Today, 1:00 PM"
              }
            ],
            "title": "Chicken",
            "mediaSlots": []
          },
          "type": "imported_html",
          "hidden": false,
          "settings": {
            "background": "default",
            "hideOnMobile": false
          }
        },
        {
          "data": {
            "css": "@import url(\"https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap\");\n.wb-site .wbi-a735d8f72efc{--bg:#FBF7EF;--card:#FFFFFF;--line:#EAE2D3;--line-2:#D9CFBD;--ink:#1C1C1A;--ink-2:#3F3B34;--muted:#5F5A50;--off:#6E685D;--green:#1F4D3A;--green-2:#2C6550;--green-soft:#E3EDE6;--green-ink:#CFE3D6;--chip:#F1ECE2;--veg:#2E7D32;--nonveg:#8B2E1A;--radius:16px;--wrap:1240px}\n.wb-site .wbi-a735d8f72efc *{box-sizing:border-box;min-width:0}\n.wb-site .wbi-a735d8f72efc{-webkit-text-size-adjust:100%}\n.wb-site .wbi-a735d8f72efc{background:var(--bg);color:var(--ink);font:15px/1.5 'Plus Jakarta Sans',system-ui,sans-serif}\n.wb-site .wbi-a735d8f72efc a{color:var(--green);text-decoration:none}\n.wb-site .wbi-a735d8f72efc a:hover{color:#163a2b}\n.wb-site .wbi-a735d8f72efc img{display:block;max-width:100%}\n.wb-site .wbi-a735d8f72efc button{font:inherit;color:inherit}\n.wb-site .wbi-a735d8f72efc h3{margin:0;line-height:1.2}\n.wb-site .wbi-a735d8f72efc :focus-visible{outline:3px solid #8FB8A0;outline-offset:2px;border-radius:6px}\n.wb-site .wbi-a735d8f72efc .wrap{max-width:var(--wrap);margin:0 auto;padding-inline:16px}\n.wb-site .wbi-a735d8f72efc .muted{color:var(--muted)}\n.wb-site .wbi-a735d8f72efc main{padding-top:20px;padding-bottom:40px;display:flex;flex-direction:column;gap:28px}\n.wb-site .wbi-a735d8f72efc .sec{display:flex;flex-direction:column;gap:12px}\n.wb-site .wbi-a735d8f72efc .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}\n.wb-site .wbi-a735d8f72efc .card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);overflow:hidden;display:flex;flex-direction:column}\n.wb-site .wbi-a735d8f72efc .card>img{width:100%;aspect-ratio:4/3;object-fit:cover}\n.wb-site .wbi-a735d8f72efc .card .body{padding:10px 12px 12px;display:flex;flex-direction:column;gap:5px;flex:1}\n.wb-site .wbi-a735d8f72efc .card .name{font-size:15px;font-weight:700;line-height:1.3;display:flex;gap:8px;align-items:flex-start}\n.wb-site .wbi-a735d8f72efc .card .desc{font-size:12px;color:var(--muted)}\n.wb-site .wbi-a735d8f72efc .card .foot{display:flex;align-items:flex-end;justify-content:space-between;gap:8px;margin-top:auto;padding-top:6px}\n.wb-site .wbi-a735d8f72efc .card .wt{font-size:12px;color:var(--muted);display:block}\n.wb-site .wbi-a735d8f72efc .card .price{font-size:17px;font-weight:700}\n.wb-site .wbi-a735d8f72efc .tag{font-size:11px;font-weight:600;color:var(--green);background:var(--green-soft);align-self:flex-start;padding:3px 8px;border-radius:6px}\n.wb-site .wbi-a735d8f72efc .grid.rows{grid-template-columns:1fr}\n.wb-site .wbi-a735d8f72efc .grid.rows .card{flex-direction:row;gap:12px;padding:12px}\n.wb-site .wbi-a735d8f72efc .grid.rows .card>img{width:112px;height:112px;aspect-ratio:auto;border-radius:12px;flex:none}\n.wb-site .wbi-a735d8f72efc .grid.rows .card .body{padding:0}\n.wb-site .wbi-a735d8f72efc .btn-add{all:unset;cursor:pointer;box-sizing:border-box;height:38px;padding:0 18px;border-radius:10px;border:1.5px solid var(--green);color:var(--green);font-size:14px;font-weight:700;line-height:35px;text-align:center}\n.wb-site .wbi-a735d8f72efc .btn-add:hover{background:var(--green-soft)}\n.wb-site .wbi-a735d8f72efc .stepper{display:flex;align-items:center;height:38px;border-radius:10px;background:var(--green);color:#fff}\n.wb-site .wbi-a735d8f72efc .stepper button{all:unset;cursor:pointer;width:36px;height:100%;text-align:center;font-size:18px;font-weight:700}\n.wb-site .wbi-a735d8f72efc .stepper output{min-width:16px;text-align:center;font-size:14px;font-weight:700}\n.wb-site .wbi-a735d8f72efc .seg{display:inline-flex;border:1px solid var(--line-2);border-radius:8px;overflow:hidden;align-self:flex-start}\n.wb-site .wbi-a735d8f72efc .seg button{all:unset;cursor:pointer;height:30px;padding:0 10px;font-size:12px;font-weight:600;line-height:30px;background:var(--card)}\n.wb-site .wbi-a735d8f72efc .seg button[aria-pressed=true]{background:var(--green);color:#fff;font-weight:700}\n.wb-site .wbi-a735d8f72efc .chips{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none}\n.wb-site .wbi-a735d8f72efc .chips::-webkit-scrollbar{display:none}\n.wb-site .wbi-a735d8f72efc .chip{flex:none;display:inline-flex;align-items:center;height:40px;padding:0 16px;border-radius:20px;border:1px solid var(--line-2);background:var(--card);color:var(--ink);font-size:14px;font-weight:600}\n.wb-site .wbi-a735d8f72efc .chip[aria-current], .wb-site .wbi-a735d8f72efc .chip[aria-pressed=true]{background:var(--green);border-color:var(--green);color:#fff;font-weight:700}\n.wb-site .wbi-a735d8f72efc .chip.sm{height:32px;padding:0 12px;border-radius:8px;border:0;background:var(--chip);font-size:13px;cursor:pointer}\n.wb-site .wbi-a735d8f72efc .chip.sm[aria-pressed=true]{background:var(--ink);color:#fff}\n.wb-site .wbi-a735d8f72efc .sidebar{display:none}\n.wb-site .wbi-a735d8f72efc .sidebar nav{display:flex;flex-direction:column;gap:2px}\n.wb-site .wbi-a735d8f72efc .sidebar h3{font-size:12px;font-weight:700;color:var(--muted);margin:14px 0 6px}\n.wb-site .wbi-a735d8f72efc .sidebar h3:first-child{margin-top:0}\n.wb-site .wbi-a735d8f72efc .sidebar nav a{padding:9px 12px;border-radius:10px;color:var(--ink);font-size:14px;font-weight:600}\n.wb-site .wbi-a735d8f72efc .sidebar nav a[aria-current]{background:var(--green);color:#fff}\n.wb-site .wbi-a735d8f72efc .sidebar fieldset{border:0;margin:16px 0 0;padding:16px 0 0;border-top:1px solid var(--line);display:flex;flex-direction:column;gap:10px}\n.wb-site .wbi-a735d8f72efc .sidebar legend{font-size:14px;font-weight:700;padding:0;margin-bottom:8px;float:left;width:100%}\n.wb-site .wbi-a735d8f72efc .sidebar label{display:flex;align-items:center;gap:10px;font-size:14px}\n.wb-site .wbi-a735d8f72efc input[type=checkbox]{accent-color:var(--green);width:18px;height:18px;margin:0}\n.wb-site .wbi-a735d8f72efc .toolbar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px}\n@container wb-site (min-width:600px){.wb-site .wbi-a735d8f72efc .wrap{padding-inline:24px}\n.wb-site .wbi-a735d8f72efc .grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}\n.wb-site .wbi-a735d8f72efc .grid.rows{grid-template-columns:repeat(2,minmax(0,1fr))}}\n@container wb-site (min-width:960px){.wb-site .wbi-a735d8f72efc .wrap{padding-inline:32px}\n.wb-site .wbi-a735d8f72efc main{padding-top:28px;padding-bottom:56px;gap:40px}\n.wb-site .wbi-a735d8f72efc .grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}\n.wb-site .wbi-a735d8f72efc .card .body{padding:14px 16px 16px}\n.wb-site .wbi-a735d8f72efc .card .name{font-size:16px}\n.wb-site .wbi-a735d8f72efc .card .price{font-size:18px}\n.wb-site .wbi-a735d8f72efc .with-sidebar{display:grid;grid-template-columns:260px minmax(0,1fr);gap:28px;align-items:start}\n.wb-site .wbi-a735d8f72efc .sidebar{display:block;background:var(--card);border:1px solid var(--line);border-radius:18px;padding:20px;position:sticky;top:150px}\n.wb-site .wbi-a735d8f72efc .mobile-only{display:none!important}\n.wb-site .wbi-a735d8f72efc .grid.rows{grid-template-columns:repeat(3,minmax(0,1fr))}\n.wb-site .wbi-a735d8f72efc .grid.rows .card{flex-direction:column;padding:0;gap:0}\n.wb-site .wbi-a735d8f72efc .grid.rows .card>img{width:100%;height:auto;aspect-ratio:4/3;border-radius:0}\n.wb-site .wbi-a735d8f72efc .grid.rows .card .body{padding:14px 16px 16px}}\n@media (prefers-reduced-motion:no-preference){.wb-site .wbi-a735d8f72efc .card{transition:transform .15s ease,box-shadow .15s ease}\n.wb-site .wbi-a735d8f72efc .card:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(60,45,25,.08)}}",
            "html": "<div data-wb-import-spacing=\"\" style=\"padding-top:40px;padding-bottom:56px\"><main class=\"wrap\" style=\"margin-top:0;margin-bottom:0;padding-top:0;padding-bottom:0;min-height:0;height:auto\" data-wb-import-ancestor=\"\"><div class=\"with-sidebar\">\n    <aside class=\"sidebar\" aria-label=\"Browse and filter\">\n      <nav aria-label=\"Categories\">\n        <h3 data-wb-text-id=\"t0\">Fresh meat</h3>\n        <a href=\"/chicken\" aria-current=\"page\" data-wb-text-id=\"t1\">Chicken</a><a href=\"#\" data-wb-text-id=\"t2\">Mutton</a><a href=\"#\" data-wb-text-id=\"t3\">Beef</a>\n        <h3 data-wb-text-id=\"t4\">Ready to eat</h3>\n        <a href=\"/ready-to-eat#breakfast\" data-wb-text-id=\"t5\">Breakfast</a><a href=\"/ready-to-eat#meals\" data-wb-text-id=\"t6\">Meals</a><a href=\"/ready-to-eat#biryani\" data-wb-text-id=\"t7\">Biryani</a>\n      </nav>\n      <fieldset><legend data-wb-text-id=\"t8\">Type</legend>\n        <label data-wb-text-id=\"t9\"><input type=\"checkbox\" checked=\"\">Bone-in</label>\n        <label data-wb-text-id=\"t10\"><input type=\"checkbox\" checked=\"\">Boneless</label>\n      </fieldset>\n      <fieldset><legend data-wb-text-id=\"t11\">Pack size</legend>\n        <label data-wb-text-id=\"t12\"><input type=\"checkbox\" checked=\"\">Up to 500 g</label>\n        <label data-wb-text-id=\"t13\"><input type=\"checkbox\">1 kg</label>\n      </fieldset>\n    </aside>\n\n    <section class=\"sec\" aria-label=\"Products\">\n      <div class=\"chips mobile-only\">\n        <a class=\"chip\" href=\"/chicken\" aria-current=\"page\" data-wb-text-id=\"t14\">Chicken</a><a class=\"chip\" href=\"#\" data-wb-text-id=\"t15\">Mutton</a><a class=\"chip\" href=\"#\" data-wb-text-id=\"t16\">Beef</a>\n      </div>\n      <div class=\"toolbar\">\n        <div class=\"chips mobile-only\" data-single=\"\" role=\"group\" aria-label=\"Filter by type\">\n          <button type=\"button\" class=\"chip sm\" aria-pressed=\"true\" data-wb-text-id=\"t17\">All</button>\n          <button type=\"button\" class=\"chip sm\" aria-pressed=\"false\" data-wb-text-id=\"t18\">Bone-in</button>\n          <button type=\"button\" class=\"chip sm\" aria-pressed=\"false\" data-wb-text-id=\"t19\">Boneless</button>\n        </div>\n        <span class=\"muted\" style=\"font-size:13px\" data-wb-text-id=\"t20\">5 cuts</span>\n      </div>\n\n      <div class=\"grid rows\">\n        <article class=\"card\"><img src=\"{{ARA_ASSETS}}/chicken-curry.png\" alt=\"Chicken Curry Cut, packed tray\" data-wb-media-key=\"m0\">\n          <div class=\"body\"><span class=\"name\" data-wb-text-id=\"t21\">Chicken Curry Cut</span><span class=\"desc\" data-wb-text-id=\"t22\">Skinless, cleaned, 12–16 pieces</span>\n            <div class=\"seg\" role=\"group\" aria-label=\"Bone type\"><button type=\"button\" aria-pressed=\"true\" data-wb-text-id=\"t23\">Bone-in</button><button type=\"button\" aria-pressed=\"false\" data-wb-text-id=\"t24\">Boneless</button></div>\n            <div class=\"foot\"><div><span class=\"wt\" data-wb-text-id=\"t25\">500 g</span><span class=\"price\" data-wb-text-id=\"t26\">₹189</span></div>\n              <div class=\"stepper\"><button type=\"button\" aria-label=\"Remove one\" data-dec=\"\">−</button><output data-wb-text-id=\"t27\">2</output><button type=\"button\" aria-label=\"Add one\" data-inc=\"\">+</button></div></div></div></article>\n        <article class=\"card\"><img src=\"{{ARA_ASSETS}}/chicken-boneless.png\" alt=\"Boneless Chicken, packed tray\" data-wb-media-key=\"m1\">\n          <div class=\"body\"><span class=\"name\" data-wb-text-id=\"t28\">Boneless Chicken</span><span class=\"desc\" data-wb-text-id=\"t29\">Bite-size cubes from thigh &amp; breast</span><span class=\"tag\" data-wb-text-id=\"t30\">Boneless</span>\n            <div class=\"foot\"><div><span class=\"wt\" data-wb-text-id=\"t31\">500 g</span><span class=\"price\" data-wb-text-id=\"t32\">₹259</span></div>\n              <div class=\"stepper\"><button type=\"button\" aria-label=\"Remove one\" data-dec=\"\">−</button><output data-wb-text-id=\"t33\">1</output><button type=\"button\" aria-label=\"Add one\" data-inc=\"\">+</button></div></div></div></article>\n        <article class=\"card\"><img src=\"{{ARA_ASSETS}}/chicken-breast.png\" alt=\"Chicken Breast, packed tray\" data-wb-media-key=\"m2\">\n          <div class=\"body\"><span class=\"name\" data-wb-text-id=\"t34\">Chicken Breast</span><span class=\"desc\" data-wb-text-id=\"t35\">Whole fillets, skinless</span>\n            <div class=\"seg\" role=\"group\" aria-label=\"Bone type\"><button type=\"button\" aria-pressed=\"false\" data-wb-text-id=\"t36\">Bone-in</button><button type=\"button\" aria-pressed=\"true\" data-wb-text-id=\"t37\">Boneless</button></div>\n            <div class=\"foot\"><div><span class=\"wt\" data-wb-text-id=\"t38\">450 g</span><span class=\"price\" data-wb-text-id=\"t39\">₹279</span></div><button type=\"button\" class=\"btn-add\" data-wb-text-id=\"t40\">Add</button></div></div></article>\n        <article class=\"card\"><img src=\"{{ARA_ASSETS}}/chicken-drumstick.png\" alt=\"Chicken Drumsticks, packed tray\" data-wb-media-key=\"m3\">\n          <div class=\"body\"><span class=\"name\" data-wb-text-id=\"t41\">Chicken Drumsticks</span><span class=\"desc\" data-wb-text-id=\"t42\">Skinless, 6 pieces</span><span class=\"tag\" data-wb-text-id=\"t43\">Bone-in</span>\n            <div class=\"foot\"><div><span class=\"wt\" data-wb-text-id=\"t44\">450 g</span><span class=\"price\" data-wb-text-id=\"t45\">₹219</span></div><button type=\"button\" class=\"btn-add\" data-wb-text-id=\"t46\">Add</button></div></div></article>\n        <article class=\"card\"><img src=\"{{ARA_ASSETS}}/chicken-keema.png\" alt=\"Chicken Keema, packed tray\" data-wb-media-key=\"m4\">\n          <div class=\"body\"><span class=\"name\" data-wb-text-id=\"t47\">Chicken Keema</span><span class=\"desc\" data-wb-text-id=\"t48\">Freshly minced</span>\n            <div class=\"foot\"><div><span class=\"wt\" data-wb-text-id=\"t49\">450 g</span><span class=\"price\" data-wb-text-id=\"t50\">₹249</span></div><button type=\"button\" class=\"btn-add\" data-wb-text-id=\"t51\">Add</button></div></div></article>\n      </div>\n    </section>\n  </div></main></div>",
            "scope": "wbi-a735d8f72efc",
            "texts": [
              {
                "id": "t0",
                "label": "Subheading",
                "value": "Fresh meat"
              },
              {
                "id": "t1",
                "label": "Link",
                "value": "Chicken"
              },
              {
                "id": "t2",
                "label": "Link",
                "value": "Mutton"
              },
              {
                "id": "t3",
                "label": "Link",
                "value": "Beef"
              },
              {
                "id": "t4",
                "label": "Subheading",
                "value": "Ready to eat"
              },
              {
                "id": "t5",
                "label": "Link",
                "value": "Breakfast"
              },
              {
                "id": "t6",
                "label": "Link",
                "value": "Meals"
              },
              {
                "id": "t7",
                "label": "Link",
                "value": "Biryani"
              },
              {
                "id": "t8",
                "label": "Text",
                "value": "Type"
              },
              {
                "id": "t9",
                "label": "Label",
                "value": "Bone-in"
              },
              {
                "id": "t10",
                "label": "Label",
                "value": "Boneless"
              },
              {
                "id": "t11",
                "label": "Text",
                "value": "Pack size"
              },
              {
                "id": "t12",
                "label": "Label",
                "value": "Up to 500 g"
              },
              {
                "id": "t13",
                "label": "Label",
                "value": "1 kg"
              },
              {
                "id": "t14",
                "label": "Link",
                "value": "Chicken"
              },
              {
                "id": "t15",
                "label": "Link",
                "value": "Mutton"
              },
              {
                "id": "t16",
                "label": "Link",
                "value": "Beef"
              },
              {
                "id": "t17",
                "label": "Button",
                "value": "All"
              },
              {
                "id": "t18",
                "label": "Button",
                "value": "Bone-in"
              },
              {
                "id": "t19",
                "label": "Button",
                "value": "Boneless"
              },
              {
                "id": "t20",
                "label": "Text",
                "value": "5 cuts"
              },
              {
                "id": "t21",
                "label": "Text",
                "value": "Chicken Curry Cut"
              },
              {
                "id": "t22",
                "label": "Text",
                "value": "Skinless, cleaned, 12–16 pieces"
              },
              {
                "id": "t23",
                "label": "Button",
                "value": "Bone-in"
              },
              {
                "id": "t24",
                "label": "Button",
                "value": "Boneless"
              },
              {
                "id": "t25",
                "label": "Text",
                "value": "500 g"
              },
              {
                "id": "t26",
                "label": "Text",
                "value": "₹189"
              },
              {
                "id": "t27",
                "label": "Text",
                "value": "2"
              },
              {
                "id": "t28",
                "label": "Text",
                "value": "Boneless Chicken"
              },
              {
                "id": "t29",
                "label": "Text",
                "value": "Bite-size cubes from thigh & breast"
              },
              {
                "id": "t30",
                "label": "Text",
                "value": "Boneless"
              },
              {
                "id": "t31",
                "label": "Text",
                "value": "500 g"
              },
              {
                "id": "t32",
                "label": "Text",
                "value": "₹259"
              },
              {
                "id": "t33",
                "label": "Text",
                "value": "1"
              },
              {
                "id": "t34",
                "label": "Text",
                "value": "Chicken Breast"
              },
              {
                "id": "t35",
                "label": "Text",
                "value": "Whole fillets, skinless"
              },
              {
                "id": "t36",
                "label": "Button",
                "value": "Bone-in"
              },
              {
                "id": "t37",
                "label": "Button",
                "value": "Boneless"
              },
              {
                "id": "t38",
                "label": "Text",
                "value": "450 g"
              },
              {
                "id": "t39",
                "label": "Text",
                "value": "₹279"
              },
              {
                "id": "t40",
                "label": "Button",
                "value": "Add"
              },
              {
                "id": "t41",
                "label": "Text",
                "value": "Chicken Drumsticks"
              },
              {
                "id": "t42",
                "label": "Text",
                "value": "Skinless, 6 pieces"
              },
              {
                "id": "t43",
                "label": "Text",
                "value": "Bone-in"
              },
              {
                "id": "t44",
                "label": "Text",
                "value": "450 g"
              },
              {
                "id": "t45",
                "label": "Text",
                "value": "₹219"
              },
              {
                "id": "t46",
                "label": "Button",
                "value": "Add"
              },
              {
                "id": "t47",
                "label": "Text",
                "value": "Chicken Keema"
              },
              {
                "id": "t48",
                "label": "Text",
                "value": "Freshly minced"
              },
              {
                "id": "t49",
                "label": "Text",
                "value": "450 g"
              },
              {
                "id": "t50",
                "label": "Text",
                "value": "₹249"
              },
              {
                "id": "t51",
                "label": "Button",
                "value": "Add"
              }
            ],
            "title": "Fresh meat",
            "mediaSlots": [
              {
                "alt": "Chicken Curry Cut, packed tray",
                "key": "m0",
                "url": "{{ARA_ASSETS}}/chicken-curry.png",
                "kind": "image"
              },
              {
                "alt": "Boneless Chicken, packed tray",
                "key": "m1",
                "url": "{{ARA_ASSETS}}/chicken-boneless.png",
                "kind": "image"
              },
              {
                "alt": "Chicken Breast, packed tray",
                "key": "m2",
                "url": "{{ARA_ASSETS}}/chicken-breast.png",
                "kind": "image"
              },
              {
                "alt": "Chicken Drumsticks, packed tray",
                "key": "m3",
                "url": "{{ARA_ASSETS}}/chicken-drumstick.png",
                "kind": "image"
              },
              {
                "alt": "Chicken Keema, packed tray",
                "key": "m4",
                "url": "{{ARA_ASSETS}}/chicken-keema.png",
                "kind": "image"
              }
            ]
          },
          "type": "imported_html",
          "hidden": false,
          "settings": {
            "background": "default",
            "hideOnMobile": false
          }
        }
      ],
      "showInNav": true
    },
    {
      "name": "Ready To Eat",
      "slug": "/ready-to-eat",
      "pageType": "CUSTOM",
      "sections": [
        {
          "data": {
            "css": "@import url(\"https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap\");\n.wb-site .wbi-a735d882d601{--bg:#FBF7EF;--card:#FFFFFF;--line:#EAE2D3;--line-2:#D9CFBD;--ink:#1C1C1A;--ink-2:#3F3B34;--muted:#5F5A50;--off:#6E685D;--green:#1F4D3A;--green-2:#2C6550;--green-soft:#E3EDE6;--green-ink:#CFE3D6;--chip:#F1ECE2;--veg:#2E7D32;--nonveg:#8B2E1A;--radius:16px;--wrap:1240px}\n.wb-site .wbi-a735d882d601 *{box-sizing:border-box;min-width:0}\n.wb-site .wbi-a735d882d601{-webkit-text-size-adjust:100%}\n.wb-site .wbi-a735d882d601{background:var(--bg);color:var(--ink);font:15px/1.5 'Plus Jakarta Sans',system-ui,sans-serif}\n.wb-site .wbi-a735d882d601 a{color:var(--green);text-decoration:none}\n.wb-site .wbi-a735d882d601 a:hover{color:#163a2b}\n.wb-site .wbi-a735d882d601 h1{margin:0;line-height:1.2}\n.wb-site .wbi-a735d882d601 :focus-visible{outline:3px solid #8FB8A0;outline-offset:2px;border-radius:6px}\n.wb-site .wbi-a735d882d601 .wrap{max-width:var(--wrap);margin:0 auto;padding-inline:16px}\n.wb-site .wbi-a735d882d601 main{padding-top:20px;padding-bottom:40px;display:flex;flex-direction:column;gap:28px}\n.wb-site .wbi-a735d882d601 .page-title{display:flex;flex-direction:column;gap:4px}\n.wb-site .wbi-a735d882d601 .page-title h1{font-size:26px;font-weight:700}\n.wb-site .wbi-a735d882d601 .crumbs{font-size:13px;color:var(--muted)}\n.wb-site .wbi-a735d882d601 .diet{flex:none;width:13px;height:13px;margin-top:3px;border:1.5px solid currentColor;border-radius:2px;display:inline-flex;align-items:center;justify-content:center}\n.wb-site .wbi-a735d882d601 .diet::after{content:\"\";width:6px;height:6px;border-radius:3px;background:currentColor}\n.wb-site .wbi-a735d882d601 .diet.veg{color:var(--veg)}\n.wb-site .wbi-a735d882d601 .diet.nonveg{color:var(--nonveg)}\n.wb-site .wbi-a735d882d601 .legend{display:flex;gap:16px;font-size:12px;color:var(--muted)}\n.wb-site .wbi-a735d882d601 .legend span{display:flex;align-items:center;gap:6px}\n.wb-site .wbi-a735d882d601 .legend .diet{margin:0}\n.wb-site .wbi-a735d882d601 .toolbar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px}\n@container wb-site (min-width:600px){.wb-site .wbi-a735d882d601 .wrap{padding-inline:24px}}\n@container wb-site (min-width:960px){.wb-site .wbi-a735d882d601 .wrap{padding-inline:32px}\n.wb-site .wbi-a735d882d601 main{padding-top:28px;padding-bottom:56px;gap:40px}\n.wb-site .wbi-a735d882d601 .page-title h1{font-size:32px}}",
            "html": "<div data-wb-import-spacing=\"\" style=\"padding-top:28px;padding-bottom:0px\"><main class=\"wrap\" style=\"margin-top:0;margin-bottom:0;padding-top:0;padding-bottom:0;min-height:0;height:auto\" data-wb-import-ancestor=\"\"><div class=\"toolbar\">\n    <div class=\"page-title\">\n      <span class=\"crumbs\" data-wb-text-id=\"t0\"><a href=\"/\" data-wb-text-id=\"t1\">Home</a> / Ready to eat</span>\n      <h1 data-wb-text-id=\"t2\">Ready to eat</h1>\n    </div>\n    <div class=\"legend\">\n      <span data-wb-text-id=\"t3\"><span class=\"diet veg\" aria-hidden=\"true\"></span>Veg</span>\n      <span data-wb-text-id=\"t4\"><span class=\"diet nonveg\" aria-hidden=\"true\"></span>Non-veg</span>\n    </div>\n  </div></main></div>",
            "scope": "wbi-a735d882d601",
            "texts": [
              {
                "id": "t0",
                "label": "Text",
                "value": "/ Ready to eat"
              },
              {
                "id": "t1",
                "label": "Link",
                "value": "Home"
              },
              {
                "id": "t2",
                "label": "Heading",
                "value": "Ready to eat"
              },
              {
                "id": "t3",
                "label": "Text",
                "value": "Veg"
              },
              {
                "id": "t4",
                "label": "Text",
                "value": "Non-veg"
              }
            ],
            "title": "Ready to eat",
            "mediaSlots": []
          },
          "type": "imported_html",
          "hidden": false,
          "settings": {
            "background": "default",
            "hideOnMobile": false
          }
        },
        {
          "data": {
            "css": "@import url(\"https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap\");\n.wb-site .wbi-a735d81e0aef{--bg:#FBF7EF;--card:#FFFFFF;--line:#EAE2D3;--line-2:#D9CFBD;--ink:#1C1C1A;--ink-2:#3F3B34;--muted:#5F5A50;--off:#6E685D;--green:#1F4D3A;--green-2:#2C6550;--green-soft:#E3EDE6;--green-ink:#CFE3D6;--chip:#F1ECE2;--veg:#2E7D32;--nonveg:#8B2E1A;--radius:16px;--wrap:1240px}\n.wb-site .wbi-a735d81e0aef *{box-sizing:border-box;min-width:0}\n.wb-site .wbi-a735d81e0aef{-webkit-text-size-adjust:100%}\n.wb-site .wbi-a735d81e0aef{background:var(--bg);color:var(--ink);font:15px/1.5 'Plus Jakarta Sans',system-ui,sans-serif}\n.wb-site .wbi-a735d81e0aef a{color:var(--green);text-decoration:none}\n.wb-site .wbi-a735d81e0aef a:hover{color:#163a2b}\n.wb-site .wbi-a735d81e0aef img{display:block;max-width:100%}\n.wb-site .wbi-a735d81e0aef button{font:inherit;color:inherit}\n.wb-site .wbi-a735d81e0aef h2, .wb-site .wbi-a735d81e0aef h3{margin:0;line-height:1.2}\n.wb-site .wbi-a735d81e0aef :focus-visible{outline:3px solid #8FB8A0;outline-offset:2px;border-radius:6px}\n.wb-site .wbi-a735d81e0aef .wrap{max-width:var(--wrap);margin:0 auto;padding-inline:16px}\n.wb-site .wbi-a735d81e0aef main{padding-top:20px;padding-bottom:40px;display:flex;flex-direction:column;gap:28px}\n.wb-site .wbi-a735d81e0aef .sec{display:flex;flex-direction:column;gap:12px}\n.wb-site .wbi-a735d81e0aef .sec-h{display:flex;align-items:baseline;justify-content:space-between;gap:12px}\n.wb-site .wbi-a735d81e0aef .sec-h h2{font-size:19px;font-weight:700}\n.wb-site .wbi-a735d81e0aef .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}\n.wb-site .wbi-a735d81e0aef .card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);overflow:hidden;display:flex;flex-direction:column}\n.wb-site .wbi-a735d81e0aef .card>img{width:100%;aspect-ratio:4/3;object-fit:cover}\n.wb-site .wbi-a735d81e0aef .card .body{padding:10px 12px 12px;display:flex;flex-direction:column;gap:5px;flex:1}\n.wb-site .wbi-a735d81e0aef .card .name{font-size:15px;font-weight:700;line-height:1.3;display:flex;gap:8px;align-items:flex-start}\n.wb-site .wbi-a735d81e0aef .card .desc{font-size:12px;color:var(--muted)}\n.wb-site .wbi-a735d81e0aef .card .foot{display:flex;align-items:flex-end;justify-content:space-between;gap:8px;margin-top:auto;padding-top:6px}\n.wb-site .wbi-a735d81e0aef .card .price{font-size:17px;font-weight:700}\n.wb-site .wbi-a735d81e0aef .tag{font-size:11px;font-weight:600;color:var(--green);background:var(--green-soft);align-self:flex-start;padding:3px 8px;border-radius:6px}\n.wb-site .wbi-a735d81e0aef .grid.rows{grid-template-columns:1fr}\n.wb-site .wbi-a735d81e0aef .grid.rows .card{flex-direction:row;gap:12px;padding:12px}\n.wb-site .wbi-a735d81e0aef .grid.rows .card>img{width:112px;height:112px;aspect-ratio:auto;border-radius:12px;flex:none}\n.wb-site .wbi-a735d81e0aef .grid.rows .card .body{padding:0}\n.wb-site .wbi-a735d81e0aef .diet{flex:none;width:13px;height:13px;margin-top:3px;border:1.5px solid currentColor;border-radius:2px;display:inline-flex;align-items:center;justify-content:center}\n.wb-site .wbi-a735d81e0aef .diet::after{content:\"\";width:6px;height:6px;border-radius:3px;background:currentColor}\n.wb-site .wbi-a735d81e0aef .diet.veg{color:var(--veg)}\n.wb-site .wbi-a735d81e0aef .diet.nonveg{color:var(--nonveg)}\n.wb-site .wbi-a735d81e0aef .btn-add{all:unset;cursor:pointer;box-sizing:border-box;height:38px;padding:0 18px;border-radius:10px;border:1.5px solid var(--green);color:var(--green);font-size:14px;font-weight:700;line-height:35px;text-align:center}\n.wb-site .wbi-a735d81e0aef .btn-add:hover{background:var(--green-soft)}\n.wb-site .wbi-a735d81e0aef .stepper{display:flex;align-items:center;height:38px;border-radius:10px;background:var(--green);color:#fff}\n.wb-site .wbi-a735d81e0aef .stepper button{all:unset;cursor:pointer;width:36px;height:100%;text-align:center;font-size:18px;font-weight:700}\n.wb-site .wbi-a735d81e0aef .stepper output{min-width:16px;text-align:center;font-size:14px;font-weight:700}\n.wb-site .wbi-a735d81e0aef .seg{display:inline-flex;border:1px solid var(--line-2);border-radius:8px;overflow:hidden;align-self:flex-start}\n.wb-site .wbi-a735d81e0aef .seg button{all:unset;cursor:pointer;height:30px;padding:0 10px;font-size:12px;font-weight:600;line-height:30px;background:var(--card)}\n.wb-site .wbi-a735d81e0aef .seg button[aria-pressed=true]{background:var(--green);color:#fff;font-weight:700}\n.wb-site .wbi-a735d81e0aef .chips{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none}\n.wb-site .wbi-a735d81e0aef .chips::-webkit-scrollbar{display:none}\n.wb-site .wbi-a735d81e0aef .chip{flex:none;display:inline-flex;align-items:center;height:40px;padding:0 16px;border-radius:20px;border:1px solid var(--line-2);background:var(--card);color:var(--ink);font-size:14px;font-weight:600}\n.wb-site .wbi-a735d81e0aef .chip[aria-pressed=true]{background:var(--green);border-color:var(--green);color:#fff;font-weight:700}\n.wb-site .wbi-a735d81e0aef .sidebar{display:none}\n.wb-site .wbi-a735d81e0aef .sidebar nav{display:flex;flex-direction:column;gap:2px}\n.wb-site .wbi-a735d81e0aef .sidebar h3{font-size:12px;font-weight:700;color:var(--muted);margin:14px 0 6px}\n.wb-site .wbi-a735d81e0aef .sidebar h3:first-child{margin-top:0}\n.wb-site .wbi-a735d81e0aef .sidebar nav a{padding:9px 12px;border-radius:10px;color:var(--ink);font-size:14px;font-weight:600}\n.wb-site .wbi-a735d81e0aef .sidebar fieldset{border:0;margin:16px 0 0;padding:16px 0 0;border-top:1px solid var(--line);display:flex;flex-direction:column;gap:10px}\n.wb-site .wbi-a735d81e0aef .sidebar legend{font-size:14px;font-weight:700;padding:0;margin-bottom:8px;float:left;width:100%}\n.wb-site .wbi-a735d81e0aef .sidebar label{display:flex;align-items:center;gap:10px;font-size:14px}\n.wb-site .wbi-a735d81e0aef input[type=checkbox]{accent-color:var(--green);width:18px;height:18px;margin:0}\n@container wb-site (min-width:600px){.wb-site .wbi-a735d81e0aef .wrap{padding-inline:24px}\n.wb-site .wbi-a735d81e0aef .grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}\n.wb-site .wbi-a735d81e0aef .grid.rows{grid-template-columns:repeat(2,minmax(0,1fr))}}\n@container wb-site (min-width:960px){.wb-site .wbi-a735d81e0aef .wrap{padding-inline:32px}\n.wb-site .wbi-a735d81e0aef main{padding-top:28px;padding-bottom:56px;gap:40px}\n.wb-site .wbi-a735d81e0aef .grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}\n.wb-site .wbi-a735d81e0aef .card .body{padding:14px 16px 16px}\n.wb-site .wbi-a735d81e0aef .card .name{font-size:16px}\n.wb-site .wbi-a735d81e0aef .card .price{font-size:18px}\n.wb-site .wbi-a735d81e0aef .with-sidebar{display:grid;grid-template-columns:260px minmax(0,1fr);gap:28px;align-items:start}\n.wb-site .wbi-a735d81e0aef .sidebar{display:block;background:var(--card);border:1px solid var(--line);border-radius:18px;padding:20px;position:sticky;top:150px}\n.wb-site .wbi-a735d81e0aef .mobile-only{display:none!important}\n.wb-site .wbi-a735d81e0aef .grid.rows{grid-template-columns:repeat(3,minmax(0,1fr))}\n.wb-site .wbi-a735d81e0aef .grid.rows .card{flex-direction:column;padding:0;gap:0}\n.wb-site .wbi-a735d81e0aef .grid.rows .card>img{width:100%;height:auto;aspect-ratio:4/3;border-radius:0}\n.wb-site .wbi-a735d81e0aef .grid.rows .card .body{padding:14px 16px 16px}}\n@media (prefers-reduced-motion:no-preference){.wb-site .wbi-a735d81e0aef .card{transition:transform .15s ease,box-shadow .15s ease}\n.wb-site .wbi-a735d81e0aef .card:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(60,45,25,.08)}}",
            "html": "<div data-wb-import-spacing=\"\" style=\"padding-top:40px;padding-bottom:56px\"><main class=\"wrap\" style=\"margin-top:0;margin-bottom:0;padding-top:0;padding-bottom:0;min-height:0;height:auto\" data-wb-import-ancestor=\"\"><div class=\"with-sidebar\">\n    <aside class=\"sidebar\" aria-label=\"Browse\">\n      <nav aria-label=\"Categories\">\n        <h3 data-wb-text-id=\"t0\">Fresh meat</h3>\n        <a href=\"/chicken\" data-wb-text-id=\"t1\">Chicken</a><a href=\"#\" data-wb-text-id=\"t2\">Mutton</a><a href=\"#\" data-wb-text-id=\"t3\">Beef</a>\n        <h3 data-wb-text-id=\"t4\">Ready to eat</h3>\n        <a href=\"#breakfast\" data-wb-text-id=\"t5\">Breakfast</a><a href=\"#meals\" data-wb-text-id=\"t6\">Meals</a><a href=\"#biryani\" data-wb-text-id=\"t7\">Biryani</a>\n      </nav>\n      <fieldset><legend data-wb-text-id=\"t8\">Diet</legend>\n        <label data-wb-text-id=\"t9\"><input type=\"checkbox\" checked=\"\">Veg</label>\n        <label data-wb-text-id=\"t10\"><input type=\"checkbox\" checked=\"\">Non-veg</label>\n      </fieldset>\n    </aside>\n\n    <div style=\"display:flex;flex-direction:column;gap:28px\">\n      <div class=\"chips mobile-only\">\n        <a class=\"chip\" href=\"#breakfast\" data-wb-text-id=\"t11\">Breakfast</a><a class=\"chip\" href=\"#meals\" data-wb-text-id=\"t12\">Meals</a><a class=\"chip\" href=\"#biryani\" data-wb-text-id=\"t13\">Biryani</a>\n      </div>\n\n      <section class=\"sec\" id=\"breakfast\">\n        <div class=\"sec-h\"><h2 data-wb-text-id=\"t14\">Breakfast</h2><span class=\"tag\" data-wb-text-id=\"t15\">8:00 AM delivery</span></div>\n        <div class=\"grid rows\">\n          <article class=\"card\"><img src=\"{{ARA_ASSETS}}/idli-vada.png\" alt=\"Idli and Vada\" data-wb-media-key=\"m0\">\n            <div class=\"body\"><span class=\"name\" data-wb-text-id=\"t16\"><span class=\"diet veg\" role=\"img\" aria-label=\"Veg\"></span>Idli &amp; Vada</span><span class=\"desc\" data-wb-text-id=\"t17\">4 idli, 1 medu vada, sambar and coconut chutney</span>\n              <div class=\"foot\"><span class=\"price\" data-wb-text-id=\"t18\">₹99</span><button type=\"button\" class=\"btn-add\" data-wb-text-id=\"t19\">Add</button></div></div></article>\n          <article class=\"card\"><img src=\"{{ARA_ASSETS}}/poori.png\" alt=\"Poori Masala\" data-wb-media-key=\"m1\">\n            <div class=\"body\"><span class=\"name\" data-wb-text-id=\"t20\"><span class=\"diet veg\" role=\"img\" aria-label=\"Veg\"></span>Poori Masala</span><span class=\"desc\" data-wb-text-id=\"t21\">3 poori with potato masala</span>\n              <div class=\"foot\"><span class=\"price\" data-wb-text-id=\"t22\">₹109</span><button type=\"button\" class=\"btn-add\" data-wb-text-id=\"t23\">Add</button></div></div></article>\n        </div>\n      </section>\n\n      <section class=\"sec\" id=\"meals\">\n        <div class=\"sec-h\"><h2 data-wb-text-id=\"t24\">Meals</h2><span class=\"tag\" data-wb-text-id=\"t25\">1:00 PM delivery</span></div>\n        <div class=\"grid rows\">\n          <article class=\"card\"><img src=\"{{ARA_ASSETS}}/veg-meals.png\" alt=\"Veg Meals\" data-wb-media-key=\"m2\">\n            <div class=\"body\"><span class=\"name\" data-wb-text-id=\"t26\"><span class=\"diet veg\" role=\"img\" aria-label=\"Veg\"></span>Veg Meals</span><span class=\"desc\" data-wb-text-id=\"t27\">Rice, dal, sambar, poriyal, curd, 2 chapati</span>\n              <div class=\"foot\"><span class=\"price\" data-wb-text-id=\"t28\">₹149</span><button type=\"button\" class=\"btn-add\" data-wb-text-id=\"t29\">Add</button></div></div></article>\n          <article class=\"card\"><img src=\"{{ARA_ASSETS}}/chicken-meals.png\" alt=\"Chicken Meals\" data-wb-media-key=\"m3\">\n            <div class=\"body\"><span class=\"name\" data-wb-text-id=\"t30\"><span class=\"diet nonveg\" role=\"img\" aria-label=\"Non-veg\"></span>Chicken Meals</span><span class=\"desc\" data-wb-text-id=\"t31\">Rice, chicken curry, dal, poriyal, curd, 2 chapati</span>\n              <div class=\"foot\"><span class=\"price\" data-wb-text-id=\"t32\">₹199</span><button type=\"button\" class=\"btn-add\" data-wb-text-id=\"t33\">Add</button></div></div></article>\n        </div>\n      </section>\n\n      <section class=\"sec\" id=\"biryani\">\n        <div class=\"sec-h\"><h2 data-wb-text-id=\"t34\">Biryani</h2><span class=\"tag\" data-wb-text-id=\"t35\">1:00 PM or 7:00 PM</span></div>\n        <div class=\"grid rows\">\n          <article class=\"card\"><img src=\"{{ARA_ASSETS}}/chicken-biryani.png\" alt=\"Chicken Biryani\" data-wb-media-key=\"m4\">\n            <div class=\"body\"><span class=\"name\" data-wb-text-id=\"t36\"><span class=\"diet nonveg\" role=\"img\" aria-label=\"Non-veg\"></span>Chicken Biryani</span><span class=\"desc\" data-wb-text-id=\"t37\">Dum biryani with raita and salan</span>\n              <div class=\"seg\" role=\"group\" aria-label=\"Portion\"><button type=\"button\" aria-pressed=\"true\" data-wb-text-id=\"t38\">Serves 1</button><button type=\"button\" aria-pressed=\"false\" data-wb-text-id=\"t39\">Serves 2</button></div>\n              <div class=\"foot\"><span class=\"price\" data-wb-text-id=\"t40\">₹249</span>\n                <div class=\"stepper\"><button type=\"button\" aria-label=\"Remove one\" data-dec=\"\">−</button><output data-wb-text-id=\"t41\">2</output><button type=\"button\" aria-label=\"Add one\" data-inc=\"\">+</button></div></div></div></article>\n          <article class=\"card\"><img src=\"{{ARA_ASSETS}}/mutton-biryani.png\" alt=\"Mutton Biryani\" data-wb-media-key=\"m5\">\n            <div class=\"body\"><span class=\"name\" data-wb-text-id=\"t42\"><span class=\"diet nonveg\" role=\"img\" aria-label=\"Non-veg\"></span>Mutton Biryani</span><span class=\"desc\" data-wb-text-id=\"t43\">Dum biryani with raita and salan</span>\n              <div class=\"seg\" role=\"group\" aria-label=\"Portion\"><button type=\"button\" aria-pressed=\"true\" data-wb-text-id=\"t44\">Serves 1</button><button type=\"button\" aria-pressed=\"false\" data-wb-text-id=\"t45\">Serves 2</button></div>\n              <div class=\"foot\"><span class=\"price\" data-wb-text-id=\"t46\">₹329</span><button type=\"button\" class=\"btn-add\" data-wb-text-id=\"t47\">Add</button></div></div></article>\n        </div>\n      </section>\n    </div>\n  </div></main></div>",
            "scope": "wbi-a735d81e0aef",
            "texts": [
              {
                "id": "t0",
                "label": "Subheading",
                "value": "Fresh meat"
              },
              {
                "id": "t1",
                "label": "Link",
                "value": "Chicken"
              },
              {
                "id": "t2",
                "label": "Link",
                "value": "Mutton"
              },
              {
                "id": "t3",
                "label": "Link",
                "value": "Beef"
              },
              {
                "id": "t4",
                "label": "Subheading",
                "value": "Ready to eat"
              },
              {
                "id": "t5",
                "label": "Link",
                "value": "Breakfast"
              },
              {
                "id": "t6",
                "label": "Link",
                "value": "Meals"
              },
              {
                "id": "t7",
                "label": "Link",
                "value": "Biryani"
              },
              {
                "id": "t8",
                "label": "Text",
                "value": "Diet"
              },
              {
                "id": "t9",
                "label": "Label",
                "value": "Veg"
              },
              {
                "id": "t10",
                "label": "Label",
                "value": "Non-veg"
              },
              {
                "id": "t11",
                "label": "Link",
                "value": "Breakfast"
              },
              {
                "id": "t12",
                "label": "Link",
                "value": "Meals"
              },
              {
                "id": "t13",
                "label": "Link",
                "value": "Biryani"
              },
              {
                "id": "t14",
                "label": "Heading",
                "value": "Breakfast"
              },
              {
                "id": "t15",
                "label": "Text",
                "value": "8:00 AM delivery"
              },
              {
                "id": "t16",
                "label": "Text",
                "value": "Idli & Vada"
              },
              {
                "id": "t17",
                "label": "Text",
                "value": "4 idli, 1 medu vada, sambar and coconut chutney"
              },
              {
                "id": "t18",
                "label": "Text",
                "value": "₹99"
              },
              {
                "id": "t19",
                "label": "Button",
                "value": "Add"
              },
              {
                "id": "t20",
                "label": "Text",
                "value": "Poori Masala"
              },
              {
                "id": "t21",
                "label": "Text",
                "value": "3 poori with potato masala"
              },
              {
                "id": "t22",
                "label": "Text",
                "value": "₹109"
              },
              {
                "id": "t23",
                "label": "Button",
                "value": "Add"
              },
              {
                "id": "t24",
                "label": "Heading",
                "value": "Meals"
              },
              {
                "id": "t25",
                "label": "Text",
                "value": "1:00 PM delivery"
              },
              {
                "id": "t26",
                "label": "Text",
                "value": "Veg Meals"
              },
              {
                "id": "t27",
                "label": "Text",
                "value": "Rice, dal, sambar, poriyal, curd, 2 chapati"
              },
              {
                "id": "t28",
                "label": "Text",
                "value": "₹149"
              },
              {
                "id": "t29",
                "label": "Button",
                "value": "Add"
              },
              {
                "id": "t30",
                "label": "Text",
                "value": "Chicken Meals"
              },
              {
                "id": "t31",
                "label": "Text",
                "value": "Rice, chicken curry, dal, poriyal, curd, 2 chapati"
              },
              {
                "id": "t32",
                "label": "Text",
                "value": "₹199"
              },
              {
                "id": "t33",
                "label": "Button",
                "value": "Add"
              },
              {
                "id": "t34",
                "label": "Heading",
                "value": "Biryani"
              },
              {
                "id": "t35",
                "label": "Text",
                "value": "1:00 PM or 7:00 PM"
              },
              {
                "id": "t36",
                "label": "Text",
                "value": "Chicken Biryani"
              },
              {
                "id": "t37",
                "label": "Text",
                "value": "Dum biryani with raita and salan"
              },
              {
                "id": "t38",
                "label": "Button",
                "value": "Serves 1"
              },
              {
                "id": "t39",
                "label": "Button",
                "value": "Serves 2"
              },
              {
                "id": "t40",
                "label": "Text",
                "value": "₹249"
              },
              {
                "id": "t41",
                "label": "Text",
                "value": "2"
              },
              {
                "id": "t42",
                "label": "Text",
                "value": "Mutton Biryani"
              },
              {
                "id": "t43",
                "label": "Text",
                "value": "Dum biryani with raita and salan"
              },
              {
                "id": "t44",
                "label": "Button",
                "value": "Serves 1"
              },
              {
                "id": "t45",
                "label": "Button",
                "value": "Serves 2"
              },
              {
                "id": "t46",
                "label": "Text",
                "value": "₹329"
              },
              {
                "id": "t47",
                "label": "Button",
                "value": "Add"
              }
            ],
            "title": "Fresh meat",
            "mediaSlots": [
              {
                "alt": "Idli and Vada",
                "key": "m0",
                "url": "{{ARA_ASSETS}}/idli-vada.png",
                "kind": "image"
              },
              {
                "alt": "Poori Masala",
                "key": "m1",
                "url": "{{ARA_ASSETS}}/poori.png",
                "kind": "image"
              },
              {
                "alt": "Veg Meals",
                "key": "m2",
                "url": "{{ARA_ASSETS}}/veg-meals.png",
                "kind": "image"
              },
              {
                "alt": "Chicken Meals",
                "key": "m3",
                "url": "{{ARA_ASSETS}}/chicken-meals.png",
                "kind": "image"
              },
              {
                "alt": "Chicken Biryani",
                "key": "m4",
                "url": "{{ARA_ASSETS}}/chicken-biryani.png",
                "kind": "image"
              },
              {
                "alt": "Mutton Biryani",
                "key": "m5",
                "url": "{{ARA_ASSETS}}/mutton-biryani.png",
                "kind": "image"
              }
            ]
          },
          "type": "imported_html",
          "hidden": false,
          "settings": {
            "background": "default",
            "hideOnMobile": false
          }
        }
      ],
      "showInNav": true
    }
  ]
};

const site = JSON.parse(JSON.stringify(DATA).replaceAll("{{ARA_ASSETS}}", ASSETS)) as {
  header: TemplateHeader;
  footer: TemplateFooter;
  pages: TemplatePage[];
};

/** Built-in "ARA Shops" fresh meat and ready-to-eat delivery template (exact imported design). */
export const ARA_SHOPS_EXACT: WebsiteTemplateSeed = {
  key: "ara-shops-exact",
  name: "ARA Shops",
  category: "E-commerce",
  description:
    "ARA Shops fresh meat and ready-to-eat delivery design, kept exactly as supplied: delivery-slot banner, fresh meat and kitchen tiles, popular cuts, hot-from-the-kitchen products, cart and checkout pages.",
  themeName: ARA_SHOPS_EXACT_THEME.name,
  header: site.header,
  footer: site.footer,
  pages: site.pages,
};
