export const SHOP_ORDER_EMAIL_LAYOUTS = ["classic", "bold", "minimal", "banner", "postcard"] as const;
export type ShopOrderEmailLayout = (typeof SHOP_ORDER_EMAIL_LAYOUTS)[number];

export const SHOP_ORDER_EMAIL_LAYOUT_META: Record<
  ShopOrderEmailLayout,
  { label: string; description: string; defaultAccent: string }
> = {
  classic: {
    label: "Classic",
    description: "Clean white card with a coloured accent bar",
    defaultAccent: "#194a7a",
  },
  bold: {
    label: "Bold header",
    description: "Full-colour header with white body",
    defaultAccent: "#0f7b6c",
  },
  minimal: {
    label: "Minimal",
    description: "Simple and airy, soft accent only",
    defaultAccent: "#1a1d23",
  },
  banner: {
    label: "Banner",
    description: "Wide top banner and clear order box",
    defaultAccent: "#b45309",
  },
  postcard: {
    label: "Postcard",
    description: "Rounded card with accent border",
    defaultAccent: "#7c3aed",
  },
};

export function isShopOrderEmailLayout(value: string): value is ShopOrderEmailLayout {
  return (SHOP_ORDER_EMAIL_LAYOUTS as readonly string[]).includes(value);
}

export function normalizeAccentColor(value: string | null | undefined, fallback = "#194a7a"): string {
  const raw = (value ?? "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    const [, a, b, c] = raw;
    return `#${a}${a}${b}${b}${c}${c}`.toLowerCase();
  }
  return fallback;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function applyVars(template: string, vars: Record<string, string>, html: boolean): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.split(`{{${key}}}`).join(html ? escapeHtml(value) : value);
  }
  return out;
}

function messageHtml(message: string): string {
  return message
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = escapeHtml(block).replace(/\n/g, "<br/>");
      return `<p style="margin:0 0 14px;line-height:1.55;color:#4b5160;">${lines}</p>`;
    })
    .join("\n");
}

function brandBlock(opts: { shopName: string; logoUrl: string | null; accent: string; onDark?: boolean }): string {
  if (opts.logoUrl) {
    return `<img src="${escapeHtml(opts.logoUrl)}" alt="${opts.shopName}" width="140" style="display:block;max-width:140px;max-height:48px;width:auto;height:auto;border:0;outline:none;text-decoration:none;" />`;
  }
  const color = opts.onDark ? "#ffffff" : opts.accent;
  return `<p style="margin:0;font-weight:bold;font-size:16px;letter-spacing:0.02em;color:${color};">${opts.shopName}</p>`;
}

function orderBox(opts: {
  orderNumber: string;
  orderDate: string;
  orderTotal: string;
  itemsHtml: string;
  accent: string;
  style: "soft" | "lined" | "solid";
}): string {
  const wrap =
    opts.style === "solid"
      ? `background:${opts.accent};color:#ffffff;border:0;`
      : opts.style === "lined"
        ? `background:#ffffff;border:2px solid ${opts.accent};`
        : `background:#f6f7f9;border:1px solid #e8eaef;`;
  const muted = opts.style === "solid" ? "rgba(255,255,255,0.8)" : "#7a8090";
  const strong = opts.style === "solid" ? "#ffffff" : "#1a1d23";
  const body = opts.style === "solid" ? "rgba(255,255,255,0.92)" : "#4b5160";
  return `<div style="margin:18px 0;padding:14px 16px;border-radius:10px;${wrap}">
    <p style="margin:0 0 6px;font-size:13px;color:${muted};">Order #${opts.orderNumber} · ${opts.orderDate}</p>
    <p style="margin:0 0 10px;font-size:15px;font-weight:bold;color:${strong};">Total ${opts.orderTotal}</p>
    <p style="margin:0;font-size:13px;line-height:1.5;color:${body};">${opts.itemsHtml}</p>
  </div>`;
}

