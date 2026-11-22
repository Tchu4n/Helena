"use server";

import { refresh } from "next/cache";
import { clearOrderAccess } from "@/src/lib/order-cookie";
import { apiDelete } from "@/src/lib/api";
import { readCartId } from "../cart-session.ts";
import type { CouponState } from "../types.ts";

// SAC-14: removing the coupon brings back the amounts without it.
export async function removeCoupon(): Promise<CouponState> {
  const cartId = await readCartId();
  if (!cartId) return { status: "failed", code: "", message: "Não foi possível concluir. Tente de novo" };

  const result = await apiDelete(`/v1/carts/${cartId}/coupon`);
  if (!result.ok) return { status: "failed", code: "", message: result.problem.title };
  await clearOrderAccess(); // any bag change ends the payment in progress (SAC-17)
  refresh();
  return { status: "ok", code: "", message: null };
}
