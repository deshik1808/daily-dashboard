// components/design/BulletTextarea.tsx
"use client";

import React, { useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import {
  transformHyphenToBullet,
  handleBulletEnter,
  handleBulletBackspace,
} from "@/lib/notes";

export interface BulletTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onValueChange?: (value: string) => void;
}

export const BulletTextarea = forwardRef<HTMLTextAreaElement, BulletTextareaProps>(
  function BulletTextarea(
    { value, defaultValue, onChange, onKeyDown, onValueChange, className, ...rest },
    forwardedRef
  ) {
    const internalRef = useRef<HTMLTextAreaElement | null>(null);
    const cursorRef = useRef<number | null>(null);

    useImperativeHandle(forwardedRef, () => internalRef.current!);

    useEffect(() => {
      if (cursorRef.current !== null && internalRef.current) {
        internalRef.current.setSelectionRange(cursorRef.current, cursorRef.current);
        cursorRef.current = null;
      }
    });

    const updateText = (newVal: string, newCursor?: number) => {
      if (typeof newCursor === "number") {
        cursorRef.current = newCursor;
      }
      if (internalRef.current) {
        internalRef.current.value = newVal;
        if (typeof newCursor === "number") {
          internalRef.current.setSelectionRange(newCursor, newCursor);
        }
      }
      onValueChange?.(newVal);
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const el = e.currentTarget;
      const original = el.value;
      const transformed = transformHyphenToBullet(original);

      if (transformed !== original) {
        const cursor = el.selectionStart;
        el.value = transformed;
        el.setSelectionRange(cursor, cursor);
        cursorRef.current = cursor;
      }

      onChange?.(e);
      onValueChange?.(el.value);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const el = e.currentTarget;

      if (e.key === "Enter" && !e.shiftKey) {
        const cursor = el.selectionStart;
        const result = handleBulletEnter(el.value, cursor);
        if (result) {
          e.preventDefault();
          updateText(result.text, result.cursor);
          return;
        }
      }

      if (e.key === "Backspace") {
        const cursor = el.selectionStart;
        if (cursor === el.selectionEnd) {
          const result = handleBulletBackspace(el.value, cursor);
          if (result) {
            e.preventDefault();
            updateText(result.text, result.cursor);
            return;
          }
        }
      }

      onKeyDown?.(e);
    };

    return (
      <textarea
        ref={internalRef}
        value={value}
        defaultValue={defaultValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={className}
        {...rest}
      />
    );
  }
);
