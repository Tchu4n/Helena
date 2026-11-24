import "server-only";
import { apiGet } from "@/src/lib/api";
import { bearer, readSession } from "@/src/lib/session-cookie";
import { toConsentViews, type ConsentView, type MarketingConsent } from "../views.ts";

export type ConsentsResult = { ok: true; consents: ConsentView[] } | { ok: false; reason: "signed_out" | "error"; title?: string };

// CTA-08: the signed-in customer's own news consents, one per channel.
export async function listMyConsents(): Promise<ConsentsResult> {
  // Authorization: only the account of her own session cookie; without "Seus dados", /conta asks for them.
  const session = await readSession();
  if (!session?.detailsComplete) return { ok: false, reason: "signed_out" };
  const result = await apiGet<MarketingConsent[]>("/v1/account/consents", {}, bearer(session));
  if (!result.ok) return result.problem.status === 401 ? { ok: false, reason: "signed_out" } : { ok: false, reason: "error", title: result.problem.title };
  return { ok: true, consents: toConsentViews(result.data) };
}
