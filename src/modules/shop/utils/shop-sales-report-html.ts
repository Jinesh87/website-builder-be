import type { SalesReport } from "../types/shop-sales.types.js";

/** "2026-11-01" for one day, "2026-11-01 to 2026-11-30" for a range. */
export function salesReportPeriod(report: Pick<SalesReport, "from" | "to">): string {
  return report.from === report.to ? report.from : `${report.from} to ${report.to}`;
}

function esc(value: string | number | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inr(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function figure(money: boolean, value: number): string {
  return money ? inr(value) : value.toLocaleString("en-IN");
}

function card(label: string, value: string, note: string): string {
  return `<div class="card"><div class="label">${esc(label)}</div><div class="value">${esc(value)}</div><div class="note">${esc(note)}</div></div>`;
}

const STYLE = `
* { box-sizing: border-box; }
body { margin: 0; font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif; color: #1f2937; font-size: 11px; }
h1 { font-size: 20px; margin: 0; color: #111827; }
h2 { font-size: 12px; margin: 0 0 8px; color: #111827; text-transform: uppercase; letter-spacing: .04em; }
.head { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #111827; padding-bottom: 10px; margin-bottom: 16px; }
.muted { color: #6b7280; }
.cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 18px; }
.card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; }
.card .label { color: #6b7280; font-size: 10px; }
.card .value { font-size: 16px; font-weight: 600; margin-top: 2px; color: #111827; }
.card .note { color: #6b7280; font-size: 9.5px; margin-top: 2px; }
.cols { display: grid; grid-template-columns: 3fr 2fr; gap: 16px; margin-bottom: 18px; }
section { break-inside: avoid; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; font-weight: 600; color: #6b7280; font-size: 9.5px; border-bottom: 1px solid #d1d5db; padding: 4px 6px; }
td { border-bottom: 1px solid #f1f5f9; padding: 4px 6px; vertical-align: top; }
.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.strong { font-weight: 600; color: #111827; }
.orders td, .orders th { font-size: 9.5px; padding: 3px 5px; }
.orders thead { display: table-header-group; }
.orders tr { break-inside: avoid; }
.empty { color: #6b7280; padding: 12px 0; }
.foot { margin-top: 12px; color: #6b7280; font-size: 9.5px; }
`;

/** The sales download as a printable page: headline cards, channel comparison, payments and the order list. */
export function salesReportHtml(report: SalesReport, orderLimit: number): string {
  const get = (label: string) => report.figures.find((f) => f.label === label)!;
  const revenue = get("Revenue");
  const orders = get("Orders");
  const profit = get("Profit");
  const net = get("Net sales excl. GST");
  const sold = get("Items sold").total;
  const uncosted = sold > 0 && get("Items without base price").total === sold;
  const margin = !uncosted && net.total > 0 ? `${Math.round((profit.total / net.total) * 100)}% margin` : "No base prices set";

  const cards = [
    card("Total sales", inr(revenue.total), `${orders.total} orders across both channels`),
    card("Online store", inr(revenue.online), `${orders.online} orders`),
    card("POS (in-store)", inr(revenue.pos), `${orders.pos} sales`),
    card("Profit", inr(profit.total), margin),
  ].join("");

  const compare = report.figures
    .map(
      (f) =>
        `<tr><td>${esc(f.label)}</td><td class="num">${figure(f.money, f.online)}</td><td class="num">${figure(f.money, f.pos)}</td><td class="num strong">${figure(f.money, f.total)}</td></tr>`,
    )
    .join("");

  const payments = [
    ...report.payments.map(
      (p) => `<tr><td>${esc(p.label)}</td><td class="num">${p.count}</td><td class="num strong">${inr(p.totalPaise)}</td></tr>`,
    ),
    `<tr><td>Refunded</td><td class="num">${report.refunds.count}</td><td class="num strong">${inr(report.refunds.totalPaise)}</td></tr>`,
  ].join("");

  const orderRows = report.orders
    .map(
      (o) => `<tr>
        <td>#${o.number}</td><td class="num">${esc(o.date)}</td><td>${esc(o.channel)}</td><td>${esc(o.status)}</td>
        <td>${esc(o.payment)}</td><td>${esc(o.customer)}${o.phone ? `<br/><span class="muted">${esc(o.phone)}</span>` : ""}</td>
        <td class="num">${o.items}</td><td class="num">${o.discountPaise ? inr(o.discountPaise) : "—"}</td>
        <td class="num strong">${inr(o.totalPaise)}</td><td>${esc(o.refund)}</td>
      </tr>`,
    )
    .join("");

  return `<!doctype html>
<html><head><meta charset="utf-8"/><title>Sales summary ${esc(salesReportPeriod(report))}</title><style>${STYLE}</style></head>
<body>
  <div class="head">
    <div><h1>Sales summary</h1><div class="muted">${esc(report.websiteName)}</div></div>
    <div class="muted" style="text-align:right">Period: <span class="strong">${esc(salesReportPeriod(report))}</span><br/>Online store and POS, India time</div>
  </div>

  <div class="cards">${cards}</div>

  <div class="cols">
    <section>
      <h2>Online vs POS</h2>
      <table><thead><tr><th></th><th class="num">Online</th><th class="num">POS</th><th class="num">Total</th></tr></thead><tbody>${compare}</tbody></table>
    </section>
    <section>
      <h2>By payment method</h2>
      <table><thead><tr><th>Payment</th><th class="num">Orders</th><th class="num">Amount</th></tr></thead><tbody>${payments}</tbody></table>
      <h2 style="margin-top:14px">Online fulfilment</h2>
      <table><tbody>
        <tr><td>To fulfil</td><td class="num strong">${report.fulfilment.toFulfil}</td></tr>
        <tr><td>Shipped</td><td class="num strong">${report.fulfilment.shipped}</td></tr>
        <tr><td>Delivered</td><td class="num strong">${report.fulfilment.delivered}</td></tr>
      </tbody></table>
    </section>
  </div>

  <section style="break-inside:auto">
    <h2>Orders (${report.orders.length}${report.truncated ? "+" : ""})</h2>
    ${
      report.orders.length
        ? `<table class="orders"><thead><tr><th>Order</th><th class="num">Date (IST)</th><th>Channel</th><th>Status</th><th>Payment</th><th>Customer</th><th class="num">Items</th><th class="num">Discount</th><th class="num">Total</th><th>Refund</th></tr></thead><tbody>${orderRows}</tbody></table>`
        : `<div class="empty">No paid orders in this period.</div>`
    }
    ${report.truncated ? `<div class="foot">Only the first ${orderLimit} orders are listed; pick a shorter period for the rest.</div>` : ""}
  </section>
</body></html>`;
}
