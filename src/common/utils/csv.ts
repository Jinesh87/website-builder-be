/** Quotes a CSV cell, and defuses values a spreadsheet would run as a formula. */
export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** One CSV line from a row of cells. */
export function csvRow(cells: (string | number | null | undefined)[]): string {
  return cells.map(csvCell).join(",");
}

/** Paise as a plain rupee amount, e.g. 123456 → "1234.56". */
export function csvRupees(paise: number | null | undefined): string {
  return paise === null || paise === undefined ? "" : (paise / 100).toFixed(2);
}
