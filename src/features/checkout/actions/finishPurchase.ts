"use server";

import { forgetCart } from "@/src/features/cart";
import { clearOrderAccess, readOrderAccess, saveTrackingAccess } from "@/src/lib/order-cookie";
import { fetchOrder, isPaid } from "../queries/getPaymentOrder.ts";

// When the confirmation opens (PED-02): she keeps reading the order through the tracking cookie,
// the bag starts empty and the order cookie goes. Only for a paid order, so calling it early does nothing.
export async function finishPurchase(): Promise<void> {
  const result = await fetchOrder(); // authorization: the order cookie
  const access = await readOrderAccess();
  if (!access || !result?.ok || !isPaid(result.data.status)) return;
  await saveTrackingAccess(access, 60 * 60);
  await clearOrderAccess();
  await forgetCart();
}
