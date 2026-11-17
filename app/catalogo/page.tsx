import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { canonicalRedirect, Catalog, parseFilters } from "@/src/features/catalog";

export const metadata: Metadata = { title: "Catálogo — Helena" };

async function CatalogContent({ searchParams }: { searchParams: PageProps<"/catalogo">["searchParams"] }) {
  const params = await searchParams;
  const clean = canonicalRedirect(params);
  if (clean) redirect(clean);
  const { filters, priceError } = parseFilters(params);
  return <Catalog filters={filters} priceError={priceError} />;
}

export default function CatalogPage({ searchParams }: PageProps<"/catalogo">) {
  return (
    <Suspense fallback={null}>
      <CatalogContent searchParams={searchParams} />
    </Suspense>
  );
}
