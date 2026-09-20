// components/design/TopBar.tsx
import Link from "next/link";

/**
 * Stacked horizontal rules flanking the title — the "═══ TITLE ═══"
 * heading band look. Rendered as a repeating 1px-ink line gradient so it
 * stays crisp in the 1-bit design system.
 */
function HatchRule({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`h-3.5 text-ink ${className?.includes("shrink-0") ? "" : "flex-1"} ${className ?? ""}`}
      style={{
        backgroundImage:
          "repeating-linear-gradient(to bottom, currentColor 0 1px, transparent 1px 3px)",
      }}
    />
  );
}

function BackIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-5 w-5 shrink-0 block"}
    >
      <rect width="18" height="18" x="3" y="3" rx="2" fill="var(--color-mist)" />
      <path d="m14 16-4-4 4-4" fill="none" />
    </svg>
  );
}

export function TopBar({
  title,
  action,
  backHref,
  onBack,
}: {
  title: string;
  action?: React.ReactNode;
  backHref?: string;
  onBack?: () => void;
}) {
  const backButton = backHref ? (
    <Link
      href={backHref}
      aria-label="Back"
      className="inline-flex shrink-0 items-center justify-center p-0 text-ink transition-opacity hover:opacity-70 active:opacity-50 focus:outline-none"
    >
      <BackIcon />
    </Link>
  ) : onBack ? (
    <button
      type="button"
      onClick={onBack}
      aria-label="Back"
      className="inline-flex shrink-0 items-center justify-center p-0 text-ink transition-opacity hover:opacity-70 active:opacity-50 focus:outline-none"
    >
      <BackIcon />
    </button>
  ) : null;

  return (
    <div className="relative flex items-center border-b border-ink bg-mist px-3 py-2.5 font-mono text-sm font-bold tracking-wide">
      <div className="flex w-full items-center overflow-hidden">
        {backButton ? (
          <div className="mr-2 flex flex-1 items-center overflow-hidden">
            <HatchRule className="w-2 shrink-0" />
            {backButton}
            <HatchRule />
          </div>
        ) : (
          <HatchRule className="mr-2" />
        )}

        <span className="whitespace-nowrap">{title}</span>
        <HatchRule className="ml-2" />
      </div>

      {action ? (
        <div className="absolute right-3 top-1/2 z-10 -translate-y-1/2">{action}</div>
      ) : null}
    </div>
  );
}

