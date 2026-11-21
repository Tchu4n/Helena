"use server";

import { forgetCart } from "@/src/features/cart";
import { clearOrderAccess } from "@/src/lib/order-cookie";
import { fetchOrder, isPaid } from "../queries/getPaymentOrder.ts";

// After the success message shows: the bag starts empty and the order cookie goes.
// Only for a paid order, so calling it early does nothing. No refresh: the message must stay on screen.
export async function finishPurchase(): Promise<void> {
  const result = await fetchOrder(); // authorization: the order cookie
  if (!result?.ok || !isPaid(result.data.status)) return;
  await clearOrderAccess();
  await forgetCart();
}
