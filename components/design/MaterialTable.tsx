"use client";

import { useState } from "react";

export type MaterialRow = { material: string; disposed_mt: number; share_pct: number };

const PRIMARY = ["Soil", "RDF", "Stones"];

function fmt(n: number) {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function MaterialTable({ rows }: { rows: MaterialRow[] }) {
  const [expanded, setExpanded] = useState(false);

  const primaryRows = PRIMARY.map(
    (name) => rows.find((r) => r.material === name) ?? { material: name, disposed_mt: 0, share_pct: 0 }
  );
  const otherRows = rows.filter((r) => !PRIMARY.includes(r.material));
  const othersTotal = otherRows.reduce((sum, r) => sum + r.disposed_mt, 0);
  const othersShare = otherRows.reduce((sum, r) => sum + r.share_pct, 0);

  return (
    <table className="w-full border-collapse font-mono text-xs">
      <thead>
        <tr className="border-b border-ink text-left text-[10px] tracking-wide">
          <th className="pb-1.5 font-normal">MATERIAL</th>
          <th className="pb-1.5 text-right font-normal">MT</th>
          <th className="pb-1.5 text-right font-normal">SHARE</th>
        </tr>
      </thead>
      <tbody>
        {primaryRows.map((r) => (
          <tr key={r.material} className="border-b border-ink/20">
            <td className="py-1.5">{r.material}</td>
            <td className="py-1.5 text-right">{fmt(r.disposed_mt)}</td>
            <td className="py-1.5 text-right">{r.share_pct.toFixed(1)}%</td>
          </tr>
        ))}
        <tr
          className="cursor-pointer border-b border-ink/20 italic"
          onClick={() => setExpanded((e) => !e)}
        >
          <td className="py-1.5">
            Others{" "}
            <span className="text-accent-blue">({expanded ? "hide" : "view breakdown"})</span>
          </td>
          <td className="py-1.5 text-right">{fmt(othersTotal)}</td>
          <td className="py-1.5 text-right">{othersShare.toFixed(1)}%</td>
        </tr>
        {expanded &&
          otherRows.map((r) => (
            <tr key={r.material} className="text-[11px] text-ink/70">
              <td className="py-1 pl-3.5">{r.material}</td>
              <td className="py-1 text-right">{fmt(r.disposed_mt)}</td>
              <td className="py-1 text-right">{r.share_pct.toFixed(1)}%</td>
            </tr>
          ))}
      </tbody>
    </table>
  );
}
