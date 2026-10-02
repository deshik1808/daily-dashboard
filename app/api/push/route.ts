// app/api/push/route.ts
// POST   /api/push  — save a new push subscription (Editor or Viewer)
// DELETE /api/push  — remove a push subscription (Editor or Viewer)
// GET    /api/push  — return the VAPID public key to clients (public)

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { parseRole } from "@/lib/access";

async function verifyPushAccess() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;
  const { role } = parseRole(user.app_metadata);
  return role === "editor" || role === "viewer";
}

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
  const isAllowed = await verifyPushAccess();
  if (!isAllowed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription object" }, { status: 400 });
  }

  // Use service client to ensure upsert never hits RLS / permission issues
  const supabase = createServiceClient();

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
    return NextResponse.json({ error: error.message || "Could not save subscription" }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const isAllowed = await verifyPushAccess();
  if (!isAllowed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.endpoint) {
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", body.endpoint);

  if (error) {
    console.error("[push/route] Failed to delete subscription:", error);
    return NextResponse.json({ error: error.message || "Could not remove subscription" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
