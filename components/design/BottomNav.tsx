// components/design/BottomNav.tsx
import Link from "next/link";

export function BottomNav({ active }: { active: "home" }) {
  return (
    <div
      className="flex border-t border-ink font-mono text-xs tracking-wide"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <Link
        href="/"
        className={`flex-1 py-2.5 text-center ${active === "home" ? "bg-ink text-paper" : ""}`}
      >
        HOME
      </Link>
    </div>
  );
}
