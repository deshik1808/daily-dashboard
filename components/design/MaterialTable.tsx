"use client";

import { useState } from "react";
import { AnimatedNumber } from "./AnimatedNumber";

export type MaterialRow = { material: string; disposed_mt: number; share_pct: number };

const PRIMARY = ["Soil", "RDF", "Stones"];

export function MaterialTable({ rows }: { rows: MaterialRow[] }) {
  const [expanded, setExpanded] = useState(false);

  const HIDDEN = ["Inert", "Others"];

  const primaryRows = PRIMARY.map(
    (name) => rows.find((r) => r.material === name) ?? { material: name, disposed_mt: 0, share_pct: 0 }
  );
  const otherRows = rows.filter((r) => !PRIMARY.includes(r.material) && !HIDDEN.includes(r.material));
  const othersTotal = otherRows.reduce((sum, r) => sum + r.disposed_mt, 0);
  const othersShare = otherRows.reduce((sum, r) => sum + r.share_pct, 0);

  return (
    <table className="w-full border-collapse font-mono text-xs">
      <thead>
        <tr className="border-b border-ink text-left text-[10px] tracking-wide text-muted">
          <th className="pb-1.5 font-normal">MATERIAL</th>
          <th className="pb-1.5 text-right font-normal">MT</th>
          <th className="pb-1.5 text-right font-normal">SHARE</th>
        </tr>
      </thead>
      <tbody>
        {primaryRows.map((r) => (
          <tr key={r.material} className="border-b border-sage/70">
            <td className="py-1.5">{r.material}</td>
            <td className="py-1.5 text-right">
              <AnimatedNumber value={r.disposed_mt} decimals={2} />
            </td>
            <td className="py-1.5 text-right">
              <AnimatedNumber value={r.share_pct} decimals={1} suffix="%" />
            </td>
          </tr>
        ))}
        <tr
          className="cursor-pointer border-b border-sage/70 italic hover:bg-mist/50 transition-colors"
          onClick={() => setExpanded((e) => !e)}
        >
          <td className="py-1.5">
            Others{" "}
            <span className="text-accent-ink">({expanded ? "hide" : "view breakdown"})</span>
          </td>
          <td className="py-1.5 text-right">
            <AnimatedNumber value={othersTotal} decimals={2} />
          </td>
          <td className="py-1.5 text-right">
            <AnimatedNumber value={othersShare} decimals={1} suffix="%" />
          </td>
        </tr>
        {expanded &&
          otherRows.map((r) => (
            <tr key={r.material} className="text-[11px] text-muted">
              <td className="py-1 pl-3.5">{r.material}</td>
              <td className="py-1 text-right">
                <AnimatedNumber value={r.disposed_mt} decimals={2} />
              </td>
              <td className="py-1 text-right">
                <AnimatedNumber value={r.share_pct} decimals={1} suffix="%" />
              </td>
            </tr>
          ))}
      </tbody>
    </table>
  );
}
