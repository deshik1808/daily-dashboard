// components/design/ReplyButton.tsx
// Floating REPLY pill that opens WhatsApp with the current page quoted.
// Server-rendered — no client JS. Hidden when the Editor is signed in or
// when REPLY_WHATSAPP_NUMBER is unset.

import { buildReplyHref, type ReplyContext } from "@/lib/reply";
import { getCachedShortLink, buildFallbackUrl } from "@/lib/short-links";
import { createClient } from "@/lib/supabase/server";
import { getReplyWhatsAppNumber } from "@/app/actions/settings";

/**
 * Resolves the best available link URL for the reply message.
 * Tries the short_links cache first, falls back to /m/YYMMDD for MRF dates,
 * or just the app origin + path for other pages.
 */
async function resolveLink(context: ReplyContext): Promise<string> {
  const supabase = await createClient();
  const cached = await getCachedShortLink(supabase, context.path);
  if (cached) return cached;

  // For MRF date pages, build the /m/YYMMDD fallback.
  const mrfDateMatch = context.path.match(/^\/mrf\/(\d{4}-\d{2}-\d{2})$/);
  if (mrfDateMatch) {
    return buildFallbackUrl(mrfDateMatch[1]);
  }

  // For other pages, use the app origin + canonical path.
  const origin =
    process.env.APP_ORIGIN ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return `${origin}${context.path}`;
}

export async function ReplyButton({
  context,
  isEditor,
}: {
  context: ReplyContext;
  isEditor: boolean;
}) {
  const phoneNumber = await getReplyWhatsAppNumber();
  const isDev = process.env.NODE_ENV === "development";

  // In production, don't render if the user is an Editor.
  // In development, allow rendering so the icon and layout can be tested.
  if (!isDev && isEditor) {
    return null;
  }

  const linkUrl = await resolveLink(context);
  const href = buildReplyHref(phoneNumber, context, linkUrl);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-20 right-4 z-40 flex items-center gap-1.5 rounded-full border border-ink bg-paper px-3.5 py-2 font-mono text-xs font-bold tracking-wide shadow-md transition-colors hover:bg-ink hover:text-paper sm:bottom-24 sm:right-6"
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
