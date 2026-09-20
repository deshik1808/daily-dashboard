// components/design/DeleteConfirm.tsx
"use client";

import { useState, useTransition } from "react";

interface DeleteConfirmProps {
  /** A bound server action that soft-deletes the row and redirects on success. */
  action: () => Promise<{ error?: string }>;
  label?: string;
  confirmText?: string;
}

/**
 * Two-step delete. The first tap arms the control, the second performs the
 * soft delete, so a stray tap on a phone can't remove a row.
 */
export function DeleteConfirm({
  action,
  label = "DELETE",
  confirmText = "This hides the record from all reports and totals. Continue?",
}: DeleteConfirmProps) {
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result?.error) {
        setError(result.error);
        setArmed(false);
      }
    });
  }

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="min-h-[40px] w-full rounded-control border border-alert px-3 py-2 font-mono text-xs font-bold tracking-wide text-alert hover:bg-alert hover:text-paper focus:outline-hidden focus:ring-2 focus:ring-alert"
      >
        {label}
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <p role="alert" className="font-mono text-[11px] text-alert">
        {confirmText}
      </p>
      {error && <p className="font-mono text-[11px] text-alert">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          className="min-h-[40px] flex-1 rounded-control border border-alert bg-alert px-3 py-2 font-mono text-xs font-bold tracking-wide text-paper focus:outline-hidden focus:ring-2 focus:ring-alert disabled:opacity-50"
        >
          {pending ? "DELETING..." : "YES, DELETE"}
        </button>
        <button
          type="button"
          onClick={() => setArmed(false)}
          disabled={pending}
          className="min-h-[40px] flex-1 rounded-control border border-ink bg-paper px-3 py-2 font-mono text-xs font-bold tracking-wide text-ink hover:bg-mist focus:outline-hidden focus:ring-2 focus:ring-accent-ink disabled:opacity-50"
        >
          KEEP
        </button>
      </div>
    </div>
  );
}
