export const SHOP_INVOICE_LAYOUTS = ["classic", "minimal", "bold", "modern"] as const;
export type ShopInvoiceLayout = (typeof SHOP_INVOICE_LAYOUTS)[number];

export type ShopInvoiceItem = {
  productName: string;
  variantName: string;
  quantity: number;
  unitPricePaise: number;
  lineTotalPaise: number;
};

export type ShopInvoiceRenderInput = {
  layout: ShopInvoiceLayout;
  logoUrl: string | null;
  companyName: string;
  companyAddress: string;
  companyEmail: string | null;
  companyPhone: string | null;
  invoiceNumber: string;
  orderDate: string;
  paidAt: string | null;
  /** Display status such as Paid, Returned, Cancelled. */
  statusLabel: string;
  refundLabel: string | null;
  customerName: string;
  customerEmail: string;
  shippingLines: string[];
  items: ShopInvoiceItem[];
  totalPaise: number;
  currency: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatInr(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: paise % 100 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

function logoHtml(logoUrl: string | null, companyName: string, onDark = false): string {
  if (logoUrl) {
    return `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(companyName)}" style="display:block;max-width:160px;max-height:56px;width:auto;height:auto;" />`;
  }
  return `<div style="font-size:18px;font-weight:700;color:${onDark ? "#fff" : "#1a1d23"};">${escapeHtml(companyName)}</div>`;
}

function itemLabel(item: ShopInvoiceItem): string {
  const name = item.productName.trim() || "Item";
  const variant = item.variantName.trim();
  return variant ? `${name} (${variant})` : name;
}

function rowsHtml(items: ShopInvoiceItem[], style: "bordered" | "open" | "striped"): string {
  return items
    .map((item, index) => {
      const bg = style === "striped" && index % 2 === 0 ? "background:#f6f7f9;" : "";
      const border = style === "bordered" ? "border:1px solid #d7dbe3;" : style === "open" ? "border-bottom:1px solid #e8eaef;" : "";
      return `<tr>
        <td style="padding:10px 12px;${border}${bg}">${escapeHtml(itemLabel(item))}</td>
        <td style="padding:10px 12px;text-align:center;${border}${bg}">${item.quantity}</td>
        <td style="padding:10px 12px;text-align:right;${border}${bg}">${escapeHtml(formatInr(item.unitPricePaise))}</td>
        <td style="padding:10px 12px;text-align:right;${border}${bg}">${escapeHtml(formatInr(item.lineTotalPaise))}</td>
      </tr>`;
    })
    .join("");
}

function partyBlock(title: string, lines: string[]): string {
  const body = lines
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<div style="margin:2px 0;color:#4b5160;font-size:13px;line-height:1.45;">${escapeHtml(line)}</div>`)
    .join("");
  return `<div>
    <div style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#7a8090;margin-bottom:6px;">${escapeHtml(title)}</div>
    ${body}
  </div>`;
}

function shell(title: string, body: string, pageBg: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    @media print {
      .no-print { display: none !important; }
      body { padding: 12px !important; }
      /* Keep card border/background so print/PDF matches the on-screen template. */
    }
    body { margin: 0; padding: 24px; background: ${pageBg}; font-family: Arial, Helvetica, sans-serif; color: #1a1d23; }
    .actions { max-width: 760px; margin: 0 auto 16px; display: flex; gap: 8px; justify-content: flex-end; }
    .actions a.button {
      appearance: none; border: 1px solid #1a1d23; background: #1a1d23; color: #fff; border-radius: 8px;
      padding: 8px 12px; font-size: 13px; cursor: pointer; text-decoration: none; display: inline-block;
    }
  </style>
</head>
<body>
  <div class="actions no-print">
    <a class="button" href="?format=pdf">Download</a>
  </div>
  ${body}
</body>
</html>`;
}

export function isShopInvoiceLayout(value: string): value is ShopInvoiceLayout {
  return (SHOP_INVOICE_LAYOUTS as readonly string[]).includes(value);
}

export function renderShopInvoiceHtml(input: ShopInvoiceRenderInput): string {
  const layout = isShopInvoiceLayout(input.layout) ? input.layout : "classic";
  const companyContact = [input.companyEmail, input.companyPhone].filter(Boolean) as string[];
  const fromLines = [input.companyName, input.companyAddress, ...companyContact];
  const billLines = [input.customerName, input.customerEmail, ...input.shippingLines];
  const title = `Invoice ${input.invoiceNumber}`;
  const total = formatInr(input.totalPaise);
  const statusBits = [
    `Status: ${input.statusLabel}`,
    input.paidAt ? `Paid ${input.paidAt}` : null,
    input.refundLabel,
  ].filter(Boolean);
  const paidLine = statusBits.join(" · ");

  if (layout === "minimal") {
    return shell(
      title,
      `<div class="sheet" style="max-width:760px;margin:0 auto;background:#fff;border:1px dashed #c9ced8;border-radius:16px;padding:28px;">
        <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-end;">
          ${logoHtml(input.logoUrl, input.companyName)}
          <div style="text-align:right;">
            <div style="font-size:14px;font-weight:600;">${escapeHtml(input.invoiceNumber)}</div>
            <div style="font-size:12px;color:#7a8090;margin-top:4px;">${escapeHtml(input.orderDate)}</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:28px 0 22px;">
          ${partyBlock("From", fromLines)}
          ${partyBlock("Bill to", billLines)}
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="border-bottom:1px solid #1a1d23;">
              <th style="text-align:left;padding:0 12px 10px;font-weight:500;color:#7a8090;">Description</th>
              <th style="text-align:center;padding:0 12px 10px;font-weight:500;color:#7a8090;">Qty</th>
              <th style="text-align:right;padding:0 12px 10px;font-weight:500;color:#7a8090;">Rate</th>
              <th style="text-align:right;padding:0 12px 10px;font-weight:500;color:#7a8090;">Amount</th>
            </tr>
          </thead>
          <tbody>${rowsHtml(input.items, "open")}</tbody>
        </table>
        <div style="margin-top:22px;text-align:right;font-size:15px;">Total <strong>${escapeHtml(total)}</strong></div>
        <div style="margin-top:8px;text-align:right;font-size:12px;color:#7a8090;">${escapeHtml(paidLine)}</div>
      </div>`,
      "#ffffff",
    );
  }

  if (layout === "bold") {
    return shell(
      title,
      `<div class="sheet" style="max-width:760px;margin:0 auto;background:#fff;border:1px solid #1a1d23;border-radius:16px;overflow:hidden;">
        <div style="display:flex;justify-content:space-between;gap:16px;align-items:center;background:#1a1d23;color:#fff;padding:22px 28px;">
          <div>
            <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.75;">Invoice</div>
            <div style="font-size:22px;font-weight:700;margin-top:4px;">${escapeHtml(input.invoiceNumber)}</div>
            <div style="font-size:12px;opacity:0.8;margin-top:4px;">${escapeHtml(input.orderDate)}</div>
          </div>
          <div style="background:#fff;border-radius:8px;padding:8px 10px;">${logoHtml(input.logoUrl, input.companyName)}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;padding:22px 28px;border-bottom:1px solid #e8eaef;">
          ${partyBlock("Company", fromLines)}
          ${partyBlock("Customer", billLines)}
        </div>
        <div style="padding:18px 22px 26px;">
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="background:#1a1d23;color:#fff;">
                <th style="text-align:left;padding:10px 12px;">Item</th>
                <th style="text-align:center;padding:10px 12px;">Qty</th>
                <th style="text-align:right;padding:10px 12px;">Unit price</th>
                <th style="text-align:right;padding:10px 12px;">Total</th>
              </tr>
            </thead>
            <tbody>${rowsHtml(input.items, "striped")}</tbody>
          </table>
          <div style="margin-top:18px;text-align:right;font-size:16px;font-weight:700;">Amount due ${escapeHtml(total)}</div>
          <div style="margin-top:6px;text-align:right;font-size:12px;color:#7a8090;">${escapeHtml(paidLine)}</div>
        </div>
      </div>`,
      "#eef1f5",
    );
  }

  if (layout === "modern") {
    return shell(
      title,
      `<div class="sheet" style="max-width:760px;margin:0 auto;background:#f4f6f8;border-radius:18px;overflow:hidden;box-shadow:0 8px 24px rgba(26,29,35,0.08);">
        <div style="height:8px;background:#2563eb;"></div>
        <div style="padding:24px;">
          <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;">
            <div>
              <div style="font-size:12px;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:0.06em;">Tax invoice</div>
              <div style="font-size:22px;font-weight:700;margin-top:4px;">${escapeHtml(input.invoiceNumber)}</div>
              <div style="font-size:12px;color:#7a8090;margin-top:4px;">Issued ${escapeHtml(input.orderDate)}</div>
            </div>
            ${logoHtml(input.logoUrl, input.companyName)}
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:20px 0;">
            <div style="background:#fff;border:1px solid #e3e5ea;border-radius:12px;padding:14px;">${partyBlock("Sold by", fromLines)}</div>
            <div style="background:#fff;border:1px solid #e3e5ea;border-radius:12px;padding:14px;">${partyBlock("Bill to", billLines)}</div>
          </div>
          <div style="background:#fff;border:1px solid #e3e5ea;border-radius:12px;overflow:hidden;">
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <thead>
                <tr style="background:rgba(37,99,235,0.08);">
                  <th style="text-align:left;padding:10px 12px;">Product</th>
                  <th style="text-align:center;padding:10px 12px;">Qty</th>
                  <th style="text-align:right;padding:10px 12px;">Price</th>
                  <th style="text-align:right;padding:10px 12px;">Line total</th>
                </tr>
              </thead>
              <tbody>${rowsHtml(input.items, "open")}</tbody>
            </table>
          </div>
          <div style="display:flex;justify-content:flex-end;margin-top:16px;">
            <div style="background:#fff;border:1px solid #e3e5ea;border-radius:12px;padding:12px 16px;text-align:right;">
              <div style="font-size:12px;color:#7a8090;">Grand total</div>
              <div style="font-size:18px;font-weight:700;">${escapeHtml(total)}</div>
              <div style="font-size:12px;color:#7a8090;margin-top:4px;">${escapeHtml(paidLine)}</div>
            </div>
          </div>
        </div>
      </div>`,
      "#eef1f5",
    );
  }

  // classic
  return shell(
    title,
    `<div class="sheet" style="max-width:760px;margin:0 auto;background:#fff;border:1px solid #d7dbe3;border-radius:16px;padding:28px;">
      <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:22px;">
        <div>
          <div style="font-size:22px;font-weight:700;letter-spacing:0.04em;">INVOICE</div>
          <div style="font-size:12px;color:#7a8090;margin-top:4px;">${escapeHtml(input.invoiceNumber)} · ${escapeHtml(input.orderDate)}</div>
        </div>
        ${logoHtml(input.logoUrl, input.companyName)}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:22px;">
        ${partyBlock("From", fromLines)}
        ${partyBlock("Bill to", billLines)}
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#f6f7f9;">
            <th style="border:1px solid #d7dbe3;text-align:left;padding:10px 12px;">Item</th>
            <th style="border:1px solid #d7dbe3;text-align:center;padding:10px 12px;">Qty</th>
            <th style="border:1px solid #d7dbe3;text-align:right;padding:10px 12px;">Rate</th>
            <th style="border:1px solid #d7dbe3;text-align:right;padding:10px 12px;">Amount</th>
          </tr>
        </thead>
        <tbody>${rowsHtml(input.items, "bordered")}</tbody>
      </table>
      <div style="margin-top:18px;text-align:right;font-size:16px;font-weight:700;">Total ${escapeHtml(total)}</div>
      <div style="margin-top:6px;text-align:right;font-size:12px;color:#7a8090;">${escapeHtml(paidLine)}</div>
    </div>`,
    "#eef1f5",
  );
}
