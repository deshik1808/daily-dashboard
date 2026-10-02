// components/design/BottomNav.tsx
import Link from "next/link";

const TABS = [
  { key: "home", label: "HOME", href: "/" },
  { key: "doc-bank", label: "DOC BANK", href: "/doc-bank" },
] as const;

/**
 * The app's bottom tab bar, and the positioning context for anything that
 * floats just above it — pass the REPLY pill as `children`.
 */
export function BottomNav({
  active,
  children,
  isOperator = false,
}: {
  active: "home" | "doc-bank";
  children?: React.ReactNode;
  isOperator?: boolean;
}) {
  const visibleTabs = isOperator
    ? TABS.filter((t) => t.key !== "doc-bank")
    : TABS;

  return (
    <div className="relative flex border-t border-ink bg-mist font-mono text-xs tracking-wide">
      {children}
      {visibleTabs.map((tab) => {
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
            {isActive && (
              <span
                className="absolute inset-x-0 top-0 h-[2px] bg-accent"
                aria-hidden
              />
            )}
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
