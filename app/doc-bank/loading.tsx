// app/doc-bank/loading.tsx
import { TopBar } from "@/components/design/TopBar";
import { Skeleton } from "@/components/design/Skeleton";

export default function DocBankLoading() {
  return (
    <div className="flex h-full flex-col">
      <TopBar title="DOC BANK" backHref="/" />
      <div className="flex-1 space-y-2.5 overflow-y-auto bg-canvas p-3">
        <div className="overflow-hidden rounded-window border border-ink/85 bg-paper p-3">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 shrink-0" />
                <Skeleton className={`h-4 ${i % 2 === 0 ? "w-48" : "w-32"}`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
