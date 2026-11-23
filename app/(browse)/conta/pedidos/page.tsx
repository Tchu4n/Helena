import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ErrorMessage } from "@/src/components/ui";
import { listMyOrders, MyOrders } from "@/src/features/account";

export const metadata: Metadata = { title: "Meus pedidos · Helena" };

async function MyOrdersContent({ searchParams }: { searchParams: PageProps<"/conta/pedidos">["searchParams"] }) {
  const result = await listMyOrders((await searchParams).pagina);
  // Signed out, or the session ended on the API: /conta asks for identification (and for "Seus dados", IDT-14).
  if (!result.ok && result.reason === "signed_out") redirect("/conta");
  if (!result.ok) return <ErrorMessage title={result.title ?? "Não foi possível concluir. Tente de novo"} retryHref="/conta/pedidos" />;
  return <MyOrders orders={result.orders} page={result.page} total={result.total} perPage={result.perPage} />;
}

// CTA-03, CTA-04: the account's orders (inside Suspense: cacheComponents).
export default function MyOrdersPage({ searchParams }: PageProps<"/conta/pedidos">) {
  return (
    <Suspense fallback={null}>
      <MyOrdersContent searchParams={searchParams} />
    </Suspense>
  );
}
