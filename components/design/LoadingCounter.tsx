"use client";

import { useEffect, useState } from "react";

/**
 * Ticking numbers that simulate active data calculation/tallying
 * while the page is in the loading state.
 */
export function LoadingCounter({
  decimals = 2,
  prefix = "",
  suffix = "",
  className = "",
  min = 1000,
  max = 65000,
}: {
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  min?: number;
  max?: number;
}) {
  const [val, setVal] = useState<number>(min);

  useEffect(() => {
    let current = min;
    const interval = setInterval(() => {
      // Random upward jumps that simulate live data tallying
      const jump = Math.random() * (max - min) * 0.08 + (max - min) * 0.02;
      current += jump;
      if (current > max) {
        current = min;
      }
      setVal(current);
    }, 80);

    return () => clearInterval(interval);
  }, [min, max]);

  const formatted = val.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span className={`font-mono font-bold tracking-tight ${className}`}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

/**
 * Rolling percentage for the loading screen (e.g. 0% -> 99%)
 */
export function LoadingPercentage() {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      current = (current + Math.floor(Math.random() * 9) + 4) % 100;
      setPct(current);
    }, 90);

    return () => clearInterval(interval);
  }, []);

  return <span className="font-mono text-3xl font-bold text-ink/70">{pct}%</span>;
}

/**
 * Order summary skeleton with active counting numbers while loading
 */
export function CountingSkeletonStatGrid() {
  const stats = [
    { label: "ORDER QTY", min: 40000, max: 80000 },
    { label: "CUM. INWARD", min: 20000, max: 60000 },
    { label: "CUM. DISPOSED", min: 15000, max: 50000 },
    { label: "PROCESSING LOSS", min: 1000, max: 12000, accent: true },
  ];

  return (
    <div className="grid grid-cols-2 gap-x-3.5 gap-y-2.5">
      {stats.map((s) => (
        <div key={s.label}>
          <div className="font-mono text-[10px] tracking-wide text-muted flex items-center gap-1.5">
            <span>{s.label}</span>
            <span className="inline-block h-1 w-1 rounded-full bg-accent animate-ping" />
          </div>
          <div
            className={`mt-0.5 text-[17px] font-bold ${
              s.accent ? "text-accent-ink/80" : "text-ink/80"
            }`}
          >
            <LoadingCounter min={s.min} max={s.max} decimals={2} />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Material breakdown table skeleton with live counting MT numbers while loading
 */
export function LoadingMaterialTable() {
  const materials = [
    { name: "Soil", min: 5000, max: 25000, share: 45 },
    { name: "RDF", min: 3000, max: 15000, share: 28 },
    { name: "Stones", min: 1000, max: 8000, share: 14 },
    { name: "Others", min: 500, max: 4000, share: 8 },
  ];

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
        {materials.map((m) => (
          <tr key={m.name} className="border-b border-sage/70">
            <td className="py-1.5 flex items-center gap-1.5">
              <span>{m.name}</span>
              <span className="inline-block h-1 w-1 rounded-full bg-sage animate-ping" />
            </td>
            <td className="py-1.5 text-right">
              <LoadingCounter min={m.min} max={m.max} decimals={2} />
            </td>
            <td className="py-1.5 text-right text-muted">~{m.share}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
