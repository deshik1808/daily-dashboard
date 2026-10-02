import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDocNodes } from "@/lib/data";
import { buildDocTree, type DocNode } from "@/lib/doc-tree";
import { DocTree } from "@/components/design/DocTree";
import { BottomNav } from "@/components/design/BottomNav";
import { ReplyButton } from "@/components/design/ReplyButton";

export const metadata = {
  title: "Doc Bank",
};

export default async function DocBankPage() {
  const session = await getSession();
  if (session?.role === "operator") {
    redirect("/");
  }

  // `getDocNodes()` is cached and `getSession()` is a local token check, so
  // neither touches the network on a warm cache.
  const nodes = await getDocNodes();
  const tree = buildDocTree((nodes as DocNode[]) ?? []);

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        <DocTree tree={tree} isEditor={session?.role === "editor"} backHref="/" />
      </div>
      <BottomNav active="doc-bank" isOperator={false}>
        <ReplyButton context={{ label: "Doc Bank", path: "/doc-bank" }} role={session?.role} />
      </BottomNav>
    </div>
  );
}
