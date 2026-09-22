"use client";

import { useRouter } from "next/navigation";
import { useRef, type ReactNode } from "react";

/** Total movement, in px, before we decide this gesture is horizontal vs. vertical. */
const LOCK_THRESHOLD = 10;
/** Horizontal travel, in px, needed to commit to navigating once locked horizontal. */
const SWIPE_COMMIT = 60;

type Gesture = { startX: number; startY: number; locked: "x" | "y" | null };

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
  const gesture = useRef<Gesture | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return;
    if ((e.target as HTMLElement).closest('[role="dialog"]')) return;
    gesture.current = { startX: e.clientX, startY: e.clientY, locked: null };
  };

  // Real touch swipes rarely move in a perfectly straight line, and once
  // `touch-action: pan-y` lets the browser see vertical-leaning motion it can
  // hand the whole gesture to native scrolling (firing pointercancel, not
  // pointerup) without waiting on JS. Deciding the axis early from a small
  // deadzone, then claiming it via preventDefault, is what keeps a mostly
  // horizontal swipe from being swallowed as a scroll.
  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g) return;

    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;

    if (g.locked === null) {
      if (Math.abs(dx) < LOCK_THRESHOLD && Math.abs(dy) < LOCK_THRESHOLD) return;
      g.locked = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }

    if (g.locked === "x") e.preventDefault();
  };

  const onPointerEnd = (e: React.PointerEvent) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g || g.locked !== "x") return;

    const dx = e.clientX - g.startX;
    if (Math.abs(dx) < SWIPE_COMMIT) return;

    if (dx < 0 && nextDate) router.push(`/mrf/${nextDate}`);
    else if (dx > 0 && prevDate) router.push(`/mrf/${prevDate}`);
  };

  return (
    <div
      className={`touch-pan-y${className ? ` ${className}` : ""}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    >
      {children}
    </div>
  );
}
