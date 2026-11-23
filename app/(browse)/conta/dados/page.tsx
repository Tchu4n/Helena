import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ErrorMessage } from "@/src/components/ui";
import { confirmEmailChange, getAccount, PersonalDetails, requestEmailChange, setPassword, updateContact } from "@/src/features/account";
import { formatPhone } from "@/src/lib/format";

export const metadata: Metadata = { title: "Dados pessoais · Helena" };

async function PersonalDetailsContent() {
  const result = await getAccount();
  // Signed out, without "Seus dados", or the session ended on the API: /conta asks for what is missing.
  if (!result.ok && result.reason === "signed_out") redirect("/conta");
  if (!result.ok) return <ErrorMessage title={result.title ?? "Não foi possível concluir. Tente de novo"} retryHref="/conta/dados" />;
  const { name, phone, maskedCpf, email, hasPassword } = result.account;
  return (
    <PersonalDetails
      account={{ name, phone: formatPhone(phone), maskedCpf, email, hasPassword }}
      updateContact={updateContact}
      requestEmailChange={requestEmailChange}
      confirmEmailChange={confirmEmailChange}
      setPassword={setPassword}
    />
  );
}

// CTA-06, CTA-07: the account's personal details (inside Suspense: cacheComponents).
export default function PersonalDetailsPage() {
  return (
    <Suspense fallback={null}>
      <PersonalDetailsContent />
    </Suspense>
  );
}
