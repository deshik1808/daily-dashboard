// components/design/RuntimeForm.tsx
"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  createRuntimeLog,
  updateRuntimeLog,
  type RuntimeFormState,
} from "@/app/actions/screen-runtime";
import { Window } from "@/components/design/Window";
import { ScreenDot } from "@/components/design/ScreenDot";
import {
  FormField,
  inputClass,
  buttonPrimaryClass,
  buttonSecondaryClass,
} from "@/components/design/FormField";

export interface RuntimeInitialValues {
  log_date: string;
  shift: "Day" | "Night";
  red_runtime_min: number;
  red_breakdown_min: number;
  red_breakdown_reasons: string | null;
  yellow_runtime_min: number;
  yellow_breakdown_min: number;
  yellow_breakdown_reasons: string | null;
}

interface RuntimeFormProps {
  phaseAgencyId: string;
  logId?: string;
  initial?: RuntimeInitialValues;
}

const EMPTY_STATE: RuntimeFormState = {};

export function RuntimeForm({ phaseAgencyId, logId, initial }: RuntimeFormProps) {
  const action = logId
    ? updateRuntimeLog.bind(null, logId, phaseAgencyId)
    : createRuntimeLog.bind(null, phaseAgencyId);

  const [state, formAction, pending] = useActionState(action, EMPTY_STATE);
  const errors = state?.errors ?? {};

  const initRedRunH =
    initial !== undefined ? Math.floor(initial.red_runtime_min / 60) : "";
  const initRedRunM =
    initial !== undefined ? initial.red_runtime_min % 60 : "";
  const initRedBdH =
    initial !== undefined && initial.red_breakdown_min > 0
      ? Math.floor(initial.red_breakdown_min / 60)
      : "";
  const initRedBdM =
    initial !== undefined && initial.red_breakdown_min > 0
      ? initial.red_breakdown_min % 60
      : "";

  const initYellowRunH =
    initial !== undefined ? Math.floor(initial.yellow_runtime_min / 60) : "";
  const initYellowRunM =
    initial !== undefined ? initial.yellow_runtime_min % 60 : "";
  const initYellowBdH =
    initial !== undefined && initial.yellow_breakdown_min > 0
      ? Math.floor(initial.yellow_breakdown_min / 60)
      : "";
  const initYellowBdM =
    initial !== undefined && initial.yellow_breakdown_min > 0
      ? initial.yellow_breakdown_min % 60
      : "";

  return (
    <form action={formAction} className="space-y-3 font-mono">
      <Window title="REPORT">
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField id="log_date" label="DATE" error={errors.log_date}>
              <input
                id="log_date"
                name="log_date"
                type="date"
                required
                defaultValue={initial?.log_date ?? ""}
                disabled={pending}
                className={inputClass}
              />
            </FormField>

            <FormField id="shift" label="SHIFT" error={errors.shift}>
              <select
                id="shift"
                name="shift"
                required
                defaultValue={initial?.shift ?? "Day"}
                disabled={pending}
                className={inputClass}
              >
                <option value="Day">Day</option>
                <option value="Night">Night</option>
              </select>
            </FormField>
          </div>
          <p className="text-[10px] text-muted">
            Night shift: use the date the shift started.
          </p>
        </div>
      </Window>

      {/* Red Screen */}
      <Window
        title={
          <span className="flex items-center gap-1.5 font-bold">
            <ScreenDot screen="red" />
            RED SCREEN
          </span>
        }
      >
        <div className="space-y-3">
          {/* Runtime */}
          <div>
            <span className="block text-[10px] font-bold text-muted">RUNTIME</span>
            <div className="mt-1 flex items-center gap-2">
              <input
                id="red_runtime_h"
                name="red_runtime_h"
                type="number"
                inputMode="numeric"
                min="0"
                max="12"
                placeholder="0"
                defaultValue={initRedRunH}
                disabled={pending}
                className="w-16 min-h-[44px] rounded-control border border-ink bg-paper px-2 py-1.5 text-center text-sm"
              />
              <span className="text-xs text-muted">h</span>
              <input
                id="red_runtime_m"
                name="red_runtime_m"
                type="number"
                inputMode="numeric"
                min="0"
                max="59"
                placeholder="0"
                defaultValue={initRedRunM}
                disabled={pending}
                className="w-16 min-h-[44px] rounded-control border border-ink bg-paper px-2 py-1.5 text-center text-sm"
              />
              <span className="text-xs text-muted">m</span>
            </div>
            {errors.red_runtime && (
              <p role="alert" className="mt-1 text-[10px] text-alert">
                {errors.red_runtime}
              </p>
            )}
            {errors.red_runtime_h && (
              <p role="alert" className="mt-1 text-[10px] text-alert">
                {errors.red_runtime_h}
              </p>
            )}
            {errors.red_runtime_m && (
              <p role="alert" className="mt-1 text-[10px] text-alert">
                {errors.red_runtime_m}
              </p>
            )}
          </div>

          {/* Breakdown */}
          <div>
            <span className="block text-[10px] font-bold text-muted">BREAKDOWN</span>
            <div className="mt-1 flex items-center gap-2">
              <input
                id="red_breakdown_h"
                name="red_breakdown_h"
                type="number"
                inputMode="numeric"
                min="0"
                max="12"
                placeholder="0"
                defaultValue={initRedBdH}
                disabled={pending}
                className="w-16 min-h-[44px] rounded-control border border-ink bg-paper px-2 py-1.5 text-center text-sm"
              />
              <span className="text-xs text-muted">h</span>
              <input
                id="red_breakdown_m"
                name="red_breakdown_m"
                type="number"
                inputMode="numeric"
                min="0"
                max="59"
                placeholder="0"
                defaultValue={initRedBdM}
                disabled={pending}
                className="w-16 min-h-[44px] rounded-control border border-ink bg-paper px-2 py-1.5 text-center text-sm"
              />
              <span className="text-xs text-muted">m</span>
            </div>
            {errors.red_breakdown_h && (
              <p role="alert" className="mt-1 text-[10px] text-alert">
                {errors.red_breakdown_h}
              </p>
            )}
            {errors.red_breakdown_m && (
              <p role="alert" className="mt-1 text-[10px] text-alert">
                {errors.red_breakdown_m}
              </p>
            )}
          </div>

          {/* Reasons */}
          <FormField
            id="red_breakdown_reasons"
            label="REASONS"
            error={errors.red_breakdown_reasons}
          >
            <input
              id="red_breakdown_reasons"
              name="red_breakdown_reasons"
              type="text"
              placeholder="e.g. Belt cut 55 min, power cut 20 min"
              defaultValue={initial?.red_breakdown_reasons ?? ""}
              disabled={pending}
              className={`${inputClass} font-sans`}
            />
          </FormField>
        </div>
      </Window>

      {/* Yellow Screen */}
      <Window
        title={
          <span className="flex items-center gap-1.5 font-bold">
            <ScreenDot screen="yellow" />
            YELLOW SCREEN
          </span>
        }
      >
        <div className="space-y-3">
          {/* Runtime */}
          <div>
            <span className="block text-[10px] font-bold text-muted">RUNTIME</span>
            <div className="mt-1 flex items-center gap-2">
              <input
                id="yellow_runtime_h"
                name="yellow_runtime_h"
                type="number"
                inputMode="numeric"
                min="0"
                max="12"
                placeholder="0"
                defaultValue={initYellowRunH}
                disabled={pending}
                className="w-16 min-h-[44px] rounded-control border border-ink bg-paper px-2 py-1.5 text-center text-sm"
              />
              <span className="text-xs text-muted">h</span>
              <input
                id="yellow_runtime_m"
                name="yellow_runtime_m"
                type="number"
                inputMode="numeric"
                min="0"
                max="59"
                placeholder="0"
                defaultValue={initYellowRunM}
                disabled={pending}
                className="w-16 min-h-[44px] rounded-control border border-ink bg-paper px-2 py-1.5 text-center text-sm"
              />
              <span className="text-xs text-muted">m</span>
            </div>
            {errors.yellow_runtime && (
              <p role="alert" className="mt-1 text-[10px] text-alert">
                {errors.yellow_runtime}
              </p>
            )}
            {errors.yellow_runtime_h && (
              <p role="alert" className="mt-1 text-[10px] text-alert">
                {errors.yellow_runtime_h}
              </p>
            )}
            {errors.yellow_runtime_m && (
              <p role="alert" className="mt-1 text-[10px] text-alert">
                {errors.yellow_runtime_m}
              </p>
            )}
          </div>

          {/* Breakdown */}
          <div>
            <span className="block text-[10px] font-bold text-muted">BREAKDOWN</span>
            <div className="mt-1 flex items-center gap-2">
              <input
                id="yellow_breakdown_h"
                name="yellow_breakdown_h"
                type="number"
                inputMode="numeric"
                min="0"
                max="12"
                placeholder="0"
                defaultValue={initYellowBdH}
                disabled={pending}
                className="w-16 min-h-[44px] rounded-control border border-ink bg-paper px-2 py-1.5 text-center text-sm"
              />
              <span className="text-xs text-muted">h</span>
              <input
                id="yellow_breakdown_m"
                name="yellow_breakdown_m"
                type="number"
                inputMode="numeric"
                min="0"
                max="59"
                placeholder="0"
                defaultValue={initYellowBdM}
                disabled={pending}
                className="w-16 min-h-[44px] rounded-control border border-ink bg-paper px-2 py-1.5 text-center text-sm"
              />
              <span className="text-xs text-muted">m</span>
            </div>
            {errors.yellow_breakdown_h && (
              <p role="alert" className="mt-1 text-[10px] text-alert">
                {errors.yellow_breakdown_h}
              </p>
            )}
            {errors.yellow_breakdown_m && (
              <p role="alert" className="mt-1 text-[10px] text-alert">
                {errors.yellow_breakdown_m}
              </p>
            )}
          </div>

          {/* Reasons */}
          <FormField
            id="yellow_breakdown_reasons"
            label="REASONS"
            error={errors.yellow_breakdown_reasons}
          >
            <input
              id="yellow_breakdown_reasons"
              name="yellow_breakdown_reasons"
              type="text"
              placeholder="e.g. Idle, no material"
              defaultValue={initial?.yellow_breakdown_reasons ?? ""}
              disabled={pending}
              className={`${inputClass} font-sans`}
            />
          </FormField>
        </div>
      </Window>

      {state?.error && (
        <p role="alert" className="text-xs text-alert">
          {state.error}
        </p>
      )}

      <div className="flex gap-2 pt-1 pb-2">
        <button type="submit" disabled={pending} className={buttonPrimaryClass}>
          {pending ? "SAVING..." : logId ? "SAVE CHANGES" : "SAVE"}
        </button>
        <Link href={`/phase/${phaseAgencyId}`} className={buttonSecondaryClass}>
          CANCEL
        </Link>
      </div>
    </form>
  );
}
