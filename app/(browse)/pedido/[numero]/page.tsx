import type { Metadata } from "next";
import { Suspense } from "react";
import { ErrorMessage } from "@/src/components/ui";
import { finishPurchase, OrderSummary } from "@/src/features/checkout";
import { getOrder, lookUpOrder, OrderConfirmation, OrderLookupForm, OrderTracking } from "@/src/features/orders";

export const metadata: Metadata = { title: "Pedido · Helena" };

async function OrderContent({ params, searchParams }: PageProps<"/pedido/[numero]">) {
  const [{ numero }, { confirmado }] = await Promise.all([params, searchParams]);
  const result = await getOrder(numero);
  // No access of her own for this number: only the lookup form, with the number filled in (PED-05).
  if (!result.ok && result.reason === "no_access") {
    return <OrderLookupForm number={/^HL-\d{1,12}$/.test(numero) ? numero : ""} lookUpOrder={lookUpOrder} />;
  }
  if (!result.ok) return <ErrorMessage title={result.title ?? "Não foi possível concluir. Tente de novo"} retryHref={`/pedido/${encodeURIComponent(numero)}`} />;
  const { order, summary } = result;
  if (confirmado === "1" && order.paid) {
    return <OrderConfirmation order={order} summary={<OrderSummary summary={summary} open />} finishPurchase={finishPurchase} />;
  }
  return <OrderTracking order={order} address={result.address} summary={<OrderSummary summary={summary} open />} />;
}

// PED-01 to PED-08, CTA-03: the order is read with her session or her own access cookie (inside Suspense: cacheComponents).
export default function OrderPage(props: PageProps<"/pedido/[numero]">) {
  return (
    <Suspense fallback={null}>
      <OrderContent {...props} />
    </Suspense>
  );
}
