// components/design/BottomNav.tsx
import Link from "next/link";

const TABS = [
  { key: "home", label: "HOME", href: "/" },
  { key: "doc-bank", label: "DOC BANK", href: "/doc-bank" },
] as const;

/**
 * The app's bottom tab bar, and the positioning context for anything that
 * floats just above it — pass the REPLY pill as `children`.
 *
 * No `env(safe-area-inset-bottom)` padding here: the root layout already insets
 * the whole app shell by the safe area, so adding it again made the nav a full
 * inset taller than intended on any device that reports one.
 */
export function BottomNav({
  active,
  children,
}: {
  active: "home" | "doc-bank";
  children?: React.ReactNode;
}) {
  return (
    <div className="relative flex border-t border-ink bg-mist font-mono text-xs tracking-wide">
      {children}
      {TABS.map((tab) => {
        const isActive = active === tab.key;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={`relative flex min-h-[48px] flex-1 items-center justify-center py-2.5 text-center ${
              isActive ? "bg-ink text-paper" : "text-muted"
            }`}
          >
            {isActive && <span className="absolute inset-x-0 top-0 h-[2px] bg-accent" aria-hidden />}
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
