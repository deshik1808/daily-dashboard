// lib/runtime-report-pdf.ts
// Draws the shift-wise screen runtime report as an A4 landscape office-style PDF.
// Row content comes pre-built from lib/runtime-report.ts; this file is only layout.

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { pdfSafeText, type ReportRow } from "./runtime-report.ts";

export interface RuntimeReportInput {
  orgName: string;
  title: string;
  /** e.g. "Card Box · Phase III" */
  subtitle: string;
  period: string;
  generated: string;
  rows: ReportRow[];
}

const PAGE_W = 841.89; // A4 landscape, in points
const PAGE_H = 595.28;
const MARGIN = 36;
const FOOTER_H = 22;
const FONT_SIZE = 8.5;
const LINE_H = 11;
const PAD_X = 5;
const PAD_Y = 4;

const INK = rgb(0.1, 0.1, 0.1);
const GRID = rgb(0.6, 0.6, 0.6);
const HEADER_FILL = rgb(0.9, 0.9, 0.9);
const MUTED = rgb(0.4, 0.4, 0.4);

type ColumnKey = "date" | "shift" | "screen" | "meter" | "runtime" | "breakdown" | "reasons";

const FIXED_COLUMNS: { key: ColumnKey; label: string; w: number }[] = [
  { key: "date", label: "Date", w: 62 },
  { key: "shift", label: "Shift", w: 44 },
  { key: "screen", label: "Screen", w: 44 },
  { key: "meter", label: "Meter reading", w: 112 },
  { key: "runtime", label: "Runtime", w: 84 },
  { key: "breakdown", label: "Breakdown", w: 70 },
];
const TABLE_W = PAGE_W - 2 * MARGIN;
const COLUMNS = [
  ...FIXED_COLUMNS,
  {
    key: "reasons" as ColumnKey,
    label: "Breakdown reasons",
    w: TABLE_W - FIXED_COLUMNS.reduce((sum, c) => sum + c.w, 0),
  },
];

/** Wraps text to a width, honouring newlines and breaking over-long words. */
function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    if (paragraph.trim() === "") {
      lines.push("");
      continue;
    }
    let current = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate;
        continue;
      }
      if (current) lines.push(current);
      current = "";
      let rest = word;
      while (font.widthOfTextAtSize(rest, size) > maxWidth && rest.length > 1) {
        let cut = rest.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), size) > maxWidth) cut--;
        lines.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      current = rest;
    }
    if (current) lines.push(current);
  }
  return lines.length > 0 ? lines : [""];
}

