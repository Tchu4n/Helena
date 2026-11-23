import "server-only";
import { apiGet } from "@/src/lib/api";
import type { components } from "@/src/lib/api-types";
import { bearer, readSession } from "@/src/lib/session-cookie";

export type AccountView = { name: string; email: string; phone: string; maskedCpf: string; hasPassword: boolean };

export type AccountResult = { ok: true; account: AccountView } | { ok: false; reason: "signed_out" | "error"; title?: string };

// IDT-11, CTA-06: the signed-in customer's own details, read with her session.
export async function getAccount(): Promise<AccountResult> {
  // Authorization: only the account of her own session cookie.
  const session = await readSession();
  if (!session) return { ok: false, reason: "signed_out" };
  const result = await apiGet<components["schemas"]["Customer"]>("/v1/account", {}, bearer(session));
  if (!result.ok) return result.problem.status === 401 ? { ok: false, reason: "signed_out" } : { ok: false, reason: "error", title: result.problem.title };
  const { name, email, phone, maskedCpf, hasPassword } = result.data;
  return { ok: true, account: { name, email, phone, maskedCpf, hasPassword } };
}
