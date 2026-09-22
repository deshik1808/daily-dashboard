"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

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

  // Temporary on-screen tracer: visit `?swipedebug=1` on a real device to see
  // exactly which pointer events actually arrive, since Chrome DevTools touch
  // emulation doesn't faithfully reproduce real touch-vs-scroll arbitration.
  const [debug, setDebug] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  useEffect(() => {
    setDebug(new URLSearchParams(window.location.search).get("swipedebug") === "1");
  }, []);
  const trace = (msg: string) => setLog((prev) => [...prev.slice(-17), msg]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (debug) trace(`down type=${e.pointerType} x=${e.clientX.toFixed(0)} y=${e.clientY.toFixed(0)}`);
    if (e.pointerType === "mouse") return;
    if ((e.target as HTMLElement).closest('[role="dialog"]')) return;
    gesture.current = { startX: e.clientX, startY: e.clientY, locked: null };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g) return;

    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;

    if (g.locked === null) {
      if (Math.abs(dx) < LOCK_THRESHOLD && Math.abs(dy) < LOCK_THRESHOLD) return;
      g.locked = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (debug) trace(`lock=${g.locked} dx=${dx.toFixed(0)} dy=${dy.toFixed(0)}`);
    }

    if (g.locked === "x") e.preventDefault();
  };

  const onPointerEnd = (e: React.PointerEvent) => {
    const g = gesture.current;
    gesture.current = null;
    const dx = g ? e.clientX - g.startX : 0;
    if (debug) trace(`${e.type} locked=${g?.locked ?? "none"} dx=${dx.toFixed(0)}`);
    if (!g || g.locked !== "x") return;

    if (Math.abs(dx) < SWIPE_COMMIT) {
      if (debug) trace(`below threshold (${Math.abs(dx).toFixed(0)} < ${SWIPE_COMMIT})`);
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
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
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
