"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Horizontal travel, in px, needed to commit to navigating. */
const SWIPE_COMMIT = 60;
/** How much dx must dominate dy for a gesture to count as horizontal. */
const DIRECTION_RATIO = 1.2;

type Gesture = { startX: number; startY: number };

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
    gesture.current = { startX: e.clientX, startY: e.clientY };
  };

  // Real devices are unreliable here: some only deliver a couple of move
  // events (or none) before handing the gesture to native scrolling, and the
  // first few px of a genuine horizontal swipe often carry enough vertical
  // noise to misclassify it early. So this only opportunistically claims the
  // gesture to reduce visible scroll flicker — it never gates the decision.
  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g) return;
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) e.preventDefault();
  };

  // The only data actually trustworthy on every device: where the gesture
  // started vs. where it ended, evaluated once it's over (pointerup) or the
  // browser claims it for scrolling (pointercancel) — never during the move.
  const onPointerEnd = (e: React.PointerEvent) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;

    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    if (debug) trace(`${e.type} dx=${dx.toFixed(0)} dy=${dy.toFixed(0)}`);

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
