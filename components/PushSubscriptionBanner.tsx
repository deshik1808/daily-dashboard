// components/PushSubscriptionBanner.tsx
import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import { PushSubscription } from "@/components/PushSubscription";

async function PushBannerContent() {
  const session = await getSession();
  if (session?.role === "editor" || session?.role === "viewer") {
    return <PushSubscription />;
  }
  return null;
}

export function PushSubscriptionBanner() {
  return (
    <Suspense fallback={null}>
      <PushBannerContent />
    </Suspense>
  );
}
