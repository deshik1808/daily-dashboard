// components/design/RuntimeForm.tsx
"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  createRuntimeLog,
  updateRuntimeLog,
  type RuntimeFormState,
} from "@/app/actions/screen-runtime";
import { Window } from "@/components/design/Window";
import { ScreenDot } from "@/components/design/ScreenDot";
import {
  formatDuration,
  parseMeterReading,
  runtimeFromMeter,
  type MeterReadings,
} from "@/lib/runtime";
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
  /** Saved audit readings, when the shift was entered by meter. */
  meter?: MeterReadings;
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

      <ScreenSection
        screen="red"
        title="RED SCREEN"
        reasonsPlaceholder="e.g. Belt cut 55 min, power cut 20 min"
        runtimeMin={initial?.red_runtime_min}
        breakdownMin={initial?.red_breakdown_min}
        reasons={initial?.red_breakdown_reasons ?? ""}
        meterOpen={initial?.meter?.red_open}
        meterClose={initial?.meter?.red_close}
        errors={errors}
        pending={pending}
      />

      <ScreenSection
        screen="yellow"
        title="YELLOW SCREEN"
        reasonsPlaceholder="e.g. Idle, no material"
        runtimeMin={initial?.yellow_runtime_min}
        breakdownMin={initial?.yellow_breakdown_min}
        reasons={initial?.yellow_breakdown_reasons ?? ""}
        meterOpen={initial?.meter?.yellow_open}
        meterClose={initial?.meter?.yellow_close}
        errors={errors}
        pending={pending}
      />

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

const smallInput =
  "w-16 min-h-[44px] rounded-control border border-ink bg-paper px-2 py-1.5 text-center text-sm";
const meterInput =
  "w-28 min-h-[44px] rounded-control border border-ink bg-paper px-2 py-1.5 text-center text-sm";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 text-[10px] text-alert">
      {message}
    </p>
  );
}

interface HmInputsProps {
  name: string;
  defaultMin: number | undefined;
  blankZero?: boolean;
  disabled: boolean;
}

function HmInputs({ name, defaultMin, blankZero, disabled }: HmInputsProps) {
  const blank = defaultMin === undefined || (blankZero && defaultMin === 0);
  return (
    <div className="mt-1 flex items-center gap-2">
      <input
        id={`${name}_h`}
        name={`${name}_h`}
        type="number"
        inputMode="numeric"
        min="0"
        max="12"
        placeholder="0"
        defaultValue={blank ? "" : Math.floor(defaultMin / 60)}
        disabled={disabled}
        className={smallInput}
      />
      <span className="text-xs text-muted">h</span>
      <input
        id={`${name}_m`}
        name={`${name}_m`}
        type="number"
        inputMode="numeric"
        min="0"
        max="59"
        placeholder="0"
        defaultValue={blank ? "" : defaultMin % 60}
        disabled={disabled}
        className={smallInput}
      />
      <span className="text-xs text-muted">m</span>
    </div>
  );
}

interface ScreenSectionProps {
  screen: "red" | "yellow";
  title: string;
  reasonsPlaceholder: string;
  runtimeMin: number | undefined;
  breakdownMin: number | undefined;
  reasons: string;
  meterOpen?: number | null;
  meterClose?: number | null;
  errors: Record<string, string>;
  pending: boolean;
}

