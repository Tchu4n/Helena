import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ErrorMessage } from "@/src/components/ui";
import { AccountPrivacy, listMyConsents, requestCopy, requestDeletion, updateConsent } from "@/src/features/privacy";

export const metadata: Metadata = { title: "Privacidade · Helena" };

async function AccountPrivacyContent() {
  const result = await listMyConsents();
  // Signed out, without "Seus dados", or the session ended on the API: /conta asks for what is missing.
  if (!result.ok && result.reason === "signed_out") redirect("/conta");
  if (!result.ok) return <ErrorMessage title={result.title ?? "Não foi possível concluir. Tente de novo"} retryHref="/conta/privacidade" />;
  return <AccountPrivacy consents={result.consents} updateConsent={updateConsent} requestCopy={requestCopy} requestDeletion={requestDeletion} />;
}

// CTA-08, CTA-09: the account's privacy (inside Suspense: cacheComponents).
export default function AccountPrivacyPage() {
  return (
    <Suspense fallback={null}>
      <AccountPrivacyContent />
    </Suspense>
  );
}
