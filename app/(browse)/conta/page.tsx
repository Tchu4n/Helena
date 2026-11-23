import type { Metadata } from "next";
import { Suspense } from "react";
import {
  AccountHome,
  changeEmail,
  confirmCode,
  createPassword,
  finishIdentification,
  IdentificationForm,
  readIdentification,
  requestCode,
  signInWithPassword,
  signOut,
  START,
  type IdentificationState,
} from "@/src/features/account";
import { env } from "@/src/lib/env";
import { readSession } from "@/src/lib/session-cookie";

export const metadata: Metadata = { title: "Minha conta · Helena" };

async function AccountContent() {
  // Authorization: the page shows the account only with her own session cookie.
  const session = await readSession();
  if (session) return <AccountHome email={session.email} signOut={signOut} />;
  // IDT-07 here too: a code already sent brings her back to the code step after a reload.
  const pending = await readIdentification();
  const waiting = pending && !pending.done ? pending : null;
  const initial: IdentificationState = waiting ? { ...START, step: "code", email: waiting.email, way: "account", sentAt: waiting.sentAt } : START;
  return (
    <IdentificationForm
      key={waiting ? `pending:${waiting.email}` : "email"}
      initial={initial}
      mode="account"
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

// CTA-01, CTA-02, CTA-10: sign-in when signed out, the account's home when signed in (inside Suspense: cacheComponents).
export default function AccountPage() {
  return (
    <Suspense fallback={null}>
      <AccountContent />
    </Suspense>
  );
}
