import "server-only";
import { apiGet } from "@/src/lib/api";
import type { components } from "@/src/lib/api-types";
import { bearer, readSession } from "@/src/lib/session-cookie";
import { toAddressView, type AddressView } from "../views.ts";

export type AddressesResult = { ok: true; addresses: AddressView[] } | { ok: false; reason: "signed_out" | "error"; title?: string };

// CTA-05: the signed-in customer's own addresses, in the API's order (the favorite first, then the newest).
export async function listMyAddresses(): Promise<AddressesResult> {
  // Authorization: only the account of her own session cookie; without "Seus dados", /conta asks for them.
  const session = await readSession();
  if (!session?.detailsComplete) return { ok: false, reason: "signed_out" };
  const result = await apiGet<components["schemas"]["SavedAddress"][]>("/v1/account/addresses", {}, bearer(session));
  if (!result.ok) return result.problem.status === 401 ? { ok: false, reason: "signed_out" } : { ok: false, reason: "error", title: result.problem.title };
  return { ok: true, addresses: result.data.map(toAddressView) };
}
