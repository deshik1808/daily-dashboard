// app/m/[code]/route.ts
// Short-link redirect: /m/260920 → /mrf/2026-09-20
import { redirect } from "next/navigation";
import { yymmddToISO } from "@/lib/mrf-dates";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const iso = yymmddToISO(code);

  if (!iso) {
    redirect("/mrf");
  }

  redirect(`/mrf/${iso}`);
}