export async function buildRuntimeReportPdf(input: RuntimeReportInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(input.title);
  doc.setSubject(`${input.subtitle} – ${input.period}`);
  doc.setCreator("Office Dashboard");

  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page: PDFPage;
  let y = 0;
  let tableTop = 0;

  const text = (
    value: string,
    x: number,
    baseline: number,
    opts: { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb> } = {}
  ) => {
    page.drawText(pdfSafeText(value), {
      x,
      y: baseline,
      font: opts.font ?? regular,
      size: opts.size ?? FONT_SIZE,
      color: opts.color ?? INK,
    });
  };
  const line = (x1: number, y1: number, x2: number, y2: number, thickness = 0.5) => {
    page.drawLine({
      start: { x: x1, y: y1 },
      end: { x: x2, y: y2 },
      thickness,
      color: GRID,
    });
  };

  const colX: number[] = [];
  COLUMNS.reduce((x, c) => {
    colX.push(x);
    return x + c.w;
  }, MARGIN);

  const drawTableHeader = () => {
    const h = LINE_H + 2 * PAD_Y;
    page.drawRectangle({
      x: MARGIN,
      y: y - h,
      width: TABLE_W,
      height: h,
      color: HEADER_FILL,
      borderColor: GRID,
      borderWidth: 0.5,
    });
    COLUMNS.forEach((c, i) => {
      text(c.label, colX[i] + PAD_X, y - PAD_Y - FONT_SIZE, { font: bold });
      if (i > 0) line(colX[i], y, colX[i], y - h);
    });
    y -= h;
    tableTop = y;
  };

  const newPage = (first: boolean) => {
    page = doc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
    if (first) {
      text(input.orgName, MARGIN, y - 9, { font: bold, size: 9, color: MUTED });
      y -= 26;
      text(input.title, MARGIN, y - 12, { font: bold, size: 16 });
      y -= 22;
      text(input.subtitle, MARGIN, y - 10, { size: 10 });
      y -= 18;
      text(`Period: ${input.period}`, MARGIN, y - 9, { size: 9 });
      const generated = pdfSafeText(`Generated: ${input.generated}`);
      text(generated, PAGE_W - MARGIN - regular.widthOfTextAtSize(generated, 9), y - 9, {
        size: 9,
      });
      y -= 16;
      page.drawLine({
        start: { x: MARGIN, y },
        end: { x: PAGE_W - MARGIN, y },
        thickness: 1,
        color: INK,
      });
      y -= 12;
    } else {
      text(`${input.title} (continued)`, MARGIN, y - 9, { size: 9, color: MUTED });
      y -= 22;
    }
    drawTableHeader();
  };

  newPage(true);

  const bottomLimit = MARGIN + FOOTER_H;

  if (input.rows.length === 0) {
    const h = LINE_H + 2 * PAD_Y + 6;
    page!.drawRectangle({
      x: MARGIN,
      y: y - h,
      width: TABLE_W,
      height: h,
      borderColor: GRID,
      borderWidth: 0.5,
    });
    text("No shifts logged in this period.", MARGIN + PAD_X, y - PAD_Y - 3 - FONT_SIZE, {
      color: MUTED,
    });
  }

  // Rows of one shift (Red, and Yellow on older shifts) are kept on the same page.
  const groups: ReportRow[][] = [];
  for (const row of input.rows) {
    if (groups[groups.length - 1]?.[0].group === row.group) groups[groups.length - 1].push(row);
    else groups.push([row]);
  }

  const reasonsCol = COLUMNS[COLUMNS.length - 1];
  for (const group of groups) {
    const laid = group.map((row) => {
      const reasonLines = wrapText(
        pdfSafeText(row.reasons),
        regular,
        FONT_SIZE,
        reasonsCol.w - 2 * PAD_X
      );
      return { row, reasonLines, h: Math.max(reasonLines.length, 1) * LINE_H + 2 * PAD_Y };
    });
    const groupH = laid.reduce((sum, r) => sum + r.h, 0);
    if (y - groupH < bottomLimit && y !== tableTop) newPage(false);

    laid.forEach(({ row, reasonLines, h }, idx) => {
      const baseline = y - PAD_Y - FONT_SIZE;
      COLUMNS.forEach((c, i) => {
        if (c.key === "reasons") {
          reasonLines.forEach((l, n) =>
            text(l, colX[i] + PAD_X, baseline - n * LINE_H)
          );
        } else {
          const value = row[c.key];
          const isFirstOfShift = c.key === "date" || c.key === "shift";
          text(value, colX[i] + PAD_X, baseline, {
            font: isFirstOfShift ? bold : regular,
          });
        }
      });

      // Verticals, then the bottom rule. Within a shift the Date and Shift cells
      // read as one merged cell, so the rule starts after them.
      colX.forEach((x) => line(x, y, x, y - h));
      line(PAGE_W - MARGIN, y, PAGE_W - MARGIN, y - h);
      const lastOfShift = idx === laid.length - 1;
      line(lastOfShift ? MARGIN : colX[2], y - h, PAGE_W - MARGIN, y - h);
      y -= h;
    });
  }

  const pages = doc.getPages();
  pages.forEach((p, i) => {
    page = p;
    text(input.title, MARGIN, MARGIN - 6, { size: 8, color: MUTED });
    const label = `Page ${i + 1} of ${pages.length}`;
    text(label, PAGE_W - MARGIN - regular.widthOfTextAtSize(label, 8), MARGIN - 6, {
      size: 8,
      color: MUTED,
    });
  });

  return doc.save();
}
