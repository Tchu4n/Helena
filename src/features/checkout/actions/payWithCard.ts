"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { apiPost } from "@/src/lib/api";
import type { components } from "@/src/lib/api-types";
import { readOrderAccess } from "@/src/lib/order-cookie";
import type { PayState } from "../types.ts";

const FAILED = "Não foi possível concluir. Tente de novo";

// Only the token and the installments: the card data never reaches this server (CHK-18).
const CardPayment = z.object({
  cardToken: z.string().regex(/^tok_[A-Za-z0-9_]{4,60}$/),
  installments: z.coerce.number().int().min(1).max(6),
  idempotencyKey: z.uuid(),
});

// CHK-18 to CHK-21: approved goes to the order confirmation; declined shows the gateway's message.
export async function payWithCard(_prev: PayState, formData: FormData): Promise<PayState> {
  // Authorization: the order only from her own httpOnly order cookie.
  const access = await readOrderAccess();
  if (!access) redirect("/checkout");
  const input = CardPayment.safeParse(Object.fromEntries(formData));
  if (!input.success) return { status: "failed", pix: null, message: FAILED };
  const { cardToken, installments, idempotencyKey } = input.data;

  const result = await apiPost<components["schemas"]["Payment"]>(
    `/v1/orders/${encodeURIComponent(access.number)}/payments`,
    { method: "card", cardToken, installments },
    { "X-Order-Access": access.access, "Idempotency-Key": idempotencyKey },
  );
  if (!result.ok) {
    const { status, code } = result.problem;
    if (status === 409 && code === "order_already_paid") redirect(`/pedido/${access.number}?confirmado=1`);
    if (status === 409) redirect("/sacola"); // CHK-13 / CHK-21: a piece sold out; the bag says which
    if (status === 401 || status === 404) redirect("/checkout");
    return { status: "failed", pix: null, message: result.problem.title };
  }
  if (result.data.status === "approved") redirect(`/pedido/${access.number}?confirmado=1`);
  refresh(); // a decline ends the reservation: the timer goes away
  return { status: "declined", pix: null, message: result.data.message ?? FAILED };
}