function shell(body: string, pageBg: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:${pageBg};font-family:Arial,Helvetica,sans-serif;color:#1a1d23;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">${body}</td></tr>
    </table>
  </body>
</html>`;
}

export function renderShopOrderEmail(input: {
  subject: string;
  heading: string;
  message: string;
  vars: Record<string, string>;
  itemsHtml: string;
  itemsText: string;
  layout: ShopOrderEmailLayout;
  accentColor: string;
  logoUrl: string | null;
}): { subject: string; html: string; text: string } {
  const accent = normalizeAccentColor(input.accentColor);
  const subject = applyVars(input.subject, input.vars, false).replace(/[\r\n]+/g, " ").trim().slice(0, 200);
  const heading = applyVars(input.heading, input.vars, false).trim();
  const message = applyVars(input.message, input.vars, false).trim();
  const shopName = escapeHtml(input.vars.shopName || "Shop");
  const orderNumber = escapeHtml(input.vars.orderNumber || "");
  const orderDate = escapeHtml(input.vars.orderDate || "");
  const orderTotal = escapeHtml(input.vars.orderTotal || "");
  const paragraphs = messageHtml(message);
  const brand = brandBlock({ shopName, logoUrl: input.logoUrl, accent });
  const footer = `<p style="margin:0;line-height:1.5;color:#7a8090;font-size:12px;">If you have questions, reply to this email or contact ${shopName}.</p>`;

  let html: string;
  switch (input.layout) {
    case "bold":
      html = shell(
        `<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e3e5ea;">
          <tr><td style="padding:22px 28px;background:${accent};">
            ${brandBlock({ shopName, logoUrl: input.logoUrl, accent, onDark: true })}
            <h1 style="margin:14px 0 0;font-size:22px;line-height:1.3;color:#ffffff;">${escapeHtml(heading)}</h1>
          </td></tr>
          <tr><td style="padding:26px 28px;">
            ${paragraphs}
            ${orderBox({ orderNumber, orderDate, orderTotal, itemsHtml: input.itemsHtml, accent, style: "soft" })}
            ${footer}
          </td></tr>
        </table>`,
        "#eef1f5",
      );
      break;
    case "minimal":
      html = shell(
        `<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;">
          <tr><td style="padding:8px 4px 18px;">${brand}</td></tr>
          <tr><td style="padding:0 4px 24px;">
            <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#1a1d23;">${escapeHtml(heading)}</h1>
            <div style="width:48px;height:3px;background:${accent};border-radius:2px;margin:0 0 18px;"></div>
            ${paragraphs}
            ${orderBox({ orderNumber, orderDate, orderTotal, itemsHtml: input.itemsHtml, accent, style: "lined" })}
            ${footer}
          </td></tr>
        </table>`,
        "#ffffff",
      );
      break;
    case "banner":
      html = shell(
        `<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e3e5ea;">
          <tr><td style="height:10px;background:${accent};font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr><td style="padding:24px 28px 8px;">${brand}</td></tr>
          <tr><td style="padding:8px 28px 24px;">
            <h1 style="margin:0 0 14px;font-size:22px;line-height:1.3;color:#1a1d23;">${escapeHtml(heading)}</h1>
            ${paragraphs}
            ${orderBox({ orderNumber, orderDate, orderTotal, itemsHtml: input.itemsHtml, accent, style: "solid" })}
            ${footer}
          </td></tr>
        </table>`,
        "#f3f4f6",
      );
      break;
    case "postcard":
      html = shell(
        `<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:2px solid ${accent};border-radius:18px;">
          <tr><td style="padding:28px 28px 8px;text-align:center;">${brand}</td></tr>
          <tr><td style="padding:8px 28px 28px;text-align:center;">
            <h1 style="margin:0 0 14px;font-size:22px;line-height:1.3;color:#1a1d23;">${escapeHtml(heading)}</h1>
            <div style="text-align:left;">${paragraphs}</div>
            ${orderBox({ orderNumber, orderDate, orderTotal, itemsHtml: input.itemsHtml, accent, style: "soft" })}
            <div style="text-align:left;">${footer}</div>
          </td></tr>
        </table>`,
        "#f7f5ff",
      );
      break;
    case "classic":
    default:
      html = shell(
        `<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e3e5ea;border-radius:10px;overflow:hidden;">
          <tr><td style="height:6px;background:${accent};font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr><td style="padding:28px 32px;">
            ${brand}
            <h1 style="margin:18px 0 14px;font-size:20px;line-height:1.3;color:#1a1d23;">${escapeHtml(heading)}</h1>
            ${paragraphs}
            ${orderBox({ orderNumber, orderDate, orderTotal, itemsHtml: input.itemsHtml, accent, style: "soft" })}
            ${footer}
          </td></tr>
        </table>`,
        "#f3f4f6",
      );
      break;
  }

  const text = [
    heading,
    "",
    message,
    "",
    `Order #${input.vars.orderNumber || ""} · ${input.vars.orderDate || ""}`,
    `Total ${input.vars.orderTotal || ""}`,
    "",
    input.itemsText,
    "",
    `— ${input.vars.shopName || "Shop"}`,
  ].join("\n");

  return { subject, html, text };
}
