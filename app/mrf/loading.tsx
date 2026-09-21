// app/mrf/loading.tsx
import { TopBar } from "@/components/design/TopBar";
import { Skeleton } from "@/components/design/Skeleton";

export default function MrfLoading() {
  return (
    <div className="flex h-full flex-col">
      <TopBar title="MRF PLANT · RAGHURAM HUME PIPES" backHref="/" />
      <div className="flex-1 space-y-2.5 overflow-y-auto bg-canvas p-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="overflow-hidden rounded-window border border-ink/85 bg-paper p-3"
          >
            <div className="flex items-center justify-between border-b border-sage/70 pb-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="mt-2 space-y-1.5">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-3/4" />
            </div>
            <div className="mt-3 flex gap-2">
              <Skeleton className="h-16 w-16 !rounded-control" />
              <Skeleton className="h-16 w-16 !rounded-control" />
              <Skeleton className="h-16 w-16 !rounded-control" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
