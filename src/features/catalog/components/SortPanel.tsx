import Form from "next/form";
import { Button, SortIcon } from "@/src/components/ui";
import { SORT_LABELS, SORT_SLUGS, toSearchParams, type CatalogFilters, type Sort } from "../filters.ts";

const SORTS: Sort[] = ["newest", "lowest_price", "highest_price", "biggest_discount", "best_sellers"];

// CAT-09: changing the order keeps the active filters (sent as hidden fields) and goes back to page 1.
export function SortPanel({ filters }: { filters: CatalogFilters }) {
  const kept = [...new URLSearchParams(toSearchParams({ ...filters, sort: "newest", page: 1 }))];
  return (
    <details>
      <summary className="inline-flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-control border border-control bg-card px-5 font-medium">
        <SortIcon className="size-5" />
        Ordenar
      </summary>
      <Form action="/catalogo" aria-label="Ordem" className="mt-4 flex flex-col border-t border-line pt-4">
        {SORTS.map((sort) => (
          <label key={sort} className="flex min-h-12 items-center gap-2">
            <input
              type="radio"
              name="ordem"
              value={SORT_SLUGS[sort]}
              defaultChecked={filters.sort === sort}
              className="size-5 accent-primary"
            />
            {SORT_LABELS[sort]}
          </label>
        ))}
        {kept.map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <Button variant="primary" type="submit" className="mt-4">
          Aplicar
        </Button>
      </Form>
    </details>
  );
}
