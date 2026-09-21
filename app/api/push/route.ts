// app/api/push/route.ts
// POST   /api/push  — save a new push subscription
// DELETE /api/push  — remove a push subscription
// GET    /api/push/vapid-public-key — return the VAPID public key to clients

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return NextResponse.json(
      { error: "Push notifications not configured" },
      { status: 503 }
    );
  }
  return NextResponse.json({ publicKey });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription object" }, { status: 400 });
  }

  // Use the anon client — the insert policy allows anon + authenticated.
  const supabase = await createClient();

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    console.error("[push/route] Failed to save subscription:", error);
    return NextResponse.json({ error: "Could not save subscription" }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.endpoint) {
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", body.endpoint);

  if (error) {
    console.error("[push/route] Failed to delete subscription:", error);
    return NextResponse.json({ error: "Could not remove subscription" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
