// components/design/DocNodeRow.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteNode } from "@/app/actions/doc-bank";
import { getDeleteConfirmMessage, type DocTreeNode } from "@/lib/doc-tree";
import { DocNodeForm } from "./DocNodeForm";

interface DocNodeRowProps {
  node: DocTreeNode;
  isEditor: boolean;
  isEditMode: boolean;
  expandedFolderIds: Set<string>;
  onToggleExpand: (id: string) => void;
  activeCreate: { parentId: string | null; kind: "folder" | "link" } | null;
  onStartCreate: (parentId: string | null, kind: "folder" | "link") => void;
  onCancelCreate: () => void;
}

export function DocNodeRow({
  node,
  isEditor,
  isEditMode,
  expandedFolderIds,
  onToggleExpand,
  activeCreate,
  onStartCreate,
  onCancelCreate,
}: DocNodeRowProps) {
  const router = useRouter();
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isFolder = node.kind === "folder";
  const isExpanded = expandedFolderIds.has(node.id);

  // Indent is 12px per level, capped at level 3 (max 36px)
  const indentPx = Math.min(node.depth - 1, 3) * 12;
  const childIndentPx = Math.min(node.depth, 3) * 12;

  async function handleDelete() {
    const confirmMessage = getDeleteConfirmMessage(node);
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    const result = await deleteNode(node.id);
    setIsDeleting(false);

    if (!result.success) {
      setDeleteError(result.error ?? "Couldn't save. Try again.");
      return;
    }

    router.refresh();
  }

  if (isRenaming) {
    return (
      <div style={{ paddingLeft: `${indentPx}px` }}>
        <DocNodeForm
          mode="rename"
          kind={node.kind}
          nodeId={node.id}
          initialTitle={node.title}
          initialUrl={node.url ?? ""}
          onSuccess={() => setIsRenaming(false)}
          onCancel={() => setIsRenaming(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div
        className="flex min-h-[44px] items-center justify-between gap-2 border-b border-sage/50 py-1.5 transition-colors hover:bg-ink/[0.02]"
        style={{ paddingLeft: `${indentPx}px` }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {isFolder ? (
            <button
              type="button"
              onClick={() => onToggleExpand(node.id)}
              aria-expanded={isExpanded}
              className="flex h-7 w-7 shrink-0 items-center justify-center font-mono text-sm text-ink hover:bg-mist"
            >
              {isExpanded ? "v" : ">"}
            </button>
          ) : (
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center font-mono text-xs text-muted"
              aria-hidden
            >
              -&gt;
            </span>
          )}

          <div className="min-w-0 flex-1 text-[13px]">
            {isFolder ? (
              <button
                type="button"
                onClick={() => onToggleExpand(node.id)}
                className="block w-full truncate text-left font-mono font-bold tracking-wide text-ink hover:underline"
              >
                {node.title}
              </button>
            ) : (
              <a
                href={node.url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex max-w-full items-center gap-1.5 font-mono text-[13px] text-ink transition-colors hover:text-accent-ink"
              >
                <span className="truncate underline decoration-sage/80 underline-offset-[3px] transition-colors group-hover:decoration-accent-ink">
                  {node.title}
                </span>
                <span
                  className="shrink-0 font-mono text-xs text-accent-ink/70 transition-colors group-hover:text-accent-ink"
                  aria-hidden
                >
                  ↗
                </span>
              </a>
            )}
          </div>
        </div>

        {isEditMode && (
          <div className="flex shrink-0 items-center gap-1.5 font-mono text-[10px]">
            <button
              type="button"
              onClick={() => setIsRenaming(true)}
              className="min-h-[32px] rounded-control border border-sage px-2 py-1 font-bold text-ink hover:border-ink hover:bg-mist"
            >
              RENAME
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="min-h-[32px] rounded-control border border-sage px-2 py-1 font-bold text-alert hover:border-alert hover:bg-alert/5 disabled:opacity-50"
            >
              {isDeleting ? "..." : "DELETE"}
            </button>
          </div>
        )}
      </div>

      {deleteError && (
        <div
          style={{ paddingLeft: `${indentPx}px` }}
          className="py-1 font-mono text-xs text-alert"
        >
          {deleteError}
        </div>
      )}

      {isFolder && isExpanded && (
        <div className="flex flex-col">
          {node.children.map((child) => (
            <DocNodeRow
              key={child.id}
              node={child}
              isEditor={isEditor}
              isEditMode={isEditMode}
              expandedFolderIds={expandedFolderIds}
              onToggleExpand={onToggleExpand}
              activeCreate={activeCreate}
              onStartCreate={onStartCreate}
              onCancelCreate={onCancelCreate}
            />
          ))}

          {isEditMode && (
            <div
              className="my-1.5 flex flex-col gap-1"
              style={{ paddingLeft: `${childIndentPx}px` }}
            >
              {activeCreate?.parentId === node.id ? (
                <DocNodeForm
                  mode="create"
                  kind={activeCreate.kind}
                  parentId={node.id}
                  onSuccess={onCancelCreate}
                  onCancel={onCancelCreate}
                />
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onStartCreate(node.id, "folder")}
                    className="min-h-[32px] rounded-control border border-dashed border-sage px-2.5 py-1 font-mono text-[10px] font-bold tracking-wide text-ink hover:border-solid hover:border-ink hover:bg-mist"
                  >
                    + FOLDER
                  </button>
                  <button
                    type="button"
                    onClick={() => onStartCreate(node.id, "link")}
                    className="min-h-[32px] rounded-control border border-dashed border-sage px-2.5 py-1 font-mono text-[10px] font-bold tracking-wide text-ink hover:border-solid hover:border-ink hover:bg-mist"
                  >
                    + LINK
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
