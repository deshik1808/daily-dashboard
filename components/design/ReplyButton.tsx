// components/design/ReplyButton.tsx
// Floating REPLY pill that opens WhatsApp with the current page quoted.
// Server-rendered — no client JS. Hidden when the Editor is signed in or
// when REPLY_WHATSAPP_NUMBER is unset.
//
// Renders as a child of <BottomNav>, which is its positioning context: the pill
// sits `bottom-full` (the nav's own top edge) plus a margin, so the clearance
// holds at whatever height the nav takes. It used to be `fixed bottom-20`, a
// guess at the nav's height measured against the *viewport* instead — on any
// device reporting a safe-area inset the nav grew past 80px and the two
// touched.

import { Suspense } from "react";
import { after } from "next/server";
import { buildReplyHref, type ReplyContext } from "@/lib/reply";
import { getOrCreateShortLink, buildFallbackUrl } from "@/lib/short-links";
import { getAppOrigin } from "@/lib/app-origin";
import { createClient } from "@/lib/supabase/server";
import { getReplyNumber, getShortLink } from "@/lib/data";

/**
 * Resolves the best available link URL for the reply message.
 * Tries the short_links cache first, falls back to /m/YYMMDD for MRF dates,
 * or just the app origin + path for other pages.
 */
async function resolveLink(context: ReplyContext): Promise<string> {
  const cached = await getShortLink(context.path);
  if (cached) return cached;

  // For MRF date pages, build the /m/YYMMDD fallback.
  const mrfDateMatch = context.path.match(/^\/mrf\/(\d{4}-\d{2}-\d{2})$/);
  if (mrfDateMatch) {
    return buildFallbackUrl(mrfDateMatch[1]);
  }

  // Use the caller-provided short path if available (e.g. /p/1z for phases).
  if (context.shortPath) {
    return `${getAppOrigin()}${context.shortPath}`;
  }

  // For other pages, use the app origin + canonical path.
  return `${getAppOrigin()}${context.path}`;
}

/**
 * Warms the short-link cache for a path the Editor is viewing.
 *
 * Only the Editor may write to `short_links`, and the pill is hidden from the
 * Editor in production — so without this, paths outside the MRF save flow
 * (Home, phase pages, Doc Bank) never get a row and every Viewer falls back to
 * the full `origin + path` URL. Runs via `after()` so the page still streams
 * immediately and an is.gd outage can never delay a render.
 */
function scheduleShortLink(path: string) {
  after(async () => {
    try {
      const supabase = await createClient();
      await getOrCreateShortLink(supabase, path);
    } catch (err) {
      console.warn(`short link minting failed for ${path}:`, err);
    }
  });
}

/**
 * Streams the pill in rather than holding the page back.
 *
 * The pill needs two Supabase reads (the configured number, then the cached
 * short link) and it renders at the very bottom of every page. Awaited inline,
 * those reads sat on the critical path: nothing — not the top bar, not the
 * cards — reached the browser until the WhatsApp link was resolved. Behind a
 * Suspense boundary the page ships immediately and the pill fills in after.
 *
 * The fallback is `null` on purpose: the pill is a secondary affordance, so
 * appearing a beat late is better than reserving a visible empty slot for it.
 */
export function ReplyButton(props: { context: ReplyContext; isEditor: boolean }) {
  return (
    <Suspense fallback={null}>
      <ReplyPill {...props} />
    </Suspense>
  );
}

async function ReplyPill({
  context,
  isEditor,
}: {
  context: ReplyContext;
  isEditor: boolean;
}) {
  const isDev = process.env.NODE_ENV === "development";

  // The Editor is the only role allowed to mint, so warm the cache on their
  // visit — including when the pill itself is about to be hidden below.
  if (isEditor) {
    scheduleShortLink(context.path);
  }

  // In production, don't render if the user is an Editor.
  // In development, allow rendering so the icon and layout can be tested.
  // Checked before any await, so a signed-in Editor pays for neither read.
  if (!isDev && isEditor) {
    return null;
  }

  // The configured number and the short link don't depend on each other.
  const [phoneNumber, linkUrl] = await Promise.all([
    getReplyNumber(),
    resolveLink(context),
  ]);

  const href = buildReplyHref(phoneNumber, context, linkUrl);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="absolute bottom-full right-4 z-40 mb-8 flex items-center gap-1.5 rounded-full border border-ink bg-paper px-3.5 py-2 font-mono text-xs font-bold tracking-wide shadow-md transition-colors hover:bg-ink hover:text-paper sm:right-6 sm:mb-12"
      aria-label={`Reply about ${context.label} via WhatsApp`}
    >
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
           stroke="currentColor" strokeWidth="2" strokeLinecap="round"
           strokeLinejoin="round" aria-hidden className="shrink-0">
        <path d="M9 14 4 9l5-5" />
        <path d="M4 9h11a5 5 0 0 1 0 10h-1" />
      </svg>
      REPLY
    </a>
  );
}
