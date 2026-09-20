// app/doc-bank/page.tsx
import { createClient } from "@/lib/supabase/server";
import { buildDocTree, type DocNode } from "@/lib/doc-tree";
import { DocTree } from "@/components/design/DocTree";
import { BottomNav } from "@/components/design/BottomNav";
import { ReplyButton } from "@/components/design/ReplyButton";

export const metadata = {
  title: "Doc Bank",
};

export default async function DocBankPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: nodes, error } = await supabase
    .from("doc_nodes")
    .select("id, parent_id, kind, title, url, created_by, created_at, updated_at");

  if (error) {
    console.error("Failed to fetch doc nodes:", error.message);
  }

  const tree = buildDocTree((nodes as DocNode[]) ?? []);

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        <DocTree tree={tree} isEditor={!!user} backHref="/" />
      </div>
      <BottomNav active="doc-bank" />
      <ReplyButton context={{ label: "Doc Bank", path: "/doc-bank" }} isEditor={!!user} />
    </div>
  );
}
