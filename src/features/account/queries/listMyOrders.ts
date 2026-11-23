import "server-only";
import { z } from "zod";
import { toMyOrderView, type MyOrderView } from "@/src/features/orders";
import { apiGet } from "@/src/lib/api";
import type { components } from "@/src/lib/api-types";
import { bearer, readSession } from "@/src/lib/session-cookie";

const PER_PAGE = 24; // CTA-03

export type MyOrdersResult =
  | { ok: true; orders: MyOrderView[]; page: number; total: number; perPage: number }
  | { ok: false; reason: "signed_out" | "error"; title?: string };

// `?pagina=` from the URL: a whole number from 1, anything else is page 1.
const pageInput = z.coerce.number().int().min(1).max(10_000).catch(1);

// CTA-03, CTA-04: the signed-in customer's own orders, newest first.
export async function listMyOrders(pageParam: unknown): Promise<MyOrdersResult> {
  const page = pageInput.parse(Array.isArray(pageParam) ? pageParam[0] : pageParam);
  // Authorization: only the account of her own session cookie.
  const session = await readSession();
  // IDT-14: without "Seus dados" the account's sections wait; /conta shows that step.
  if (!session?.detailsComplete) return { ok: false, reason: "signed_out" };
  const result = await apiGet<components["schemas"]["OrderPage"]>("/v1/account/orders", { page, perPage: PER_PAGE }, bearer(session));
  if (!result.ok) return result.problem.status === 401 ? { ok: false, reason: "signed_out" } : { ok: false, reason: "error", title: result.problem.title };
  return { ok: true, orders: result.data.items.map(toMyOrderView), page, total: result.data.total, perPage: result.data.perPage };
}
