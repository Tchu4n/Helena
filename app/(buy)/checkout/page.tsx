import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PurchaseSteps } from "@/src/components/layout";
import { ErrorMessage } from "@/src/components/ui";
import { getCart } from "@/src/features/cart";
import { DetailsForm, OrderSummary, saveLead, summaryFromCart } from "@/src/features/checkout";

export const metadata: Metadata = { title: "Dados e entrega · Helena" };

async function CheckoutContent() {
  const result = await getCart();
  if (!result.ok) return <ErrorMessage title={result.title} retryHref="/checkout" />;
  const cart = result.cart;
  if (!cart || cart.items.length === 0) redirect("/sacola");
  return (
    <div className="flex flex-col gap-3 px-4 pt-2 pb-6">
      <h1 className="sr-only">Dados e entrega</h1>
      <OrderSummary summary={summaryFromCart(cart)} />
      <DetailsForm total={cart.total} saveLead={saveLead} />
    </div>
  );
}

// CHK-01: straight from the bag, no account. Reading the cookie and the API goes inside Suspense (cacheComponents).
export default function CheckoutPage() {
  return (
    <>
      <PurchaseSteps current="details" />
      <Suspense fallback={null}>
        <CheckoutContent />
      </Suspense>
    </>
  );
}
