// components/design/Window.tsx
export function Window({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-window border border-ink">
      <div className="flex items-center gap-2 border-b border-ink px-2.5 py-1.5 font-mono text-xs font-bold tracking-wide">
        <span className="flex gap-1">
          <span className="h-[7px] w-[7px] rounded-full border border-ink" />
          <span className="h-[7px] w-[7px] rounded-full border border-ink" />
        </span>
        <span>{title}</span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}
