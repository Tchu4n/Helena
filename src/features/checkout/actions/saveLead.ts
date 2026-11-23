"use server";

import { apiGet, apiPut } from "@/src/lib/api";
import type { components } from "@/src/lib/api-types";
import { readCartId } from "@/src/features/cart";
import { forwardedFor } from "@/src/lib/request-ip";
import { bearer, readSession } from "@/src/lib/session-cookie";
import { addressDetailsInput, customerDetailsInput } from "../schemas/customerDetails.ts";

// CHK-05: saves her details as a lead once every required field is valid, before payment.
// Nothing on screen depends on it, so it does not refresh and a failure is silent (the payment step saves again).
export async function saveLead(formData: FormData): Promise<{ ok: boolean }> {
  // Authorization: only the visitor's own cart, from her httpOnly cookie.
  const cartId = await readCartId();
  if (!cartId) return { ok: false };
  const session = await readSession();
  // IDT-11: signed in, only the address part; the API copies the account's name, CPF and phone.
  const parsed = (session ? addressDetailsInput : customerDetailsInput).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false };
  // IDT-03, IDT-11: the e-mail is her session's or the one confirmed for this bag, read on the server, never a form value.
  let email = session?.email;
  if (!email) {
    const cart = await apiGet<components["schemas"]["Cart"]>(`/v1/carts/${cartId}`);
    email = cart.ok ? (cart.data.verifiedEmail ?? undefined) : undefined;
  }
  if (!email) return { ok: false };
  // A 401 (session ended on the API) is left to "Ir para pagamento", which signs her out and says where to go.
  const result = await apiPut<components["schemas"]["Cart"]>(
    `/v1/carts/${cartId}/customer`,
    { ...parsed.data, email },
    { ...(await forwardedFor()), ...bearer(session) },
  );
  return { ok: result.ok };
}

