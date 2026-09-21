// lib/app-origin.ts
// The single source of truth for the public origin of every shared link.

/**
 * Returns the public origin that shared links must point at.
 *
 * `VERCEL_URL` is the *per-deployment* host
 * (`daily-dashboard-e7bx8es7g-…vercel.app`): long, and behind Deployment
 * Protection, so a recipient opening it lands on a Vercel login wall rather
 * than the dashboard. `VERCEL_PROJECT_PRODUCTION_URL` is the stable production
 * alias (`daily-dashboard-silk.vercel.app`), so it wins. `VERCEL_URL` stays
 * last so preview deployments still build a link that works for the Editor.
 *
 * `APP_ORIGIN` overrides both — set it once a custom domain exists.
 */
export function getAppOrigin(): string {
  const explicit = process.env.APP_ORIGIN?.trim();
  if (explicit) return explicit;

  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionHost) return `https://${productionHost}`;

  const deploymentHost = process.env.VERCEL_URL?.trim();
  if (deploymentHost) return `https://${deploymentHost}`;

  // Local development fallback.
  return "http://localhost:3000";
}
