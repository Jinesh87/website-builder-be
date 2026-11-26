import ExcelJS from "exceljs";
import { AppError } from "../../../common/errors/AppError.js";

/** Rows of an uploaded sheet as trimmed text cells; `line` is the spreadsheet row number shown to the owner. */
export type SheetRow = { line: number; cells: string[] };

/** Splits CSV text into rows (RFC 4180: quoted cells may hold commas, quotes and line breaks). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const source = text.replace(/^﻿/, "");
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else quoted = false;
      } else cell += char;
      continue;
    }
    if (char === '"' && cell === "") quoted = true;
    else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[i + 1] === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/** Text of one Excel cell, whatever kind of value it holds. */
function excelText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value !== "object") return String(value);
  if ("richText" in value) return value.richText.map((part) => part.text).join("");
  if ("result" in value) return excelText((value.result ?? "") as ExcelJS.CellValue);
  if ("text" in value) return String(value.text);
  return "";
}

async function readXlsx(buffer: Buffer): Promise<string[][]> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch {
    throw new AppError(400, "That Excel file couldn't be opened. Save it as .xlsx or .csv and try again.", "IMPORT_UNREADABLE");
  }
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];
  const rows: string[][] = [];
  sheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const cells: string[] = [];
    for (let col = 1; col <= row.cellCount; col += 1) cells.push(excelText(row.getCell(col).value));
    rows[rowNumber - 1] = cells;
  });
  return Array.from(rows, (row) => row ?? []);
}

/**
 * Reads the first sheet of an .xlsx, or a .csv, into rows. A leading apostrophe that spreadsheets add
 * to keep values like "+91…" as text is dropped. Blank rows are skipped but keep their line numbers.
 */
export async function readSheet(file: { buffer: Buffer; originalname: string }): Promise<SheetRow[]> {
  const name = file.originalname.toLowerCase();
  let raw: string[][];
  if (name.endsWith(".xlsx")) raw = await readXlsx(file.buffer);
  else if (name.endsWith(".csv") || name.endsWith(".txt")) raw = parseCsv(file.buffer.toString("utf8"));
  else throw new AppError(400, "Upload a .csv or .xlsx file.", "IMPORT_FILE_TYPE");

  return raw
    .map((cells, index) => ({
      line: index + 1,
      cells: cells.map((cell) => cell.trim().replace(/^'(?=[=+\-@])/, "")),
    }))
    .filter((row) => row.cells.some((cell) => cell !== ""));
}
