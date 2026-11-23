import "server-only";
import { summaryFromOrder, type SummaryView } from "@/src/features/checkout";
import { apiGet } from "@/src/lib/api";
import type { components } from "@/src/lib/api-types";
import { readOrderAccess, readTrackingAccess } from "@/src/lib/order-cookie";
import { toOrderView, type OrderView } from "../views.ts";

type Order = components["schemas"]["Order"];

// Authorization: the URL number alone never shows data (PED-05). The access comes from her own
// httpOnly cookie for that same number: the order being paid (first render of the confirmation) or the tracking one.
export async function getOrder(
  number: string,
): Promise<{ ok: true; order: OrderView; summary: SummaryView } | { ok: false; reason: "no_access" | "error"; title?: string }> {
  const [paying, tracking] = await Promise.all([readOrderAccess(), readTrackingAccess()]);
  const access = paying?.number === number ? paying : tracking?.number === number ? tracking : null;
  if (!access) return { ok: false, reason: "no_access" };
  const result = await apiGet<Order>(`/v1/orders/${encodeURIComponent(number)}`, {}, { "X-Order-Access": access.access });
  if (result.ok) return { ok: true, order: toOrderView(result.data), summary: summaryFromOrder(result.data) };
  const denied = result.problem.status === 401 || result.problem.status === 404;
  return denied ? { ok: false, reason: "no_access" } : { ok: false, reason: "error", title: result.problem.title };
}
