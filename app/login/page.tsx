// app/login/page.tsx
"use client";

import { useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TopBar } from "@/components/design/TopBar";
import { Window } from "@/components/design/Window";
import { updateReplyWhatsAppNumber } from "@/app/actions/settings";
import { signOut } from "@/app/actions/sign-out";

export default function LoginPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Sign-in state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Settings state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneSuccess, setPhoneSuccess] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Check auth state on load
  useEffect(() => {
    const supabase = createClient();
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUserEmail(user.email ?? "Editor");
        // Fetch current phone setting
        setPhoneLoading(true);
        const { data } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", "reply_whatsapp_number")
          .maybeSingle();

        if (data?.value) {
          setPhoneNumber(data.value);
        }
        setPhoneLoading(false);
      }
      setCheckingAuth(false);
    }
    checkUser();
  }, []);

  async function handleSignIn(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    if (signInData.user) {
      setUserEmail(signInData.user.email ?? "Editor");
      // Fetch phone number
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "reply_whatsapp_number")
        .maybeSingle();
      if (data?.value) {
        setPhoneNumber(data.value);
      }
      router.refresh();
    }
  }

  async function handleSavePhone(e: FormEvent) {
    e.preventDefault();
    setPhoneSaving(true);
    setPhoneError(null);
    setPhoneSuccess(false);

    const result = await updateReplyWhatsAppNumber(phoneNumber);
    setPhoneSaving(false);

    if (!result.success) {
      setPhoneError(result.error ?? "Failed to save phone number.");
      return;
    }

    if (result.number) {
      setPhoneNumber(result.number);
    }
    setPhoneSuccess(true);
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col">
      <TopBar title={userEmail ? "EDITOR SETTINGS" : "EDITOR LOGIN"} backHref="/" />
      <div className="flex-1 space-y-3 overflow-y-auto bg-canvas p-3">
        {checkingAuth ? (
          <div className="py-8 text-center font-mono text-xs text-muted">CHECKING AUTH...</div>
        ) : userEmail ? (
          <>
            <Window title="EDITOR ACCOUNT">
              <div className="space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted">SIGNED IN AS:</span>
                  <span className="font-bold text-ink">{userEmail}</span>
                </div>
                <div className="flex items-center justify-between border-t border-sage/50 pt-2">
                  <Link href="/" className="text-accent-ink underline">
                    ← GO TO DASHBOARD
                  </Link>
                  <form action={signOut}>
                    <button type="submit" className="text-alert underline">
                      SIGN OUT
                    </button>
                  </form>
                </div>
              </div>
            </Window>

            <Window title="WHATSAPP REPLY NUMBER">
              <form onSubmit={handleSavePhone} className="flex flex-col gap-3">
                <p className="font-mono text-xs text-muted leading-relaxed">
                  Queries from the floating <span className="font-bold text-ink">REPLY</span> button will be sent to this WhatsApp number.
                </p>

                <div>
                  <label htmlFor="phoneNumber" className="font-mono text-[10px] font-bold tracking-wide">
                    PHONE NUMBER (E.164 DIGITS, WITH COUNTRY CODE)
                  </label>
                  <input
                    id="phoneNumber"
                    type="tel"
                    placeholder="e.g. 919876543210"
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value);
                      setPhoneSuccess(false);
                      setPhoneError(null);
                    }}
                    required
                    disabled={phoneLoading}
                    className="mt-1 w-full rounded-control border border-ink bg-paper px-2.5 py-2 font-mono text-sm tracking-wider"
                  />
                  <span className="mt-1 block font-mono text-[10px] text-muted">
                    Format: country code + 10-digit mobile (no + or spaces). India example: 919876543210
                  </span>
                </div>

                {phoneError && (
                  <p role="alert" className="font-mono text-xs text-alert">
                    {phoneError}
                  </p>
                )}

                {phoneSuccess && (
                  <p role="status" className="font-mono text-xs font-bold text-accent-ink">
                    ✓ WhatsApp reply number updated successfully!
                  </p>
                )}

                <button
                  type="submit"
                  disabled={phoneSaving || phoneLoading}
                  className="rounded-control border border-ink bg-ink py-2 font-mono text-xs font-bold tracking-wide text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {phoneSaving ? "SAVING NUMBER..." : "SAVE NUMBER"}
                </button>
              </form>
            </Window>
          </>
        ) : (
          <Window title="SIGN IN">
            <form onSubmit={handleSignIn} className="flex flex-col gap-3">
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
                  className="mt-1 w-full rounded-control border border-ink bg-paper px-2 py-1.5 text-[15px]"
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
                  className="mt-1 w-full rounded-control border border-ink bg-paper px-2 py-1.5 text-[15px]"
                />
              </div>
              {error && (
                <p role="alert" className="font-mono text-xs text-alert">
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
        )}
      </div>
    </div>
  );
}
