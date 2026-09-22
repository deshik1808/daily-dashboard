"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Horizontal travel, in px, needed to commit to navigating. */
const SWIPE_COMMIT = 60;
/** How much dx must dominate dy for a gesture to count as horizontal. */
const DIRECTION_RATIO = 1.2;

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

  // Temporary on-screen tracer: visit `?swipedebug=1` on a real device.
  const [debug, setDebug] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  useEffect(() => {
    setDebug(new URLSearchParams(window.location.search).get("swipedebug") === "1");
  }, []);
  const trace = (msg: string) => setLog((prev) => [...prev.slice(-17), msg]);

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
    if (debug) trace(`start x=${t.clientX.toFixed(0)} y=${t.clientY.toFixed(0)}`);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const g = gesture.current;
    if (!g || e.touches.length !== 1) return;
    const t = e.touches[0];
    g.lastX = t.clientX;
    g.lastY = t.clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;

    // A cancelled touch can report (0,0), so only trust the final point when
    // it looks real; otherwise use the last position touchmove reported.
    const t = e.changedTouches[0];
    const real = t && !(t.clientX === 0 && t.clientY === 0);
    const dx = (real ? t.clientX : g.lastX) - g.startX;
    const dy = (real ? t.clientY : g.lastY) - g.startY;
    if (debug) trace(`${e.type} dx=${dx.toFixed(0)} dy=${dy.toFixed(0)}${real ? "" : " (last)"}`);

    if (Math.abs(dx) < SWIPE_COMMIT) {
      if (debug) trace(`below threshold (${Math.abs(dx).toFixed(0)} < ${SWIPE_COMMIT})`);
      return;
    }
    if (Math.abs(dx) < Math.abs(dy) * DIRECTION_RATIO) {
      if (debug) trace(`too vertical (dx=${dx.toFixed(0)} dy=${dy.toFixed(0)})`);
      return;
    }

    if (dx < 0 && nextDate) {
      if (debug) trace("-> navigating to nextDate");
      router.push(`/mrf/${nextDate}`);
    } else if (dx > 0 && prevDate) {
      if (debug) trace("-> navigating to prevDate");
      router.push(`/mrf/${prevDate}`);
    } else if (debug) {
      trace("no adjacent date in that direction");
    }
  };

  return (
    <>
      <div
        className={`touch-pan-y${className ? ` ${className}` : ""}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        {children}
      </div>
      {debug && (
        <div className="fixed inset-x-0 bottom-0 z-[999] max-h-48 overflow-y-auto border-t-2 border-lime-400 bg-black/90 p-2 font-mono text-[10px] leading-tight text-lime-300">
          <div className="mb-1 text-white">SWIPE DEBUG — swipe anywhere above</div>
          {log.length === 0 ? (
            <div>waiting for touch...</div>
          ) : (
            log.map((l, i) => <div key={i}>{l}</div>)
          )}
        </div>
      )}
    </>
  );
}
