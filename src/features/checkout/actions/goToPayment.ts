"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { readCartId, saveCep } from "@/src/features/cart";
import { apiGet, apiPost, apiPut } from "@/src/lib/api";
import type { components } from "@/src/lib/api-types";
import { saveOrderAccess } from "@/src/lib/order-cookie";
import { forwardedFor } from "@/src/lib/request-ip";
import { bearer, clearSession, readSession } from "@/src/lib/session-cookie";
import { customerDetailsInput, fieldErrors } from "../schemas/customerDetails.ts";
import type { GoToPaymentState } from "../types.ts";

const FAILED = "Não foi possível concluir. Tente de novo";
const key = z.uuid();

// CHK-12, CHK-13: validates again, saves the details, then creates the order, which reserves the pieces for 15 minutes.
export async function goToPayment(_prev: GoToPaymentState, formData: FormData): Promise<GoToPaymentState> {
  // Authorization: only her own cart, from the httpOnly cookie.
  const cartId = await readCartId();
  if (!cartId) redirect("/sacola");

  const idempotencyKey = key.safeParse(formData.get("idempotencyKey"));
  const parsed = customerDetailsInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), error: null };
  if (!idempotencyKey.success) return { errors: {}, error: FAILED };

  const cart = await apiGet<components["schemas"]["Cart"]>(`/v1/carts/${cartId}`);
  if (!cart.ok) {
    if (cart.problem.status === 404) redirect("/sacola");
    return { errors: {}, error: cart.problem.title };
  }
  // IDT-11, IDT-12: the e-mail is her session's or the one confirmed for this bag, read here, never a form value.
  const session = await readSession();
  const email = session?.email ?? cart.data.verifiedEmail;
  if (!email) redirect("/checkout/identificacao");
  // Rare race: the CEP she typed isn't the cart's yet. Save it and stop, so the CHK-10 note shows the new total first.
  if (cart.data.cep !== parsed.data.address.cep) {
    const saved = await saveCep(parsed.data.address.cep);
    if (!saved?.ok) return { errors: {}, error: saved?.problem.title ?? FAILED };
    refresh();
    return { errors: {}, error: null };
  }
  if (!cart.data.chosenDelivery) return { errors: { delivery: "Escolha a entrega" }, error: null };

  const details = await apiPut(`/v1/carts/${cartId}/customer`, { ...parsed.data, email }, { ...(await forwardedFor()), ...bearer(session) });
  if (!details.ok) {
    // The session ended on the API: signed out here, so identification shows its first step instead of bouncing back.
    if (details.problem.status === 401) {
      await clearSession();
      redirect("/checkout/identificacao");
    }
    if (details.problem.code === "email_not_verified") redirect("/checkout/identificacao");
    return { errors: {}, error: details.problem.title };
  }

  const order = await apiPost<components["schemas"]["CreatedOrder"]>(
    "/v1/orders",
    { cartId },
    { "Idempotency-Key": idempotencyKey.data },
  );
  if (!order.ok) {
    if (order.problem.code === "email_not_verified") redirect("/checkout/identificacao"); // IDT-12
    // 409: a piece sold out (the bag shows which, SAC-07); 404: the cart is gone.
    if (order.problem.status === 409 || order.problem.status === 404) redirect("/sacola");
    return { errors: {}, error: order.problem.title };
  }
  await saveOrderAccess({ number: order.data.order.number, access: order.data.access });
  redirect("/checkout/pagamento");
}
