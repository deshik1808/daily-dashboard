// components/design/FormField.tsx
import type { ReactNode } from "react";

export const inputClass =
  "mt-1 min-h-[44px] w-full rounded-control border border-ink px-2 py-1.5 text-[15px] focus:outline-hidden focus:ring-2 focus:ring-accent-ink disabled:opacity-50";

export const buttonPrimaryClass =
  "min-h-[44px] flex-1 rounded-control border border-ink bg-ink px-3 py-2 font-mono text-xs font-bold tracking-wide text-paper hover:bg-ink/90 focus:outline-hidden focus:ring-2 focus:ring-accent-ink disabled:opacity-50";

export const buttonSecondaryClass =
  "min-h-[44px] flex-1 rounded-control border border-ink bg-paper px-3 py-2 text-center font-mono text-xs font-bold tracking-wide text-ink hover:bg-mist focus:outline-hidden focus:ring-2 focus:ring-accent-ink disabled:opacity-50";

export function FormField({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="font-mono text-[10px] font-bold tracking-wide text-muted">
        {label}
      </label>
      {children}
      {error && (
        <p role="alert" className="mt-0.5 font-mono text-[10px] text-alert">
          {error}
        </p>
      )}
    </div>
  );
}
