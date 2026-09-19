// components/design/TopBar.tsx
import Link from "next/link";

export function TopBar({ title, showBack = false }: { title: string; showBack?: boolean }) {
  return (
    <div className="flex items-center gap-2 border-b border-ink px-3 py-2.5 font-mono text-sm font-bold tracking-wide">
      {showBack ? (
        <Link
          href="/"
          aria-label="Back"
          className="flex h-[22px] w-[22px] items-center justify-center rounded-control border border-ink"
        >
          &lt;
        </Link>
      ) : (
        <span className="h-3 w-3 bg-dither" aria-hidden />
      )}
      <span className="flex-1">{title}</span>
    </div>
  );
}
