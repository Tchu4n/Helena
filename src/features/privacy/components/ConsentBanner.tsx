import { getConsent } from "../queries/getConsent.ts";
import { CookieBanner } from "./CookieBanner.tsx";

// Reads the cookie at request time; render it inside <Suspense> so the rest of the page
// stays in the prerendered shell (cacheComponents is on).
export async function ConsentBanner() {
  const consent = await getConsent();
  return consent === null ? <CookieBanner /> : null;
}
