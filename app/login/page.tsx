// app/login/page.tsx
"use client";

import { useState, useEffect, type FormEvent, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { parseRole, type AppRole } from "@/lib/access";
import { TopBar } from "@/components/design/TopBar";
import { Window } from "@/components/design/Window";
import { updateReplyWhatsAppNumber } from "@/app/actions/settings";
import { signOut } from "@/app/actions/sign-out";

interface SessionInfo {
  email: string;
  role: AppRole | null;
  agency: string | null;
}

function getSafeNextPath(next: string | null): string {
  if (!next) return "/";
  if (!next.startsWith("/")) return "/";
  if (next.startsWith("//")) return "/";
  if (next === "/login" || next.startsWith("/login?")) return "/";
  return next;
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Sign-in state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Settings state (Editor-only)
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneSuccess, setPhoneSuccess] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const parsed = parseRole(user.app_metadata);
        setSessionInfo({
          email: user.email ?? "",
          role: parsed.role,
          agency: parsed.agency,
        });

        if (parsed.role === "editor") {
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
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });
    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    if (signInData.user) {
      const parsed = parseRole(signInData.user.app_metadata);
      setSessionInfo({
        email: signInData.user.email ?? "",
        role: parsed.role,
        agency: parsed.agency,
      });

      // Redirect to next or home
      const destination = getSafeNextPath(next);
      router.push(destination);
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

  const topBarTitle = sessionInfo
    ? sessionInfo.role === "editor"
      ? "EDITOR SETTINGS"
      : "ACCOUNT"
    : "LOGIN";

  return (
    <div className="flex h-full flex-col font-mono">
      <TopBar title={topBarTitle} backHref={sessionInfo ? "/" : undefined} />
      <div className="flex-1 space-y-3 overflow-y-auto bg-canvas p-3">
        {checkingAuth ? (
          <div className="py-8 text-center text-xs text-muted">CHECKING AUTH...</div>
        ) : sessionInfo ? (
          <>
            <Window title="ACCOUNT">
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted">SIGNED IN AS:</span>
                  <span className="font-bold text-ink">{sessionInfo.email}</span>
                </div>

                <div className="flex items-center justify-between border-t border-sage/50 pt-2">
                  <span className="text-muted">ROLE:</span>
                  <span className="font-bold text-ink">
                    {sessionInfo.role ? (
                      <>
                        {sessionInfo.role.toUpperCase()}
                        {sessionInfo.agency ? ` · ${sessionInfo.agency}` : ""}
                      </>
                    ) : (
                      "NO ACCESS"
                    )}
                  </span>
                </div>

                {!sessionInfo.role ? (
                  <div className="border-t border-sage/50 pt-2">
                    <p className="text-alert leading-relaxed">
                      This login has no access yet. Ask Deshik to set it up, then sign
                      out and back in.
                    </p>
                    <div className="mt-3 flex justify-end">
                      <form action={signOut}>
                        <button type="submit" className="text-alert font-bold underline">
                          SIGN OUT
                        </button>
                      </form>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between border-t border-sage/50 pt-2">
                    <Link href="/" className="text-accent-ink underline font-bold">
                      ← GO TO DASHBOARD
                    </Link>
                    <form action={signOut}>
                      <button type="submit" className="text-alert underline font-bold">
                        SIGN OUT
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </Window>

            {sessionInfo.role === "editor" && (
              <Window title="WHATSAPP REPLY NUMBER">
                <form onSubmit={handleSavePhone} className="flex flex-col gap-3">
                  <p className="text-xs text-muted leading-relaxed">
                    Queries from the floating{" "}
                    <span className="font-bold text-ink">REPLY</span> button will be
                    sent to this WhatsApp number.
                  </p>

                  <div>
                    <label
                      htmlFor="phoneNumber"
                      className="text-[10px] font-bold tracking-wide"
                    >
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
                      className="mt-1 w-full rounded-control border border-ink bg-paper px-2.5 py-2 text-sm tracking-wider"
                    />
                    <span className="mt-1 block text-[10px] text-muted">
                      Format: country code + 10-digit mobile (no + or spaces). India
                      example: 919876543210
                    </span>
                  </div>

                  {phoneError && (
                    <p role="alert" className="text-xs text-alert">
                      {phoneError}
                    </p>
                  )}

                  {phoneSuccess && (
                    <p
                      role="status"
                      className="text-xs font-bold text-accent-ink"
                    >
                      ✓ WhatsApp reply number updated successfully!
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={phoneSaving || phoneLoading}
                    className="rounded-control border border-ink bg-ink py-2 text-xs font-bold tracking-wide text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {phoneSaving ? "SAVING NUMBER..." : "SAVE NUMBER"}
                  </button>
                </form>
              </Window>
            )}
          </>
        ) : (
          <Window title="SIGN IN">
            <form onSubmit={handleSignIn} className="flex flex-col gap-3">
              <div>
                <label
                  htmlFor="email"
                  className="text-[10px] font-bold tracking-wide text-muted"
                >
                  EMAIL
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1 min-h-[44px] w-full rounded-control border border-ink bg-paper px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="text-[10px] font-bold tracking-wide text-muted"
                >
                  PASSWORD
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-1 min-h-[44px] w-full rounded-control border border-ink bg-paper px-2 py-1.5 text-sm"
                />
              </div>
              {error && (
                <p role="alert" className="text-xs text-alert">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="min-h-[44px] rounded-control border border-ink bg-ink py-2 text-xs font-bold tracking-wide text-paper disabled:opacity-50 hover:bg-ink/90"
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

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full flex-col font-mono">
          <TopBar title="LOGIN" />
          <div className="flex-1 p-3 text-center text-xs text-muted">
            LOADING...
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
