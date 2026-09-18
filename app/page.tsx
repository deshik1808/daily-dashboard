import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main style={{ padding: 24 }}>
      <h1>Project Status Dashboard</h1>
      <p>Signed in as: {user ? user.email : "Viewer (not signed in)"}</p>
      {user ? (
        <p>Editor view — Add button and project cards land here in Plan 2.</p>
      ) : (
        <p>
          <Link href="/login">Editor login</Link>
        </p>
      )}
    </main>
  );
}
