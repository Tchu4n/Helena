"use server";

import { refresh } from "next/cache";
import { clearOrderAccess } from "@/src/lib/order-cookie";
import { z } from "zod";
import { apiPut } from "@/src/lib/api";
import { readCartId } from "../cart-session.ts";
import type { CouponState } from "../types.ts";

const input = z.object({ code: z.string().trim().min(1).max(20) });
const FAILED = "Não foi possível concluir. Tente de novo";

// SAC-11 to SAC-15: the API replaces any previous coupon (one per purchase). The typed code always goes back (GER-06).
export async function applyCoupon(_prev: CouponState, formData: FormData): Promise<CouponState> {
  // Authorization: only the visitor's own cart (cookie).
  const cartId = await readCartId();
  const typed = typeof formData.get("code") === "string" ? String(formData.get("code")).slice(0, 20) : "";
  if (!cartId) return { status: "failed", code: typed, message: FAILED };
  const parsed = input.safeParse({ code: formData.get("code") });
  if (!parsed.success) return { status: "invalid", code: typed, message: "Digite o código do cupom" };

  const result = await apiPut(`/v1/carts/${cartId}/coupon`, { code: parsed.data.code.toUpperCase() });
  if (!result.ok) {
    return { status: result.problem.status === 422 ? "invalid" : "failed", code: typed, message: result.problem.title };
  }
  await clearOrderAccess(); // any bag change ends the payment in progress (SAC-17)
  refresh();
  return { status: "ok", code: "", message: null };
}
