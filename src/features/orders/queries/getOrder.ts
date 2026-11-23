import "server-only";
import { summaryFromOrder, type SummaryView } from "@/src/features/checkout";
import { apiGet, type ApiResult } from "@/src/lib/api";
import type { components } from "@/src/lib/api-types";
import { readOrderAccess, readTrackingAccess } from "@/src/lib/order-cookie";
import { bearer, readSession } from "@/src/lib/session-cookie";
import { addressLine, toOrderView, type OrderView } from "../views.ts";

type Order = components["schemas"]["Order"];
type OrderResult =
  | { ok: true; order: OrderView; summary: SummaryView; address: string | null }
  | { ok: false; reason: "no_access" | "error"; title?: string };

const path = (number: string) => `/v1/orders/${encodeURIComponent(number)}`;
const denied = (result: ApiResult<Order>) => !result.ok && (result.problem.status === 401 || result.problem.status === 404);
const shown = (data: Order): OrderResult => ({ ok: true, order: toOrderView(data), summary: summaryFromOrder(data), address: addressLine(data) });

// Authorization: the URL number alone never shows data (PED-05). The access comes from her own session
// (CTA-03: the account's orders, with the address; another's is a 404, CTA-11), or else from her own httpOnly
// cookie for that same number: the order being paid (first render of the confirmation) or the tracking one.
export async function getOrder(number: string): Promise<OrderResult> {
  const session = await readSession();
  if (session) {
    const mine = await apiGet<Order>(path(number), {}, bearer(session));
    if (mine.ok) return shown(mine.data);
    // Review focus 4: not hers (or the session ended): the order she follows by its own access still shows.
    if (!denied(mine)) return { ok: false, reason: "error", title: mine.problem.title };
  }
  const [paying, tracking] = await Promise.all([readOrderAccess(), readTrackingAccess()]);
  const access = paying?.number === number ? paying : tracking?.number === number ? tracking : null;
  if (!access) return { ok: false, reason: "no_access" };
  const result = await apiGet<Order>(path(number), {}, { "X-Order-Access": access.access });
  if (result.ok) return shown(result.data);
  return denied(result) ? { ok: false, reason: "no_access" } : { ok: false, reason: "error", title: result.problem.title };
}
