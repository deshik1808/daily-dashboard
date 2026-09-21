"use client";

import { AnimatedNumber } from "./AnimatedNumber";

export type StatItem = {
  label: string;
  value?: string;
  numericValue?: number | null;
  decimals?: number;
  accent?: boolean;
};

export function StatGrid({ stats }: { stats: StatItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-3.5 gap-y-2.5">
      {stats.map((s) => (
        <div key={s.label}>
          <div className="font-mono text-[10px] tracking-wide text-muted">{s.label}</div>
          <div className={`mt-0.5 text-[17px] font-bold ${s.accent ? "text-accent-ink" : ""}`}>
            {s.numericValue !== undefined && s.numericValue !== null ? (
              <AnimatedNumber value={s.numericValue} decimals={s.decimals ?? 2} />
            ) : (
              s.value
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
