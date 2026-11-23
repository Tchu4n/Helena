"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { apiPost } from "@/src/lib/api";
import type { components } from "@/src/lib/api-types";
import { readOrderAccess } from "@/src/lib/order-cookie";
import type { PayState } from "../types.ts";

const FAILED = "Não foi possível concluir. Tente de novo";

// CHK-15: asks the API for the PIX code. A new attempt after the reservation ended reserves again (CHK-17).
export async function payWithPix(_prev: PayState, formData: FormData): Promise<PayState> {
  // Authorization: the order only from her own httpOnly order cookie.
  const access = await readOrderAccess();
  if (!access) redirect("/checkout");
  const key = z.uuid().safeParse(formData.get("idempotencyKey"));
  if (!key.success) return { status: "failed", pix: null, message: FAILED };

  const result = await apiPost<components["schemas"]["Payment"]>(
    `/v1/orders/${encodeURIComponent(access.number)}/payments`,
    { method: "pix" },
    { "X-Order-Access": access.access, "Idempotency-Key": key.data },
  );
  if (!result.ok) {
    const { status, code } = result.problem;
    if (status === 409 && code === "order_already_paid") redirect(`/pedido/${access.number}?confirmado=1`);
    if (status === 409) redirect("/sacola"); // CHK-13: a piece sold out; the bag says which
    if (status === 401 || status === 404) redirect("/checkout");
    return { status: "failed", pix: null, message: result.problem.title };
  }
  refresh(); // the reservation may have a new end
  const pix = result.data.pix;
  return pix ? { status: "pix", pix: { pixCode: pix.pixCode, qrCode: pix.qrCode }, message: null } : { status: "failed", pix: null, message: FAILED };
}
