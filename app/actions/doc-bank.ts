// app/actions/doc-bank.ts
"use server";

import { updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { TAGS } from "@/lib/data";

export interface DocActionResult {
  success: boolean;
  error?: string;
}

function mapDatabaseError(error: { code?: string; message?: string }): string {
  if (error.code === "23505" || error.message?.includes("doc_nodes_unique_name_in_parent")) {
    return "Something with that name is already in this folder.";
  }
  if (error.code === "23514" || error.message?.includes("doc_nodes_url_shape")) {
    return "Link must start with https://";
  }
  if (error.message?.includes("doc_nodes_title_length")) {
    return "Name is too long (max 120 characters).";
  }
  return "Couldn't save. Try again.";
}

export async function createNode(
  parentId: string | null,
  kind: "folder" | "link",
  title: string,
  url?: string | null
): Promise<DocActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You're signed out. Log in again to make changes.",
    };
  }

  const trimmedTitle = (title ?? "").trim();
  if (!trimmedTitle) {
    return {
      success: false,
      error: "Name can't be empty.",
    };
  }

  if (trimmedTitle.length > 120) {
    return {
      success: false,
      error: "Name is too long (max 120 characters).",
    };
  }

  let cleanUrl: string | null = null;
  if (kind === "link") {
    cleanUrl = (url ?? "").trim();
    if (!cleanUrl.startsWith("https://")) {
      return {
        success: false,
        error: "Link must start with https://",
      };
    }
  }

  // Validate max depth <= 5
  if (parentId) {
    let currentParentId: string | null = parentId;
    let depth = 1;

    while (currentParentId) {
      depth += 1;
      if (depth > 5) {
        return {
          success: false,
          error: "Folders can only go 5 levels deep.",
        };
      }

      const {
        data: parentNode,
        error: pError,
      }: {
        data: { id: string; parent_id: string | null } | null;
        error: unknown;
      } = await supabase
        .from("doc_nodes")
        .select("id, parent_id")
        .eq("id", currentParentId)
        .maybeSingle();

      if (pError || !parentNode) {
        break;
      }
      currentParentId = parentNode.parent_id;
    }

    if (depth > 5) {
      return {
        success: false,
        error: "Folders can only go 5 levels deep.",
      };
    }
  }

  const { error } = await supabase.from("doc_nodes").insert({
    parent_id: parentId,
    kind,
    title: trimmedTitle,
    url: cleanUrl,
    created_by: user.id,
  });

  if (error) {
    console.error("Failed to create doc node:", error);
    return {
      success: false,
      error: mapDatabaseError(error),
    };
  }

  updateTag(TAGS.docNodes);
  return { success: true };
}

export async function renameNode(
  id: string,
  title: string,
  url?: string | null
): Promise<DocActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You're signed out. Log in again to make changes.",
    };
  }

  const trimmedTitle = (title ?? "").trim();
  if (!trimmedTitle) {
    return {
      success: false,
      error: "Name can't be empty.",
    };
  }

  if (trimmedTitle.length > 120) {
    return {
      success: false,
      error: "Name is too long (max 120 characters).",
    };
  }

  const { data: existing, error: fetchErr } = await supabase
    .from("doc_nodes")
    .select("id, kind, url")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !existing) {
    console.error("Failed to fetch node for renaming:", fetchErr);
    return {
      success: false,
      error: "Couldn't save. Try again.",
    };
  }

  const updatePayload: { title: string; url?: string | null } = {
    title: trimmedTitle,
  };

  if (existing.kind === "link") {
    const rawUrl = url !== undefined ? url : existing.url;
    const cleanUrl = (rawUrl ?? "").trim();
    if (!cleanUrl.startsWith("https://")) {
      return {
        success: false,
        error: "Link must start with https://",
      };
    }
    updatePayload.url = cleanUrl;
  }

  const { error } = await supabase
    .from("doc_nodes")
    .update(updatePayload)
    .eq("id", id);

  if (error) {
    console.error("Failed to rename doc node:", error);
    return {
      success: false,
      error: mapDatabaseError(error),
    };
  }

  updateTag(TAGS.docNodes);
  return { success: true };
}

export async function deleteNode(id: string): Promise<DocActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You're signed out. Log in again to make changes.",
    };
  }

  const { error } = await supabase.from("doc_nodes").delete().eq("id", id);

  if (error) {
    console.error("Failed to delete doc node:", error);
    return {
      success: false,
      error: mapDatabaseError(error),
    };
  }

  updateTag(TAGS.docNodes);
  return { success: true };
}
