// app/doc-bank/page.tsx
import { isEditor } from "@/lib/auth";
import { getDocNodes } from "@/lib/data";
import { buildDocTree, type DocNode } from "@/lib/doc-tree";
import { DocTree } from "@/components/design/DocTree";
import { BottomNav } from "@/components/design/BottomNav";
import { ReplyButton } from "@/components/design/ReplyButton";

export const metadata = {
  title: "Doc Bank",
};

export default async function DocBankPage() {
  // `getDocNodes()` is cached and `isEditor()` is a local token check, so
  // neither touches the network on a warm cache.
  const [user, nodes] = await Promise.all([isEditor(), getDocNodes()]);

  const tree = buildDocTree((nodes as DocNode[]) ?? []);

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        <DocTree tree={tree} isEditor={user} backHref="/" />
      </div>
      <BottomNav active="doc-bank">
        <ReplyButton context={{ label: "Doc Bank", path: "/doc-bank" }} isEditor={user} />
      </BottomNav>
    </div>
  );
}
