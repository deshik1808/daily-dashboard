"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

/** Horizontal travel, in px, needed to commit to navigating. */
const SWIPE_COMMIT = 60;
/** How much dx must dominate dy for a gesture to count as horizontal. */
const DIRECTION_RATIO = 1.2;
/** Movement, in px, before the content starts following the finger. */
const DRAG_REVEAL = 8;
/** How much of the drag is kept when there is no day to swipe to. */
const EDGE_RESISTANCE = 0.25;

type Gesture = { startX: number; startY: number; lastX: number; lastY: number };

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
  const surface = useRef<HTMLDivElement | null>(null);

  // A swipe can only ever land on a neighbour, so warm both up front instead
  // of paying for the round trip once the finger has already lifted.
  useEffect(() => {
    if (prevDate) router.prefetch(`/mrf/${prevDate}`);
    if (nextDate) router.prefetch(`/mrf/${nextDate}`);
  }, [router, prevDate, nextDate]);

  // Driven straight through the DOM node: touchmove fires about once a frame,
  // and re-rendering a day's whole content that often just to shift it
  // sideways is how a drag ends up feeling worse than no drag at all.
  const offsetBy = (px: number, animated: boolean) => {
    const el = surface.current;
    if (!el) return;
    el.style.transition = animated ? "transform 180ms ease-out" : "";
    el.style.transform = px === 0 ? "" : `translate3d(${px}px, 0, 0)`;
  };

  // Touch events, not pointer events: Android hands a vertical-leaning gesture
  // to native scrolling within ~10px and fires pointercancel, whose
  // coordinates Chrome zeroes out — so pointer data cannot say where the
  // finger actually travelled. touchmove/touchend keep reporting real
  // positions even while the browser is scrolling.
  const onTouchStart = (e: React.TouchEvent) => {
    gesture.current = null;
    if (e.touches.length !== 1) return;
    if ((e.target as HTMLElement).closest('[role="dialog"]')) return;

    const t = e.touches[0];
    gesture.current = { startX: t.clientX, startY: t.clientY, lastX: t.clientX, lastY: t.clientY };
    offsetBy(0, false);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const g = gesture.current;
    if (!g || e.touches.length !== 1) return;

    const t = e.touches[0];
    g.lastX = t.clientX;
    g.lastY = t.clientY;

    // Cosmetic only. The commit below never trusts a mid-gesture reading,
    // because the browser can take the gesture away before it finishes.
    const dx = t.clientX - g.startX;
    const dy = t.clientY - g.startY;
    if (Math.abs(dx) < DRAG_REVEAL || Math.abs(dx) < Math.abs(dy)) return;

    const hasDay = dx < 0 ? nextDate : prevDate;
    offsetBy(hasDay ? dx : dx * EDGE_RESISTANCE, false);
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const g = gesture.current;
    gesture.current = null;
    offsetBy(0, true);
    if (!g) return;

    // A cancelled touch can report (0,0), so only trust the final point when
    // it looks real; otherwise use the last position touchmove reported.
    const t = e.changedTouches[0];
    const real = t && !(t.clientX === 0 && t.clientY === 0);
    const dx = (real ? t.clientX : g.lastX) - g.startX;
    const dy = (real ? t.clientY : g.lastY) - g.startY;

    if (Math.abs(dx) < SWIPE_COMMIT) return;
    if (Math.abs(dx) < Math.abs(dy) * DIRECTION_RATIO) return;

    if (dx < 0 && nextDate) router.push(`/mrf/${nextDate}`);
    else if (dx > 0 && prevDate) router.push(`/mrf/${prevDate}`);
  };

  return (
    <div
      ref={surface}
      className={`touch-pan-y${className ? ` ${className}` : ""}`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      {children}
    </div>
  );
}
