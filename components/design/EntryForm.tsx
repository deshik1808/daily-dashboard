// components/design/EntryForm.tsx
"use client";

import Link from "next/link";
import { useActionState } from "react";
import { MATERIAL_FIELDS, SHIFTS, type MaterialKey } from "@/lib/entries";
import { createEntry, updateEntry, type EntryFormState } from "@/app/actions/bio-mining-entries";
import { Window } from "@/components/design/Window";
import {
  FormField,
  inputClass,
  buttonPrimaryClass,
  buttonSecondaryClass,
} from "@/components/design/FormField";

export interface EntryFormValues {
  report_date: string;
  shift: string;
  inward_mt: number | string;
  remarks: string | null;
  soil_mt: number | null;
  rdf_mt: number | null;
  stones_mt: number | null;
  inert_mt: number | null;
  steel_mt: number | null;
  tyre_mt: number | null;
  wood_mt: number | null;
  glass_mt: number | null;
  iron_scrap_mt: number | null;
  wires_cables_mt: number | null;
  others_mt: number | null;
}

interface EntryFormProps {
  phaseAgencyId: string;
  entryId?: string;
  initial?: EntryFormValues;
}

const EMPTY_STATE: EntryFormState = {};

function numValue(v: number | string | null | undefined) {
  return v === null || v === undefined ? "" : String(v);
}

export function EntryForm({ phaseAgencyId, entryId, initial }: EntryFormProps) {
  const action = entryId
    ? updateEntry.bind(null, entryId, phaseAgencyId)
    : createEntry.bind(null, phaseAgencyId);

  const [state, formAction, pending] = useActionState(action, EMPTY_STATE);
  const errors = state?.errors ?? {};

  return (
    <form action={formAction} className="space-y-2.5">
      <Window title="REPORT">
        <div className="space-y-3">
          <FormField id="report_date" label="DATE" error={errors.report_date}>
            <input
              id="report_date"
              name="report_date"
              type="date"
              required
              defaultValue={initial?.report_date ?? ""}
              disabled={pending}
              className={inputClass}
            />
          </FormField>

          <FormField id="shift" label="SHIFT" error={errors.shift}>
            <select
              id="shift"
              name="shift"
              required
              defaultValue={initial?.shift ?? "Full day"}
              disabled={pending}
              className={inputClass}
            >
              {SHIFTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </FormField>

          <FormField id="inward_mt" label="INWARD (MT)" error={errors.inward_mt}>
            <input
              id="inward_mt"
              name="inward_mt"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              required
              defaultValue={numValue(initial?.inward_mt)}
              disabled={pending}
              className={inputClass}
            />
          </FormField>
        </div>
      </Window>

      <Window title="DISPOSED MATERIALS (MT)">
        <p className="mb-2.5 font-mono text-[10px] text-muted">
          LEAVE BLANK IF NOT RECORDED.
        </p>
        <div className="grid grid-cols-2 gap-x-2 gap-y-3">
          {MATERIAL_FIELDS.map((f) => (
            <FormField key={f.key} id={f.key} label={f.label} error={errors[f.key]}>
              <input
                id={f.key}
                name={f.key}
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                defaultValue={numValue(initial?.[f.key as MaterialKey])}
                disabled={pending}
                className={inputClass}
              />
            </FormField>
          ))}
        </div>
      </Window>

      <Window title="REMARKS">
        <FormField id="remarks" label="OPTIONAL" error={errors.remarks}>
          <textarea
            id="remarks"
            name="remarks"
            rows={3}
            defaultValue={initial?.remarks ?? ""}
            disabled={pending}
            className={`${inputClass} font-sans text-[13px]`}
          />
        </FormField>
      </Window>

      {state?.error && (
        <p role="alert" className="font-mono text-xs text-alert">
          {state.error}
        </p>
      )}

      <div className="flex gap-2 pb-2">
        <button type="submit" disabled={pending} className={buttonPrimaryClass}>
          {pending ? "SAVING..." : entryId ? "SAVE CHANGES" : "ADD ENTRY"}
        </button>
        <Link href={`/phase/${phaseAgencyId}`} className={buttonSecondaryClass}>
          CANCEL
        </Link>
      </div>
    </form>
  );
}
