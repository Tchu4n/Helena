import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PurchaseSteps } from "@/src/components/layout";
import { ErrorMessage } from "@/src/components/ui";
import { changeEmail } from "@/src/features/account";
import { chooseDelivery, getCart } from "@/src/features/cart";
import { DetailsForm, goToPayment, OrderSummary, saveCheckoutCep, saveLead, summaryFromCart } from "@/src/features/checkout";
import { readSession } from "@/src/lib/session-cookie";

export const metadata: Metadata = { title: "Dados e entrega · Helena" };

async function CheckoutContent() {
  const result = await getCart();
  if (!result.ok) return <ErrorMessage title={result.title} retryHref="/checkout" />;
  const cart = result.cart;
  if (!cart || cart.items.length === 0) redirect("/sacola");
  // IDT-11: signed in, the e-mail is the session's (a new bag isn't confirmed yet; the customer step confirms it).
  const session = await readSession();
  // IDT-14: an account without name, CPF and phone fills "Seus dados" first.
  if (session && !session.detailsComplete) redirect("/checkout/identificacao");
  const email = session?.email ?? cart.verifiedEmail;
  // IDT-12: no confirmed e-mail, no "Dados e entrega".
  if (!email) redirect("/checkout/identificacao");
  return (
    <div className="flex flex-col gap-3 px-4 pt-2 pb-6">
      <h1 className="sr-only">Dados e entrega</h1>
      <OrderSummary summary={summaryFromCart(cart)} />
      <DetailsForm
        email={email}
        changeEmail={session ? undefined : changeEmail}
        total={cart.total}
        cep={cart.cep}
        deliveryOptions={cart.deliveryOptions}
        chosenDelivery={cart.chosenDelivery}
        saveLead={saveLead}
        saveCheckoutCep={saveCheckoutCep}
        chooseDelivery={chooseDelivery}
        goToPayment={goToPayment}
      />
    </div>
  );
}

// CHK-01, IDT-03: after identification, with the confirmed e-mail. Reading the cookie and the API goes inside Suspense (cacheComponents).
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
