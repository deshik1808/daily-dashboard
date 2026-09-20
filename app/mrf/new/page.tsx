// app/mrf/new/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/design/TopBar";
import { MrfLogForm } from "@/components/design/MrfLogForm";

export default async function NewMrfLogPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="flex h-full flex-col">
      <TopBar title="NEW MRF LOG" backHref="/mrf" />
      <div className="flex-1 overflow-y-auto bg-canvas p-3">
        <MrfLogForm />
      </div>
    </div>
  );
}
