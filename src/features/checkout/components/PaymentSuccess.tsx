import { readOrderAccess } from "@/src/lib/order-cookie";
import { finishPurchase } from "../actions/finishPurchase.ts";
import { fetchOrder, isPaid } from "../queries/getPaymentOrder.ts";
import { SuccessNotice } from "./SuccessNotice.tsx";

// Review focus 2: only her own paid order shows the box; a made-up or unpaid number shows nothing.
// SuccessNotice is always rendered (with null when nothing is verified): finishPurchase deletes the cookies,
// which makes Next render the page again without them, and the box must stay until she closes it.
export async function PaymentSuccess({ orderNumber }: { orderNumber: string }) {
  const access = await readOrderAccess();
  const result = access?.number === orderNumber ? await fetchOrder() : null;
  const notice = result?.ok && isPaid(result.data.status) ? { number: result.data.number, maskedEmail: result.data.maskedEmail } : null;
  return <SuccessNotice notice={notice} finishPurchase={finishPurchase} />;
}
