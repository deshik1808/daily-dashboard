// app/login/page.tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TopBar } from "@/components/design/TopBar";
import { Window } from "@/components/design/Window";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col">
      <TopBar title="EDITOR LOGIN" showBack />
      <div className="flex-1 overflow-y-auto p-3">
        <Window title="SIGN IN">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <label htmlFor="email" className="font-mono text-[10px] tracking-wide">
                EMAIL
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 w-full rounded-control border border-ink px-2 py-1.5 text-[15px]"
              />
            </div>
            <div>
              <label htmlFor="password" className="font-mono text-[10px] tracking-wide">
                PASSWORD
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 w-full rounded-control border border-ink px-2 py-1.5 text-[15px]"
              />
            </div>
            {error && (
              <p role="alert" className="font-mono text-xs text-accent-orange">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="rounded-control border border-ink bg-ink py-2 font-mono text-xs font-bold tracking-wide text-paper disabled:opacity-50"
            >
              {loading ? "SIGNING IN..." : "SIGN IN"}
            </button>
          </form>
        </Window>
      </div>
    </div>
  );
}
