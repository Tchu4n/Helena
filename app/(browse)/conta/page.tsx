import type { Metadata } from "next";
import { Suspense } from "react";
import {
  AccountHome,
  changeEmail,
  confirmCode,
  DeletionNotice,
  createPassword,
  finishIdentification,
  IdentificationForm,
  readIdentification,
  requestCode,
  saveAccountDetails,
  signInWithPassword,
  signOut,
  START,
  type IdentificationState,
} from "@/src/features/account";
import { env } from "@/src/lib/env";
import { readSession } from "@/src/lib/session-cookie";

export const metadata: Metadata = { title: "Minha conta · Helena" };

async function AccountContent({ searchParams }: { searchParams: PageProps<"/conta">["searchParams"] }) {
  // CTA-09: after asking for deletion, or after a sign-in that cancelled it.
  const notice = <DeletionNotice value={(await searchParams).exclusao} />;
  // Authorization: the page shows the account only with her own session cookie.
  const session = await readSession();
  if (session?.detailsComplete) {
    return (
      <>
        {notice}
        <AccountHome email={session.email} signOut={signOut} />
      </>
    );
  }
  // IDT-07 here too: a code already sent brings her back to the code step after a reload.
  // IDT-14, CTA-01: signed in without details, "Crie sua senha" (a new account) or "Seus dados" first.
  const pending = await readIdentification();
  const initial: IdentificationState = session
    ? { ...START, step: pending?.done === "password" ? "password" : "details", email: session.email, way: "account" }
    : pending && !pending.done
      ? { ...START, step: "code", email: pending.email, way: "account", sentAt: pending.sentAt }
      : START;
  return (
    <>
      {notice}
      <IdentificationForm
      key={`${initial.step}:${initial.email}`}
      initial={initial}
      mode="account"
      whatsapp={env.storeWhatsapp}
      requestCode={requestCode}
      confirmCode={confirmCode}
      createPassword={createPassword}
      signInWithPassword={signInWithPassword}
      finishIdentification={finishIdentification}
      saveAccountDetails={saveAccountDetails}
      changeEmail={changeEmail}
      />
    </>
  );
}

// CTA-01, CTA-02, CTA-10: sign-in when signed out, the account's home when signed in (inside Suspense: cacheComponents).
export default function AccountPage({ searchParams }: PageProps<"/conta">) {
  return (
    <Suspense fallback={null}>
      <AccountContent searchParams={searchParams} />
    </Suspense>
  );
}
