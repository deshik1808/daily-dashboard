// components/design/BottomNav.tsx
import Link from "next/link";

const TABS = [
  { key: "home", label: "HOME", href: "/" },
  { key: "doc-bank", label: "DOC BANK", href: "/doc-bank" },
] as const;

export function BottomNav({ active }: { active: "home" | "doc-bank" }) {
  return (
    <div
      className="flex border-t border-ink bg-mist font-mono text-xs tracking-wide"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
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
