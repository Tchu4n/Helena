import "server-only";
import { apiGet, type ApiResult } from "@/src/lib/api";
import type { components } from "@/src/lib/api-types";
import { readOrderAccess } from "@/src/lib/order-cookie";
import { toPaymentView, type PaymentView } from "../views.ts";

type Order = components["schemas"]["Order"];

// Statuses after the payment went through: the payment page sends her to the order confirmation instead.
export function isPaid(status: Order["status"]): boolean {
  return status !== "awaiting_payment" && status !== "reservation_expired";
}

// Authorization: the order only from her own httpOnly order cookie, never from a URL or a form.
export async function fetchOrder(): Promise<ApiResult<Order> | null> {
  const access = await readOrderAccess();
  if (!access) return null;
  return apiGet<Order>(`/v1/orders/${encodeURIComponent(access.number)}`, {}, { "X-Order-Access": access.access });
}

export async function getPaymentOrder(): Promise<
  { ok: true; order: PaymentView } | { ok: false; reason: "no_order" | "error"; title?: string }
> {
  const result = await fetchOrder();
  if (!result) return { ok: false, reason: "no_order" };
  if (result.ok) return { ok: true, order: toPaymentView(result.data) };
  const gone = result.problem.status === 401 || result.problem.status === 404;
  return gone ? { ok: false, reason: "no_order" } : { ok: false, reason: "error", title: result.problem.title };
}
