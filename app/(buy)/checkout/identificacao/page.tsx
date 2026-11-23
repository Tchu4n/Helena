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
  saveAccountDetails,
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
  const session = await readSession();
  // IDT-11: signed in, the step is skipped, unless the code has just signed her in and a step is left (IDT-08, IDT-09).
  if (!pending?.done && session?.detailsComplete) redirect("/checkout");
  // IDT-07: a code already sent brings her back to the code step after a reload; IDT-14: signed in without details, "Seus dados".
  const initial: IdentificationState = pending?.done
    ? { ...START, step: pending.done, email: pending.email, way: pending.way, notice: pending.done === "existing" ? EXISTING_ACCOUNT : null }
    : session
      ? { ...START, step: "details", email: session.email }
      : pending
        ? { ...START, step: "code", email: pending.email, way: pending.way, sentAt: pending.sentAt }
        : START;
  return (
    <IdentificationForm
      // A new pending e-mail (or none, after "Trocar e-mail") starts the form over.
      key={pending ? `pending:${pending.email}` : session ? "details" : "email"}
      initial={initial}
      mode="checkout"
      whatsapp={env.storeWhatsapp}
      requestCode={requestCode}
      confirmCode={confirmCode}
      createPassword={createPassword}
      signInWithPassword={signInWithPassword}
      finishIdentification={finishIdentification}
      saveAccountDetails={saveAccountDetails}
      changeEmail={changeEmail}
    />
  );
}

// IDT-01 to IDT-11, IDT-14: the e-mail is confirmed with a code before "Dados e entrega" (inside Suspense: cacheComponents).
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
