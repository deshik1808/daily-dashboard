"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatedNumber } from "./AnimatedNumber";

const MATERIAL_LABELS = {
  soil_mt: "Soil",
  rdf_mt: "RDF",
  stones_mt: "Stones",
  steel_mt: "Steel",
  tyre_mt: "Tyre",
  wood_mt: "Wood",
  glass_mt: "Glass",
  iron_scrap_mt: "Iron Scrap",
  wires_cables_mt: "Wires & Cables",
} as const;

type MaterialKey = keyof typeof MATERIAL_LABELS;

function fmt(n: number) {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export type EntryRowData = {
  id: string;
  report_date: string;
  shift: string;
  inward_mt: number;
} & Record<MaterialKey, number | null>;

export function EntryRow({ entry, isEditor }: { entry: EntryRowData; isEditor: boolean }) {
  const [expanded, setExpanded] = useState(false);

  const materials = (Object.keys(MATERIAL_LABELS) as MaterialKey[])
    .map((key) => ({ label: MATERIAL_LABELS[key], value: entry[key] ?? 0 }))
    .filter((m) => m.value > 0);

  const disposed = materials.reduce((sum, m) => sum + m.value, 0);

  return (
    <div className="border-b border-sage/70 py-2 last:border-b-0">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={() => setExpanded((e) => !e)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
        className="flex cursor-pointer items-center justify-between gap-2"
      >
        <div>
          <div className="text-sm font-bold">
            {new Date(entry.report_date).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              timeZone: "UTC",
            })}
          </div>
          <div className="font-mono text-[10px] text-muted">{entry.shift.toUpperCase()}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right font-mono text-xs">
            <div>
              IN <AnimatedNumber value={entry.inward_mt} decimals={2} />
            </div>
            <div className="text-muted">
              OUT <AnimatedNumber value={disposed} decimals={2} />
            </div>
          </div>
          {isEditor && (
            <Link
              href={`/entry/${entry.id}`}
              aria-label={`Edit entry for ${entry.report_date}`}
              onClick={(e) => e.stopPropagation()}
              className="min-h-[32px] shrink-0 rounded-control border border-ink px-2 py-1 font-mono text-[10px] font-bold tracking-wide hover:bg-ink hover:text-paper"
            >
              EDIT
            </Link>
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-1.5 pl-3.5 font-mono text-[11px] text-muted">
          {materials.length === 0 ? (
            <div className="py-0.5">No outward material logged.</div>
          ) : (
            materials.map((m) => (
              <div key={m.label} className="flex justify-between py-0.5">
                <span>{m.label}</span>
                <span>{fmt(m.value)}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
