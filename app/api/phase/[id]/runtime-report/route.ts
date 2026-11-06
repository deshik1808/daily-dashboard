// app/api/phase/[id]/runtime-report/route.ts
// GET /api/phase/<id>/runtime-report?from=YYYY-MM-DD&to=YYYY-MM-DD
// Shift-wise screen runtime report as a PDF download. Editor only.

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPhaseById, getRuntimeLogs } from "@/lib/data";
import { getMeterReadings } from "@/lib/meter-readings";
import { SCREEN_RUNTIME_AGENCIES } from "@/lib/runtime";
import {
  buildReportRows,
  formatReportDate,
  reportFileName,
  reportTotals,
  validateReportRange,
} from "@/lib/runtime-report";
import { buildRuntimeReportPdf } from "@/lib/runtime-report-pdf";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "editor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const search = req.nextUrl.searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const range = validateReportRange(search.get("from"), search.get("to"), today);
  if (!range.ok) {
    return NextResponse.json({ error: range.error }, { status: 400 });
  }

  const phase = await getPhaseById(id);
  const agency = phase?.agency ?? "";
  if (!phase || !(SCREEN_RUNTIME_AGENCIES as readonly string[]).includes(agency)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const logs = await getRuntimeLogs(id, range.from);
  const meterByLog = await getMeterReadings(
    session.role,
    logs.flatMap((l) => (l.id ? [l.id] : []))
  );
  const rows = buildReportRows(logs, meterByLog, range.from, range.to);

  const pdf = await buildRuntimeReportPdf({
    orgName: "Bio-Mining, Tirupati",
    title: "Screen Runtime Report",
    subtitle: `${agency} · ${phase.phase ?? ""}`.trim(),
    period: `${formatReportDate(range.from)} to ${formatReportDate(range.to)}`,
    generated: formatReportDate(today),
    totals: rows.length > 0 ? reportTotals(logs, range.from, range.to) : null,
    rows,
  });

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${reportFileName(agency, range.from, range.to)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
