import type { Metadata } from "next";
import { Suspense } from "react";
import { ForgetCepHistory } from "@/src/features/cart/client";
import { CookiePreferences, getConsent } from "@/src/features/privacy";

export const metadata: Metadata = { title: "Preferências de cookies — Helena" };

async function Preferences({ searchParams }: { searchParams: PageProps<"/cookies">["searchParams"] }) {
  const [consent, params] = await Promise.all([getConsent(), searchParams]);
  return (
    <>
      {/* PRO-15: without "Funcionais", the CEP history goes at once (review focus 4). */}
      {consent?.functional !== true && <ForgetCepHistory />}
      <CookiePreferences consent={consent} saved={params.salvo === "1"} />
    </>
  );
}

export default function CookiesPage({ searchParams }: PageProps<"/cookies">) {
  return (
    // GER-07: room at the end so "Salvar preferências" can scroll above the cookie banner fixed at the bottom.
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pt-8 pb-64 md:pb-8">
      <h1 className="font-serif text-[1.75rem] font-normal leading-[1.2] md:text-[2.5rem]">
        Preferências de cookies
      </h1>
      <p className="text-muted">
        Escolha quais cookies opcionais a Helena pode usar. Você pode mudar a qualquer momento.
      </p>
      <Suspense fallback={null}>
        <Preferences searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
