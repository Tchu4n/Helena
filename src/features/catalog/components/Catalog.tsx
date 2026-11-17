import Link from "next/link";
import { ErrorMessage } from "@/src/components/ui";
import { catalogHref, CATEGORY_LABELS, type CatalogFilters } from "../filters.ts";
import { listProducts } from "../queries/listProducts.ts";
import { FilterChips } from "./FilterChips.tsx";
import { FilterPanel } from "./FilterPanel.tsx";
import { Pagination } from "./Pagination.tsx";
import { ProductGrid } from "./ProductGrid.tsx";
import { SortPanel } from "./SortPanel.tsx";

function title(filters: CatalogFilters): string {
  if (filters.search) return `Resultados para “${filters.search}”`;
  return filters.category ? CATEGORY_LABELS[filters.category] : "Catálogo";
}

// CAT-01 to CAT-07, CAT-09: filters, chips, count and grid. Errors keep the address (GER-06).
export async function Catalog({ filters, priceError }: { filters: CatalogFilters; priceError: string | null }) {
  const result = await listProducts(filters);
  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <h1 className="font-serif text-[1.75rem] font-normal leading-[1.2] text-balance md:text-[2.5rem]">
        {title(filters)}
      </h1>
      <div className="flex flex-col gap-2 md:flex-row md:items-start">
        <FilterPanel filters={filters} priceError={priceError} />
        <SortPanel filters={filters} />
      </div>
      <FilterChips filters={filters} />

      {!result.ok ? (
        <ErrorMessage title={result.problem.title} retryHref={catalogHref(filters)} />
      ) : result.data.total === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-base">Nenhum produto encontrado</p>
          <Link
            href="/catalogo"
            className="inline-flex min-h-12 items-center rounded-control border border-control bg-card px-6 font-medium"
          >
            Limpar filtros
          </Link>
        </div>
      ) : (
        <section aria-label="Produtos" className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            {result.data.total === 1 ? "1 produto" : `${result.data.total} produtos`}
          </p>
          <ProductGrid products={result.data.items} size={filters.size} eagerCount={2} />
          <Pagination filters={filters} total={result.data.total} perPage={result.data.perPage} />
        </section>
      )}
    </div>
  );
}
