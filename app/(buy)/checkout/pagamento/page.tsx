import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PurchaseSteps } from "@/src/components/layout";
import { ErrorMessage } from "@/src/components/ui";
import { checkPayment, getPaymentOrder, OrderSummary, PaymentPanel, payWithPix } from "@/src/features/checkout";

export const metadata: Metadata = { title: "Pagamento · Helena" };

async function PaymentContent() {
  const result = await getPaymentOrder();
  if (!result.ok && result.reason === "no_order") redirect("/checkout");
  if (!result.ok) return <ErrorMessage title={result.title ?? "Não foi possível concluir. Tente de novo"} retryHref="/checkout/pagamento" />;
  const order = result.order;
  if (order.status !== "awaiting_payment" && order.status !== "reservation_expired") redirect(`/?pedido=${order.number}`);
  return (
    <div className="flex flex-col gap-3 px-4 pt-2 pb-6">
      <h1 className="sr-only">Pagamento</h1>
      <PaymentPanel
        total={order.total}
        reservationExpiresAt={order.reservationExpiresAt}
        pix={order.pix}
        summary={<OrderSummary summary={order.summary} />}
        payWithPix={payWithPix}
        checkPayment={checkPayment}
      />
    </div>
  );
}

// CHK-12 to CHK-16: the order is read from her own order cookie (inside Suspense: cacheComponents).
export default function PaymentPage() {
  return (
    <>
      <PurchaseSteps current="payment" />
      <Suspense fallback={null}>
        <PaymentContent />
      </Suspense>
    </>
  );
}
