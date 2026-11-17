import "server-only";
import { cookies } from "next/headers";
import { CONSENT_COOKIE, parseConsent, type Consent } from "../consent.ts";

export async function getConsent(): Promise<Consent | null> {
  const cookieStore = await cookies();
  return parseConsent(cookieStore.get(CONSENT_COOKIE)?.value);
}
