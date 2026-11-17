// LGPD cookie consent. Only optional categories are stored; necessary cookies (cart, session)
// never need consent.
export type Consent = { v: 1; analytics: boolean; marketing: boolean };

export const CONSENT_COOKIE = "helena_consent";
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 180; // 180 days

export function parseConsent(raw: string | undefined): Consent | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (
      typeof value === "object" &&
      value !== null &&
      "v" in value &&
      value.v === 1 &&
      "analytics" in value &&
      typeof value.analytics === "boolean" &&
      "marketing" in value &&
      typeof value.marketing === "boolean"
    ) {
      return { v: 1, analytics: value.analytics, marketing: value.marketing };
    }
  } catch {
    // invalid JSON: treated as no choice yet
  }
  return null;
}

export function serializeConsent(consent: Consent): string {
  return JSON.stringify({ v: 1, analytics: consent.analytics, marketing: consent.marketing });
}
