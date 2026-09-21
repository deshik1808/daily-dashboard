// app/loading.tsx
import { TopBar } from "@/components/design/TopBar";
import { Skeleton, SkeletonCard } from "@/components/design/Skeleton";

export default function HomeLoading() {
  return (
    <div className="flex h-full flex-col">
      <TopBar title="PROJECT STATUS" />
      <div className="flex-1 space-y-2.5 overflow-y-auto bg-canvas p-3">
        <div className="mb-1 flex justify-between font-mono text-xs">
          <Skeleton className="h-3.5 w-24" />
        </div>

        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
