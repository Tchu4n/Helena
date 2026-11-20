"use server";

import { refresh } from "next/cache";
import { apiDelete } from "@/src/lib/api";
import { readCartId } from "../cart-session.ts";
import type { CouponState } from "../types.ts";

// SAC-14: removing the coupon brings back the amounts without it.
export async function removeCoupon(): Promise<CouponState> {
  const cartId = await readCartId();
  if (!cartId) return { status: "failed", code: "", message: "Não foi possível concluir. Tente de novo" };

  const result = await apiDelete(`/v1/carts/${cartId}/coupon`);
  if (!result.ok) return { status: "failed", code: "", message: result.problem.title };
  refresh();
  return { status: "ok", code: "", message: null };
}
