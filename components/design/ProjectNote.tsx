// components/design/ProjectNote.tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updateProjectNote } from "@/app/actions/update-project-note";
import { Window } from "./Window";
import { BulletTextarea } from "./BulletTextarea";
import { FormattedNote } from "./FormattedNote";

interface ProjectNoteProps {
  phaseAgencyId: string;
  initialNote?: string | null;
  isEditor: boolean;
  title?: string;
}

export function ProjectNote({
  phaseAgencyId,
  initialNote,
  isEditor,
  title = "NOTE",
}: ProjectNoteProps) {
  const router = useRouter();
  const [note, setNote] = useState(initialNote ?? "");
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(initialNote ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  // If viewer and no note exists, render nothing
  if (!isEditor && !note) {
    return null;
  }

  function handleCancel() {
    setIsEditing(false);
    setText(note);
    setError(null);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) {
      setError("Note cannot be empty");
      return;
    }

    setIsPending(true);
    setError(null);

    const result = await updateProjectNote(phaseAgencyId, text);
    setIsPending(false);

    if (!result.success) {
      setError(result.error ?? "Failed to save note");
      return;
    }

    setNote(result.note ?? trimmed);
    setIsEditing(false);
    router.refresh();
  }

  if (isEditing) {
    return (
      <Window title={title}>
        <form onSubmit={handleSave} className="flex flex-col gap-2">
          <label
            htmlFor={`note-input-${phaseAgencyId}`}
            className="font-mono text-[10px] font-bold tracking-wide text-muted"
          >
            NOTE
          </label>
          <BulletTextarea
            id={`note-input-${phaseAgencyId}`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onValueChange={setText}
            rows={3}
            className="w-full rounded-control border border-ink p-2 font-sans text-[13px] focus:outline-hidden focus:ring-2 focus:ring-accent-ink"
            placeholder="Enter project note (type - for bullet points)..."
            disabled={isPending}
            autoFocus
          />
          {error && (
            <p role="alert" className="font-mono text-xs text-alert">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="min-h-[36px] rounded-control border border-ink bg-ink px-3 py-1.5 font-mono text-xs font-bold tracking-wide text-paper hover:bg-ink/90 focus:outline-hidden focus:ring-2 focus:ring-accent-ink disabled:opacity-50"
            >
              {isPending ? "SAVING..." : "SAVE"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isPending}
              className="min-h-[36px] rounded-control border border-ink bg-paper px-3 py-1.5 font-mono text-xs font-bold tracking-wide text-ink hover:bg-mist focus:outline-hidden focus:ring-2 focus:ring-accent-ink disabled:opacity-50"
            >
              CANCEL
            </button>
          </div>
        </form>
      </Window>
    );
  }

  if (!note && isEditor) {
    return (
      <Window title={title}>
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-muted">No note added yet.</span>
          <button
            type="button"
            onClick={() => {
              setText("");
              setError(null);
              setIsEditing(true);
            }}
            className="min-h-[32px] rounded-control border border-ink px-2.5 py-1 font-mono text-[10px] font-bold tracking-wide text-ink hover:bg-ink hover:text-paper focus:outline-hidden focus:ring-2 focus:ring-accent-ink"
          >
            ADD NOTE
          </button>
        </div>
      </Window>
    );
  }

  return (
    <Window title={title}>
      <div className="flex items-start justify-between gap-2">
        <FormattedNote content={note} className="flex-1" />
        {isEditor && (
          <button
            type="button"
            onClick={() => {
              setText(note);
              setError(null);
              setIsEditing(true);
            }}
            className="min-h-[32px] shrink-0 rounded-control border border-ink px-2.5 py-1 font-mono text-[10px] font-bold tracking-wide text-ink hover:bg-ink hover:text-paper focus:outline-hidden focus:ring-2 focus:ring-accent-ink"
          >
            EDIT NOTE
          </button>
        )}
      </div>
    </Window>
  );
}
