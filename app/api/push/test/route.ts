// app/api/push/test/route.ts
// POST /api/push/test { endpoint } — sends a test notification to that one
// device only and reports whether the push service accepted it.
import { NextRequest, NextResponse } from "next/server";
import { sendPushNotification } from "@/lib/push";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.endpoint) {
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  }

  const result = await sendPushNotification(
    {
      title: "Project Status · Push Test",
      body: "Push notifications are active on this device! You will receive alerts when entries are logged.",
      url: "/",
    },
    { endpoint: body.endpoint }
  );

  if (result.error) return NextResponse.json(result, { status: 503 });
  if (result.targeted === 0) {
    return NextResponse.json({ ...result, error: "This device is not registered" }, { status: 404 });
  }
  if (result.delivered === 0) {
    return NextResponse.json({ ...result, error: "Push service rejected the message" }, { status: 502 });
  }
  return NextResponse.json(result);
}
