// app/phase/[id]/loading.tsx
import { TopBar } from "@/components/design/TopBar";
import {
  SkeletonWindow,
  SkeletonEntries,
} from "@/components/design/Skeleton";
import {
  CountingSkeletonStatGrid,
  LoadingPercentage,
  LoadingMaterialTable,
} from "@/components/design/LoadingCounter";

export default function PhaseLoading() {
  return (
    <div className="flex h-full flex-col">
      <TopBar title="LOADING PHASE DATA..." backHref="/" />
      <div className="flex-1 space-y-2.5 overflow-y-auto bg-canvas p-3">
        <SkeletonWindow title="ORDER SUMMARY">
          <CountingSkeletonStatGrid />
          <div className="mt-2.5 flex items-baseline justify-between border-t border-ink pt-2.5">
            <LoadingPercentage />
            <span className="font-mono text-[11px] text-muted flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent animate-ping" />
              TALLYING PROGRESS...
            </span>
          </div>
        </SkeletonWindow>

        <SkeletonWindow title="MATERIAL BREAKDOWN">
          <LoadingMaterialTable />
        </SkeletonWindow>

        <SkeletonWindow title="ENTRIES">
          <SkeletonEntries />
        </SkeletonWindow>
      </div>
    </div>
  );
}
