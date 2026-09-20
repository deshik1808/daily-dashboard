// components/design/MrfLogForm.tsx
"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createMrfLog, updateMrfLog, type MrfFormState } from "@/app/actions/mrf-logs";
import { Window } from "@/components/design/Window";
import { PhotoUploader } from "@/components/design/PhotoUploader";
import { BulletTextarea } from "@/components/design/BulletTextarea";
import {
  FormField,
  inputClass,
  buttonPrimaryClass,
  buttonSecondaryClass,
} from "@/components/design/FormField";

const EMPTY_STATE: MrfFormState = {};

export function MrfLogForm({
  logId,
  initial,
}: {
  logId?: string;
  initial?: { log_date: string; note: string; photo_paths: string[] };
}) {
  const action = logId ? updateMrfLog.bind(null, logId) : createMrfLog;
  const [state, formAction, pending] = useActionState(action, EMPTY_STATE);
  const errors = state?.errors ?? {};

  // Kept in state so the photo input can drive the submit button's disabled state.
  const [logDate, setLogDate] = useState(initial?.log_date ?? "");
  const [photoCount, setPhotoCount] = useState(initial?.photo_paths.length ?? 0);

  return (
    <form action={formAction} className="space-y-2.5">
      <Window title={logId ? "EDIT LOG" : "NEW LOG"}>
        <div className="space-y-3">
          <FormField id="log_date" label="DATE" error={errors.log_date}>
            <input
              id="log_date"
              name="log_date"
              type="date"
              required
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              disabled={pending}
              className={inputClass}
            />
          </FormField>

          <FormField id="note" label="NOTE (REQUIRED)" error={errors.note}>
            <BulletTextarea
              id="note"
              name="note"
              rows={5}
              required
              defaultValue={initial?.note ?? ""}
              disabled={pending}
              className={`${inputClass} font-sans text-[13px]`}
              placeholder="What happened at the plant today (type - for bullet points)..."
            />
          </FormField>

          <PhotoUploader
            logDate={logDate}
            initialPaths={initial?.photo_paths ?? []}
            error={errors.photo_paths}
            onCountChange={setPhotoCount}
          />
        </div>
      </Window>

      {state?.error && (
        <p role="alert" className="font-mono text-xs text-alert">
          {state.error}
        </p>
      )}

      <div className="flex gap-2 pb-2">
        <button
          type="submit"
          disabled={pending || photoCount === 0}
          className={buttonPrimaryClass}
        >
          {pending ? "SAVING..." : logId ? "SAVE CHANGES" : "ADD LOG"}
        </button>
        <Link href="/mrf" className={buttonSecondaryClass}>
          CANCEL
        </Link>
      </div>

      {photoCount === 0 && (
        <p className="pb-2 font-mono text-[10px] text-muted">
          ATTACH AT LEAST ONE PHOTO TO SAVE.
        </p>
      )}
    </form>
  );
}
