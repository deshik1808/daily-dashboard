// app/api/push/test/route.ts
import { NextResponse } from "next/server";
import { sendPushNotification } from "@/lib/push";

export async function POST() {
  try {
    await sendPushNotification({
      title: "Project Status · Push Test",
      body: "Push notifications are active on this device! You will receive alerts when entries are logged.",
      url: "/",
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[push/test] Error sending test notification:", error);
    return NextResponse.json({ error: "Failed to send test push" }, { status: 500 });
  }
}
