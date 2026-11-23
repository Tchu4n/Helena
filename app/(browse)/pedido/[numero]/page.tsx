import type { Metadata } from "next";
import { Suspense } from "react";
import { NotFoundMessage } from "@/src/components/layout";
import { ErrorMessage } from "@/src/components/ui";
import { finishPurchase, OrderSummary } from "@/src/features/checkout";
import { getOrder, OrderConfirmation } from "@/src/features/orders";

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
  // shortcut: the summary alone until Task 3 of the order plan brings the tracking view.
  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-8">
      <h1 className="font-serif text-[1.75rem] font-normal">Pedido {order.number}</h1>
      <OrderSummary summary={summary} open />
    </div>
  );
}

// PED-01 to PED-08: the order is read with her own access cookie (inside Suspense: cacheComponents).
export default function OrderPage(props: PageProps<"/pedido/[numero]">) {
  return (
    <Suspense fallback={null}>
      <OrderContent {...props} />
    </Suspense>
  );
}
