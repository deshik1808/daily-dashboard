// components/design/DocTree.tsx
"use client";

import { useState } from "react";
import type { DocTreeNode } from "@/lib/doc-tree";
import { TopBar } from "./TopBar";
import { DocNodeRow } from "./DocNodeRow";
import { DocNodeForm } from "./DocNodeForm";

interface DocTreeProps {
  tree: DocTreeNode[];
  isEditor: boolean;
  /** Where the top bar's back button goes. Omitted = no back button. */
  backHref?: string;
}

export function DocTree({ tree, isEditor, backHref }: DocTreeProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set());
  const [activeCreate, setActiveCreate] = useState<{
    parentId: string | null;
    kind: "folder" | "link";
  } | null>(null);

  function handleToggleExpand(id: string) {
    setExpandedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleStartCreate(parentId: string | null, kind: "folder" | "link") {
    setActiveCreate({ parentId, kind });
  }

  function handleCancelCreate() {
    setActiveCreate(null);
  }

  const isEmpty = tree.length === 0;

  return (
    <div className="flex h-full flex-col">
      <TopBar
        title="DOC BANK"
        backHref={backHref}
        action={
          isEditor ? (
            <button
              type="button"
              onClick={() => {
                setIsEditMode((prev) => !prev);
                setActiveCreate(null);
              }}
              className="rounded-control border border-ink px-2.5 py-1 font-mono text-[10px] font-bold tracking-wide hover:bg-ink hover:text-paper"
            >
              {isEditMode ? "DONE" : "EDIT"}
            </button>
          ) : null
        }
      />

      <div className="flex-1 overflow-y-auto bg-canvas p-3">
        {isEmpty ? (
          <div className="py-6 text-center">
            {isEditor ? (
              <div className="flex flex-col items-center gap-3">
                <p className="font-mono text-xs text-muted">
                  {isEditMode
                    ? "Create your first folder or link below:"
                    : "No documents yet. Click EDIT to add a folder."}
                </p>
                {!isEditMode && (
                  <button
                    type="button"
                    onClick={() => setIsEditMode(true)}
                    className="min-h-[36px] rounded-control border border-ink bg-ink px-3 py-1.5 font-mono text-xs font-bold tracking-wide text-paper hover:bg-ink/90"
                  >
                    EDIT DOC BANK
                  </button>
                )}
              </div>
            ) : (
              <p className="font-mono text-xs text-muted">No documents yet.</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col overflow-hidden rounded-window border border-ink/85 bg-paper px-2.5">
            {tree.map((node) => (
              <DocNodeRow
                key={node.id}
                node={node}
                isEditor={isEditor}
                isEditMode={isEditMode}
                expandedFolderIds={expandedFolderIds}
                onToggleExpand={handleToggleExpand}
                activeCreate={activeCreate}
                onStartCreate={handleStartCreate}
                onCancelCreate={handleCancelCreate}
              />
            ))}
          </div>
        )}

        {isEditMode && (
          <div className="mt-4 pt-2">
            {activeCreate?.parentId === null ? (
              <DocNodeForm
                mode="create"
                kind={activeCreate.kind}
                parentId={null}
                onSuccess={handleCancelCreate}
                onCancel={handleCancelCreate}
              />
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleStartCreate(null, "folder")}
                  className="min-h-[36px] rounded-control border border-dashed border-ink px-3 py-1.5 font-mono text-xs font-bold tracking-wide text-ink hover:border-solid hover:bg-mist"
                >
                  + FOLDER
                </button>
                <button
                  type="button"
                  onClick={() => handleStartCreate(null, "link")}
                  className="min-h-[36px] rounded-control border border-dashed border-ink px-3 py-1.5 font-mono text-xs font-bold tracking-wide text-ink hover:border-solid hover:bg-mist"
                >
                  + LINK
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
