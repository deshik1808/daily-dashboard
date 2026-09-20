// components/design/DocNodeForm.tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createNode, renameNode } from "@/app/actions/doc-bank";
import type { DocNodeKind } from "@/lib/doc-tree";

interface DocNodeFormProps {
  mode: "create" | "rename";
  kind: DocNodeKind;
  parentId?: string | null;
  nodeId?: string;
  initialTitle?: string;
  initialUrl?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function DocNodeForm({
  mode,
  kind,
  parentId = null,
  nodeId,
  initialTitle = "",
  initialUrl = "",
  onSuccess,
  onCancel,
}: DocNodeFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [url, setUrl] = useState(initialUrl);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setError("Name can't be empty.");
      return;
    }

    if (trimmedTitle.length > 120) {
      setError("Name is too long (max 120 characters).");
      return;
    }

    let cleanUrl: string | null = null;
    if (kind === "link") {
      cleanUrl = url.trim();
      if (!cleanUrl.startsWith("https://")) {
        setError("Link must start with https://");
        return;
      }
    }

    setIsPending(true);
    setError(null);

    let result;
    if (mode === "create") {
      result = await createNode(parentId, kind, trimmedTitle, cleanUrl);
    } else {
      if (!nodeId) {
        setIsPending(false);
        setError("Couldn't save. Try again.");
        return;
      }
      result = await renameNode(nodeId, trimmedTitle, cleanUrl);
    }

    setIsPending(false);

    if (!result.success) {
      setError(result.error ?? "Couldn't save. Try again.");
      return;
    }

    onSuccess();
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="my-1.5 flex flex-col gap-2 rounded-control border border-sage bg-paper p-2.5 font-mono text-xs"
    >
      <div className="flex flex-col gap-1">
        <label
          htmlFor={`title-${nodeId ?? "new"}`}
          className="text-[10px] font-bold tracking-wide text-muted"
        >
          {kind === "folder" ? "FOLDER NAME" : "LINK TITLE"}
        </label>
        <input
          id={`title-${nodeId ?? "new"}`}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder={kind === "folder" ? "e.g. DRAWINGS" : "e.g. Work Order 2024-25"}
          className="rounded-control border border-ink p-1.5 font-sans text-xs focus:outline-hidden focus:ring-2 focus:ring-accent-ink disabled:opacity-50"
          disabled={isPending}
          autoFocus
        />
      </div>

      {kind === "link" && (
        <div className="flex flex-col gap-1">
          <label
            htmlFor={`url-${nodeId ?? "new"}`}
            className="text-[10px] font-bold tracking-wide text-muted"
          >
            URL
          </label>
          <input
            id={`url-${nodeId ?? "new"}`}
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://drive.google.com/..."
            className="rounded-control border border-ink p-1.5 font-sans text-xs focus:outline-hidden focus:ring-2 focus:ring-accent-ink disabled:opacity-50"
            disabled={isPending}
          />
        </div>
      )}

      {error && (
        <p role="alert" className="text-alert">
          {error}
        </p>
      )}

      <div className="mt-1 flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="min-h-[36px] rounded-control border border-ink bg-ink px-3 py-1 font-mono text-xs font-bold tracking-wide text-paper hover:bg-ink/90 focus:outline-hidden focus:ring-2 focus:ring-accent-ink disabled:opacity-50"
        >
          {mode === "create"
            ? isPending
              ? "CREATING..."
              : "CREATE"
            : isPending
              ? "SAVING..."
              : "SAVE"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="min-h-[36px] rounded-control border border-ink bg-paper px-3 py-1 font-mono text-xs font-bold tracking-wide text-ink hover:bg-mist focus:outline-hidden focus:ring-2 focus:ring-accent-ink disabled:opacity-50"
        >
          CANCEL
        </button>
      </div>
    </form>
  );
}
