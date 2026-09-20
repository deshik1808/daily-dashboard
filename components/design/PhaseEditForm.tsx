// components/design/PhaseEditForm.tsx
"use client";

import Link from "next/link";
import { useActionState } from "react";
import { PHASE_STATUSES, PHASES, AGENCIES } from "@/lib/phase";
import { updatePhase, type PhaseFormState } from "@/app/actions/phase-master";
import { Window } from "@/components/design/Window";
import { BulletTextarea } from "@/components/design/BulletTextarea";
import {
  FormField,
  inputClass,
  buttonPrimaryClass,
  buttonSecondaryClass,
} from "@/components/design/FormField";

const EMPTY_STATE: PhaseFormState = {};

export function PhaseEditForm({
  phaseAgencyId,
  initial,
}: {
  phaseAgencyId: string;
  initial: {
    phase: string;
    agency: string;
    order_qty_mt: number;
    status: string;
    current_note: string;
  };
}) {
  const action = updatePhase.bind(null, phaseAgencyId);
  const [state, formAction, pending] = useActionState(action, EMPTY_STATE);
  const errors = state?.errors ?? {};

  return (
    <form action={formAction} className="space-y-2.5">
      <Window title="PHASE SETTINGS">
        <div className="space-y-3">
          <FormField id="phase" label="PHASE" error={errors.phase}>
            <select
              id="phase"
              name="phase"
              required
              defaultValue={initial.phase}
              disabled={pending}
              className={inputClass}
            >
              {PHASES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </FormField>

          <FormField id="agency" label="AGENCY" error={errors.agency}>
            <select
              id="agency"
              name="agency"
              required
              defaultValue={initial.agency}
              disabled={pending}
              className={inputClass}
            >
              {AGENCIES.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </FormField>

          <FormField id="order_qty_mt" label="ORDER QTY (MT)" error={errors.order_qty_mt}>
            <input
              id="order_qty_mt"
              name="order_qty_mt"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              required
              defaultValue={String(initial.order_qty_mt)}
              disabled={pending}
              className={inputClass}
            />
          </FormField>

          <FormField id="status" label="STATUS" error={errors.status}>
            <select
              id="status"
              name="status"
              required
              defaultValue={initial.status}
              disabled={pending}
              className={inputClass}
            >
              {PHASE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </FormField>

          <FormField id="current_note" label="NOTE (OPTIONAL)" error={errors.current_note}>
            <BulletTextarea
              id="current_note"
              name="current_note"
              rows={3}
              defaultValue={initial.current_note}
              disabled={pending}
              className={`${inputClass} font-sans text-[13px]`}
              placeholder="Enter note (type - for bullet points)..."
            />
          </FormField>
        </div>
      </Window>

      {state?.error && (
        <p role="alert" className="font-mono text-xs text-alert">
          {state.error}
        </p>
      )}

      <div className="flex gap-2 pb-2">
        <button type="submit" disabled={pending} className={buttonPrimaryClass}>
          {pending ? "SAVING..." : "SAVE CHANGES"}
        </button>
        <Link href={`/phase/${phaseAgencyId}`} className={buttonSecondaryClass}>
          CANCEL
        </Link>
      </div>
    </form>
  );
}
