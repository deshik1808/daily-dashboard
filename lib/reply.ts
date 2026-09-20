// lib/reply.ts
// Builds the WhatsApp "wa.me" href for the Reply button.

export interface ReplyContext {
  label: string;
  path: string;
}

/**
 * Builds a `https://wa.me/<number>?text=<encoded>` href.
 *
 * Message body:
 * ```
 * Re: <label>
 * <url>
 *
 * ```
 *
 * @param linkUrl - The short URL or fallback URL to include.
 */
export function buildReplyHref(
  phoneNumber: string,
  context: ReplyContext,
  linkUrl: string
): string {
  const body = `Re: ${context.label}\n${linkUrl}\n\n`;
  return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(body)}`;
}
