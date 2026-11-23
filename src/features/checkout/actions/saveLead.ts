"use server";

import { apiGet, apiPut } from "@/src/lib/api";
import type { components } from "@/src/lib/api-types";
import { readCartId } from "@/src/features/cart";
import { forwardedFor } from "@/src/lib/request-ip";
import { customerDetailsInput } from "../schemas/customerDetails.ts";

// CHK-05: saves her details as a lead once every required field is valid, before payment.
// Nothing on screen depends on it, so it does not refresh and a failure is silent (the payment step saves again).
export async function saveLead(formData: FormData): Promise<{ ok: boolean }> {
  // Authorization: only the visitor's own cart, from her httpOnly cookie.
  const cartId = await readCartId();
  if (!cartId) return { ok: false };
  const parsed = customerDetailsInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false };
  // IDT-03: the e-mail is the one confirmed for this bag, read on the server, never a form value.
  const cart = await apiGet<components["schemas"]["Cart"]>(`/v1/carts/${cartId}`);
  if (!cart.ok || !cart.data.verifiedEmail) return { ok: false };
  const result = await apiPut<components["schemas"]["Cart"]>(
    `/v1/carts/${cartId}/customer`,
    { ...parsed.data, email: cart.data.verifiedEmail },
    await forwardedFor(),
  );
  return { ok: result.ok };
}