function ScreenSection({
  screen,
  title,
  reasonsPlaceholder,
  runtimeMin,
  breakdownMin,
  reasons,
  meterOpen,
  meterClose,
  errors,
  pending,
}: ScreenSectionProps) {
  const hasSavedMeter = meterOpen != null && meterClose != null;
  const [mode, setMode] = useState<"manual" | "meter">(
    hasSavedMeter ? "meter" : "manual"
  );
  const [open, setOpen] = useState(hasSavedMeter ? String(meterOpen) : "");
  const [close, setClose] = useState(hasSavedMeter ? String(meterClose) : "");

  const openParsed = parseMeterReading(open);
  const closeParsed = parseMeterReading(close);
  const calc =
    openParsed.ok &&
    closeParsed.ok &&
    openParsed.value !== null &&
    closeParsed.value !== null
      ? runtimeFromMeter(openParsed.value, closeParsed.value)
      : null;

  return (
    <Window
      title={
        <span className="flex items-center gap-1.5 font-bold">
          <ScreenDot screen={screen} />
          {title}
        </span>
      }
    >
      <div className="space-y-3">
        <input type="hidden" name={`${screen}_mode`} value={mode} />

        <div className="flex gap-2" role="group" aria-label="Entry method">
          {(["manual", "meter"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              disabled={pending}
              aria-pressed={mode === m}
              className={`min-h-[36px] flex-1 rounded-control border border-ink px-2 text-[10px] font-bold ${
                mode === m ? "bg-ink text-paper" : "bg-paper text-muted"
              }`}
            >
              {m === "manual" ? "ENTER HOURS" : "METER READING"}
            </button>
          ))}
        </div>

        {mode === "meter" ? (
          <div>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label
                  htmlFor={`${screen}_meter_open`}
                  className="block text-[10px] font-bold text-muted"
                >
                  OPENING
                </label>
                <input
                  id={`${screen}_meter_open`}
                  name={`${screen}_meter_open`}
                  type="text"
                  inputMode="decimal"
                  placeholder="1000.0"
                  value={open}
                  onChange={(e) => setOpen(e.target.value)}
                  disabled={pending}
                  className={`mt-1 ${meterInput}`}
                />
              </div>
              <div>
                <label
                  htmlFor={`${screen}_meter_close`}
                  className="block text-[10px] font-bold text-muted"
                >
                  CLOSING
                </label>
                <input
                  id={`${screen}_meter_close`}
                  name={`${screen}_meter_close`}
                  type="text"
                  inputMode="decimal"
                  placeholder="1009.5"
                  value={close}
                  onChange={(e) => setClose(e.target.value)}
                  disabled={pending}
                  className={`mt-1 ${meterInput}`}
                />
              </div>
            </div>
            <FieldError message={errors[`${screen}_meter_open`]} />
            <FieldError message={errors[`${screen}_meter_close`]} />
            <p className="mt-2 text-[10px] text-muted">
              {calc && !("error" in calc) ? (
                <>
                  Runtime{" "}
                  <span className="font-bold text-ink">
                    {formatDuration(calc.runtimeMin)}
                  </span>
                  {" · "}Breakdown{" "}
                  <span className="font-bold text-ink">
                    {formatDuration(calc.breakdownMin)}
                  </span>{" "}
                  (rest of 12 h shift)
                </>
              ) : (
                "Hour-meter readings in hours (e.g. 1009.5). Breakdown = 12 h minus runtime."
              )}
            </p>
          </div>
        ) : (
          <>
            <div>
              <span className="block text-[10px] font-bold text-muted">RUNTIME</span>
              <HmInputs
                name={`${screen}_runtime`}
                defaultMin={runtimeMin}
                disabled={pending}
              />
              <FieldError message={errors[`${screen}_runtime`]} />
              <FieldError message={errors[`${screen}_runtime_h`]} />
              <FieldError message={errors[`${screen}_runtime_m`]} />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-muted">BREAKDOWN</span>
              <HmInputs
                name={`${screen}_breakdown`}
                defaultMin={breakdownMin}
                blankZero
                disabled={pending}
              />
              <FieldError message={errors[`${screen}_breakdown_h`]} />
              <FieldError message={errors[`${screen}_breakdown_m`]} />
            </div>
          </>
        )}

        <FormField
          id={`${screen}_breakdown_reasons`}
          label="REASONS"
          error={errors[`${screen}_breakdown_reasons`]}
        >
          <input
            id={`${screen}_breakdown_reasons`}
            name={`${screen}_breakdown_reasons`}
            type="text"
            placeholder={reasonsPlaceholder}
            defaultValue={reasons}
            disabled={pending}
            className={`${inputClass} font-sans`}
          />
        </FormField>
      </div>
    </Window>
  );
}
