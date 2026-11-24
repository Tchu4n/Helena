import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PurchaseSteps } from "@/src/components/layout";
import { ErrorMessage } from "@/src/components/ui";
import { changeEmail, getAccount, listMyAddresses } from "@/src/features/account";
import { chooseDelivery, getCart } from "@/src/features/cart";
import { DetailsForm, goToPayment, OrderSummary, saveCheckoutCep, saveLead, summaryFromCart } from "@/src/features/checkout";
import { formatPhone } from "@/src/lib/format";
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
  // IDT-11: signed in, name, CPF (partly hidden) and phone come from the account, read-only.
  // Review focus 3: a session ended on the API goes to identification's first step, once.
  const [found, saved] = session ? await Promise.all([getAccount(), listMyAddresses()]) : [null, null];
  if (found && !found.ok && found.reason === "signed_out") redirect("/checkout/identificacao?sessao=encerrada");
  if (found && !found.ok) return <ErrorMessage title={found.title ?? "Não foi possível concluir. Tente de novo"} retryHref="/checkout" />;
  const account = found?.ok ? { name: found.account.name, maskedCpf: found.account.maskedCpf, phone: formatPhone(found.account.phone) } : undefined;
  // CTA-12: her saved addresses as choices; if they can't be read, she types the address as usual.
  const savedAddresses = saved?.ok ? saved.addresses.map(({ id, favorite, line, place, fields }) => ({ id, favorite, line, place, fields })) : undefined;
  const email = session?.email ?? cart.verifiedEmail;
  // IDT-12: no confirmed e-mail, no "Dados e entrega".
  if (!email) redirect("/checkout/identificacao");
  return (
    <div className="flex flex-col gap-3 px-4 pt-2 pb-6">
      <h1 className="sr-only">Dados e entrega</h1>
      <OrderSummary summary={summaryFromCart(cart)} />
      <DetailsForm
        email={email}
        account={account}
        savedAddresses={savedAddresses}
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
