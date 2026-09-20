// components/design/Window.tsx
export function Window({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-window border border-ink/85 bg-paper">
      <div className="flex items-center gap-2 border-b border-ink/85 bg-mist px-2.5 py-1.5 font-mono text-xs font-bold tracking-wide">
        <span className="flex gap-1" aria-hidden>
          <span className="h-[7px] w-[7px] rounded-full bg-accent" />
          <span className="h-[7px] w-[7px] rounded-full bg-sage" />
        </span>
        <span>{title}</span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}
