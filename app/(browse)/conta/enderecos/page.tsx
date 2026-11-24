import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ErrorMessage } from "@/src/components/ui";
import { listMyAddresses, makeFavorite, MyAddresses, removeAddress, saveAddress } from "@/src/features/account";

export const metadata: Metadata = { title: "Meus endereços · Helena" };

async function MyAddressesContent() {
  const result = await listMyAddresses();
  // Signed out, without "Seus dados", or the session ended on the API: /conta asks for what is missing.
  if (!result.ok && result.reason === "signed_out") redirect("/conta");
  if (!result.ok) return <ErrorMessage title={result.title ?? "Não foi possível concluir. Tente de novo"} retryHref="/conta/enderecos" />;
  return <MyAddresses addresses={result.addresses} limit={10} saveAddress={saveAddress} removeAddress={removeAddress} makeFavorite={makeFavorite} />;
}

// CTA-05, CTA-11: the account's saved addresses (inside Suspense: cacheComponents).
export default function MyAddressesPage() {
  return (
    <Suspense fallback={null}>
      <MyAddressesContent />
    </Suspense>
  );
}
