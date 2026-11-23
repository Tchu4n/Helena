import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PurchaseSteps } from "@/src/components/layout";
import { ErrorMessage } from "@/src/components/ui";
import {
  changeEmail,
  confirmCode,
  createPassword,
  EXISTING_ACCOUNT,
  finishIdentification,
  IdentificationForm,
  readIdentification,
  requestCode,
  signInWithPassword,
  START,
  type IdentificationState,
} from "@/src/features/account";
import { getCart } from "@/src/features/cart";
import { env } from "@/src/lib/env";
import { readSession } from "@/src/lib/session-cookie";

export const metadata: Metadata = { title: "Identificação · Helena" };

async function IdentificationContent() {
  const result = await getCart();
  if (!result.ok) return <ErrorMessage title={result.title} retryHref="/checkout/identificacao" />;
  if (!result.cart || result.cart.items.length === 0) redirect("/sacola");
  const pending = await readIdentification();
  // IDT-11: signed in, the step is skipped, unless the code has just signed her in and a step is left (IDT-08, IDT-09).
  if (!pending?.done && (await readSession())) redirect("/checkout");
  // IDT-07: a code already sent brings her back to the code step after a reload.
  const initial: IdentificationState = !pending
    ? START
    : pending.done
      ? { ...START, step: pending.done, email: pending.email, way: pending.way, notice: pending.done === "existing" ? EXISTING_ACCOUNT : null }
      : { ...START, step: "code", email: pending.email, way: pending.way, sentAt: pending.sentAt };
  return (
    <IdentificationForm
      // A new pending e-mail (or none, after "Trocar e-mail") starts the form over.
      key={pending ? `pending:${pending.email}` : "email"}
      initial={initial}
      mode="checkout"
      whatsapp={env.storeWhatsapp}
      requestCode={requestCode}
      confirmCode={confirmCode}
      createPassword={createPassword}
      signInWithPassword={signInWithPassword}
      finishIdentification={finishIdentification}
      changeEmail={changeEmail}
    />
  );
}

// IDT-01 to IDT-11: the e-mail is confirmed with a code before "Dados e entrega" (inside Suspense: cacheComponents).
export default function IdentificationPage() {
  return (
    <>
      <PurchaseSteps current="identification" />
      <Suspense fallback={null}>
        <IdentificationContent />
      </Suspense>
    </>
  );
}
