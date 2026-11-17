"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { CONSENT_COOKIE, CONSENT_MAX_AGE, serializeConsent, type Consent } from "../consent.ts";

const input = z.discriminatedUnion("choice", [
  z.object({ choice: z.literal("reject") }),
  z.object({ choice: z.literal("accept") }),
  z.object({
    choice: z.literal("custom"),
    analytics: z.literal("on").optional(),
    marketing: z.literal("on").optional(),
  }),
]);

// No authorization check: the visitor only records her own choice, in her own browser.
export async function saveConsent(formData: FormData): Promise<void> {
  const parsed = input.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  const data = parsed.data;
  const consent: Consent =
    data.choice === "custom"
      ? { v: 1, analytics: data.analytics === "on", marketing: data.marketing === "on" }
      : { v: 1, analytics: data.choice === "accept", marketing: data.choice === "accept" };

  const cookieStore = await cookies();
  cookieStore.set(CONSENT_COOKIE, serializeConsent(consent), {
    maxAge: CONSENT_MAX_AGE,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  // The banner disappears on its own: setting a cookie re-renders the current page.
  if (data.choice === "custom") redirect("/cookies?salvo=1");
}
