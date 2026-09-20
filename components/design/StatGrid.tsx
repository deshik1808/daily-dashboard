// components/design/StatGrid.tsx
export function StatGrid({
  stats,
}: {
  stats: { label: string; value: string; accent?: boolean }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-x-3.5 gap-y-2.5">
      {stats.map((s) => (
        <div key={s.label}>
          <div className="font-mono text-[10px] tracking-wide text-muted">{s.label}</div>
          <div className={`mt-0.5 text-[17px] font-bold ${s.accent ? "text-accent-ink" : ""}`}>
            {s.value}
          </div>
        </div>
      ))}
    </div>
  );
}
