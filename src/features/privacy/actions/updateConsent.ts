"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { CONSENT_TEXT_VERSION } from "@/src/features/checkout";
import { apiPut } from "@/src/lib/api";
import { forwardedFor } from "@/src/lib/request-ip";
import { bearer, clearSession, readSession } from "@/src/lib/session-cookie";
import type { PrivacyNotice } from "../types.ts";

const input = z.object({ channel: z.enum(["email", "whatsapp"]), accepted: z.literal("on").optional() });

// CTA-08: a tap accepts or revokes one channel at once, with checkout's text version and her IP.
export async function updateConsent(_prev: PrivacyNotice, formData: FormData): Promise<PrivacyNotice> {
  // Authorization: only the account of her own session.
  const session = await readSession();
  if (!session?.detailsComplete) redirect("/conta");
  const parsed = input.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { notice: null, error: "Não foi possível concluir. Tente de novo" };
  const result = await apiPut(
    `/v1/account/consents/${parsed.data.channel}`,
    { accepted: parsed.data.accepted === "on", textVersion: CONSENT_TEXT_VERSION },
    { ...(await forwardedFor()), ...bearer(session) },
  );
  if (!result.ok) {
    if (result.problem.status === 401) {
      await clearSession();
      redirect("/conta");
    }
    return { notice: null, error: result.problem.title };
  }
  refresh(); // the page reads the consents without cache
  return { notice: "Preferência salva", error: null };
}
