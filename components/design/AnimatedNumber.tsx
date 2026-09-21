"use client";

import { useEffect, useRef, useState } from "react";

interface AnimatedNumberProps {
  value: number | string | null | undefined;
  decimals?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  formatLocale?: boolean;
}

export function AnimatedNumber({
  value,
  decimals = 2,
  duration = 1400,
  prefix = "",
  suffix = "",
  className = "",
  formatLocale = true,
}: AnimatedNumberProps) {
  const numericTarget =
    typeof value === "string" ? parseFloat(value) : Number(value ?? 0);
  const target = isNaN(numericTarget) ? 0 : numericTarget;

  const [displayValue, setDisplayValue] = useState<number>(0);
  const currentValueRef = useRef<number>(0);

  useEffect(() => {
    const startValue = currentValueRef.current;
    const endValue = target;
    let startTime: number | null = null;
    let rafId: number | null = null;

    const step = (timestamp: number) => {
      if (startTime === null) {
        startTime = timestamp;
      }
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // easeOutCubic: visible, satisfying rolling counter that decelerates smoothly
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (endValue - startValue) * ease;

      currentValueRef.current = current;
      setDisplayValue(current);

      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        currentValueRef.current = endValue;
        setDisplayValue(endValue);
      }
    };

    rafId = requestAnimationFrame(step);

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [target, duration]);

  const formatted = formatLocale
    ? displayValue.toLocaleString("en-IN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    : displayValue.toFixed(decimals);

  return (
    <span className={className} aria-label={`${prefix}${target}${suffix}`}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
