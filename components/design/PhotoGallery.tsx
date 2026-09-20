"use client";

// Thumbnail grid + an in-page fullscreen viewer. Photos must never open in a
// new tab: the Editor reviews a whole day's log at once, so paging between
// shots has to happen without leaving the page.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
/** Horizontal travel, in px, before a drag commits to the next photo. */
const SWIPE_COMMIT = 56;
/** A pointer that moves less than this still counts as a tap. */
const TAP_SLOP = 8;
const DOUBLE_TAP_MS = 300;

export interface GalleryPhoto {
  path: string;
  url: string;
}

interface View {
  scale: number;
  x: number;
  y: number;
}

const IDENTITY: View = { scale: 1, x: 0, y: 0 };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function PhotoGallery({ photos }: { photos: GalleryPhoto[] }) {
  const [openAt, setOpenAt] = useState<number | null>(null);

  if (photos.length === 0) return null;

  return (
    <>
      <div className="mb-2.5 grid grid-cols-3 gap-1.5">
        {photos.map((photo, i) => (
          <button
            key={photo.path}
            type="button"
            onClick={() => setOpenAt(i)}
            className="block"
            aria-label={`View photo ${i + 1} of ${photos.length}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt=""
              className="h-24 w-full rounded-control border border-ink object-cover"
            />
          </button>
        ))}
      </div>
      {openAt !== null && (
        <Lightbox photos={photos} startIndex={openAt} onClose={() => setOpenAt(null)} />
      )}
    </>
  );
}

function Lightbox({
  photos,
  startIndex,
  onClose,
}: {
  photos: GalleryPhoto[];
  startIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [drag, setDrag] = useState(0);
  const [animate, setAnimate] = useState(false);
  const [view, setView] = useState<View>(IDENTITY);
  const [width, setWidth] = useState(0);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const imageRefs = useRef<(HTMLImageElement | null)[]>([]);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{
    mode: "none" | "swipe" | "pan" | "pinch";
    startX: number;
    startY: number;
    startDist: number;
    start: View;
    moved: number;
  }>({ mode: "none", startX: 0, startY: 0, startDist: 0, start: IDENTITY, moved: 0 });
  const lastTap = useRef(0);

  // The track is translated in px, so it needs the live viewport width.
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Belt and braces: the app shell is already fixed, but nothing underneath
  // should scroll while the viewer owns the screen.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const goTo = useCallback(
    (next: number) => {
      setAnimate(true);
      setDrag(0);
      setView(IDENTITY);
      setIndex(clamp(next, 0, photos.length - 1));
    },
    [photos.length]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") goTo(index - 1);
      else if (e.key === "ArrowRight") goTo(index + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, index, onClose]);

  /** Keeps a zoomed photo's edges from drifting inside the viewport. */
  const clampView = useCallback(
    (next: View): View => {
      const img = imageRefs.current[index];
      if (!img || next.scale <= 1) return { scale: Math.max(1, next.scale), x: 0, y: 0 };
      const maxX = (img.clientWidth * (next.scale - 1)) / 2;
      const maxY = (img.clientHeight * (next.scale - 1)) / 2;
      return {
        scale: next.scale,
        x: clamp(next.x, -maxX, maxX),
        y: clamp(next.y, -maxY, maxY),
      };
    },
    [index]
  );

  const onPointerDown = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const points = [...pointers.current.values()];
    if (points.length === 2) {
      gesture.current = {
        mode: "pinch",
        startX: (points[0].x + points[1].x) / 2,
        startY: (points[0].y + points[1].y) / 2,
        startDist: distance(points[0], points[1]) || 1,
        start: view,
        moved: 0,
      };
    } else if (points.length === 1) {
      setAnimate(false);
      gesture.current = {
        mode: view.scale > 1 ? "pan" : "swipe",
        startX: e.clientX,
        startY: e.clientY,
        startDist: 0,
        start: view,
        moved: 0,
      };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    const points = [...pointers.current.values()];

    if (g.mode === "pinch" && points.length >= 2) {
      const ratio = distance(points[0], points[1]) / g.startDist;
      const scale = clamp(g.start.scale * ratio, 1, MAX_SCALE);
      const growth = scale / g.start.scale;
      setView(clampView({ scale, x: g.start.x * growth, y: g.start.y * growth }));
      return;
    }

    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    g.moved = Math.max(g.moved, Math.hypot(dx, dy));

    if (g.mode === "pan") {
      setView(clampView({ scale: g.start.scale, x: g.start.x + dx, y: g.start.y + dy }));
    } else if (g.mode === "swipe") {
      // Rubber-band at the two ends so the deck feels bounded.
      const atEdge = (index === 0 && dx > 0) || (index === photos.length - 1 && dx < 0);
      setDrag(atEdge ? dx * 0.35 : dx);
    }
  };

  const endPointer = (e: React.PointerEvent) => {
    // `gesture.current` is reset below, so snapshot what this gesture was.
    const mode = gesture.current.mode;
    const moved = gesture.current.moved;
    const hadPointer = pointers.current.has(e.pointerId);
    pointers.current.delete(e.pointerId);

    if (mode === "pinch") {
      if (pointers.current.size === 0) {
        gesture.current.mode = "none";
        if (view.scale <= 1.02) {
          setAnimate(true);
          setView(IDENTITY);
        }
      }
      return;
    }

    if (pointers.current.size > 0) return;
    gesture.current.mode = "none";

    if (mode === "swipe") {
      if (Math.abs(drag) > SWIPE_COMMIT) {
        goTo(index + (drag < 0 ? 1 : -1));
      } else {
        setAnimate(true);
        setDrag(0);
      }
    }

    if (!hadPointer || moved >= TAP_SLOP) return;

    const rect = imageRefs.current[index]?.getBoundingClientRect();
    const hitImage =
      !!rect &&
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom;
    const now = Date.now();

    if (hitImage && now - lastTap.current < DOUBLE_TAP_MS) {
      lastTap.current = 0;
      setAnimate(true);
      if (view.scale > 1) {
        setView(IDENTITY);
      } else {
        // Zoom about the tapped point rather than the centre of the photo.
        const offsetX = rect ? e.clientX - (rect.left + rect.width / 2) : 0;
        const offsetY = rect ? e.clientY - (rect.top + rect.height / 2) : 0;
        setView(
          clampView({
            scale: DOUBLE_TAP_SCALE,
            x: offsetX * (1 - DOUBLE_TAP_SCALE),
            y: offsetY * (1 - DOUBLE_TAP_SCALE),
          })
        );
      }
    } else if (hitImage) {
      lastTap.current = now;
    } else if (view.scale === 1) {
      // A tap on the backdrop dismisses; a tap on the photo never does.
      onClose();
    }
  };

  // Only ever rendered from a click handler, so `document` exists by now.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex touch-none flex-col bg-bezel"
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
    >
      <div className="flex items-center justify-between border-b border-paper/20 px-3 py-2 font-mono text-xs font-bold tracking-wide text-paper">
        <span>
          {index + 1} / {photos.length}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="min-h-[32px] rounded-control border border-paper/70 px-2.5 py-1 text-[10px] tracking-wide text-paper"
        >
          CLOSE
        </button>
      </div>

      <div
        ref={viewportRef}
        className="relative flex-1 overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
      >
        <div
          className="flex h-full"
          style={{
            transform: `translate3d(${-index * width + drag}px, 0, 0)`,
            transition: animate ? "transform 220ms ease-out" : "none",
          }}
        >
          {photos.map((photo, i) => (
            <div
              key={photo.path}
              className="flex h-full flex-none items-center justify-center p-3"
              style={{ width: width || "100%" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={(el) => {
                  imageRefs.current[i] = el;
                }}
                src={photo.url}
                alt=""
                draggable={false}
                className="max-h-full max-w-full select-none object-contain"
                style={
                  i === index
                    ? {
                        transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
                        transition: animate ? "transform 220ms ease-out" : "none",
                      }
                    : undefined
                }
              />
            </div>
          ))}
        </div>

        {photos.length > 1 && (
          <>
            <NavButton side="left" disabled={index === 0} onClick={() => goTo(index - 1)} />
            <NavButton
              side="right"
              disabled={index === photos.length - 1}
              onClick={() => goTo(index + 1)}
            />
          </>
        )}
      </div>

      <p className="px-3 pb-3 pt-2 text-center font-mono text-[10px] tracking-wide text-paper/60">
        SWIPE TO BROWSE · DOUBLE-TAP OR PINCH TO ZOOM
      </p>
    </div>,
    document.body
  );
}

function NavButton({
  side,
  disabled,
  onClick,
}: {
  side: "left" | "right";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={side === "left" ? "Previous photo" : "Next photo"}
      className={`absolute top-1/2 hidden h-10 w-10 -translate-y-1/2 rounded-control border border-paper/70 bg-bezel/80 font-mono text-sm font-bold text-paper disabled:opacity-25 sm:block ${
        side === "left" ? "left-2" : "right-2"
      }`}
    >
      {side === "left" ? "‹" : "›"}
    </button>
  );
}
