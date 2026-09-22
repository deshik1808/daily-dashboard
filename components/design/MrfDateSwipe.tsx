"use client";

import { useRouter } from "next/navigation";
import { useRef, type ReactNode } from "react";

const SWIPE_COMMIT = 60;
const DIRECTION_SLOP = 1.3;

export function MrfDateSwipe({
  prevDate,
  nextDate,
  className,
  children,
}: {
  prevDate: string | null;
  nextDate: string | null;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const start = useRef<{ x: number; y: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return;
    if ((e.target as HTMLElement).closest('[role="dialog"]')) return;
    start.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const s = start.current;
    start.current = null;
    if (!s) return;

    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) < SWIPE_COMMIT || Math.abs(dx) < Math.abs(dy) * DIRECTION_SLOP) return;

    if (dx < 0 && nextDate) router.push(`/mrf/${nextDate}`);
    else if (dx > 0 && prevDate) router.push(`/mrf/${prevDate}`);
  };

  return (
    <div
      className={`touch-pan-y${className ? ` ${className}` : ""}`}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (start.current = null)}
    >
      {children}
    </div>
  );
}
