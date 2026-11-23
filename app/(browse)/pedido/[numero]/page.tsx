import type { Metadata } from "next";
import { Suspense } from "react";
import { NotFoundMessage } from "@/src/components/layout";
import { ErrorMessage } from "@/src/components/ui";
import { finishPurchase, OrderSummary } from "@/src/features/checkout";
import { getOrder, OrderConfirmation, OrderTracking } from "@/src/features/orders";

export const metadata: Metadata = { title: "Pedido · Helena" };

async function OrderContent({ params, searchParams }: PageProps<"/pedido/[numero]">) {
  const [{ numero }, { confirmado }] = await Promise.all([params, searchParams]);
  const result = await getOrder(numero);
  // shortcut: no access shows the not-found message; Task 4 of the order plan swaps it for the lookup form.
  if (!result.ok && result.reason === "no_access") return <NotFoundMessage />;
  if (!result.ok) return <ErrorMessage title={result.title ?? "Não foi possível concluir. Tente de novo"} retryHref={`/pedido/${encodeURIComponent(numero)}`} />;
  const { order, summary } = result;
  if (confirmado === "1" && order.paid) {
    return <OrderConfirmation order={order} summary={<OrderSummary summary={summary} open />} finishPurchase={finishPurchase} />;
  }
  return <OrderTracking order={order} summary={<OrderSummary summary={summary} open />} />;
}

// PED-01 to PED-08: the order is read with her own access cookie (inside Suspense: cacheComponents).
export default function OrderPage(props: PageProps<"/pedido/[numero]">) {
  return (
    <Suspense fallback={null}>
      <OrderContent {...props} />
    </Suspense>
  );
}
