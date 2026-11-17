import Form from "next/form";
import { Button, Field, FilterIcon } from "@/src/components/ui";
import { CATEGORY_LABELS, CATEGORY_SLUGS, SORT_SLUGS, type CatalogFilters, type Category } from "../filters.ts";

const CATEGORIES: Category[] = ["tshirts", "pants", "jackets", "accessories"];
const SIZES = ["P", "M", "G", "GG"];

const SUMMARY =
  "inline-flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-control border border-control bg-card px-5 font-medium";
const OPTION = "flex min-h-12 items-center gap-2";

// CAT-01: category, size, color and price range. A GET form, so it works without JavaScript;
// with JavaScript, next/form navigates without reloading the page (CAT-02).
export function FilterPanel({ filters, priceError }: { filters: CatalogFilters; priceError: string | null }) {
  return (
    <details className="group" open={priceError !== null}>
      <summary className={SUMMARY}>
        <FilterIcon className="size-5" />
        Filtrar
      </summary>
      <Form action="/catalogo" aria-label="Filtros" className="mt-4 flex flex-col gap-6 border-t border-line pt-4">
        <fieldset className="flex flex-col">
          <legend className="mb-1 font-medium">Categoria</legend>
          <label className={OPTION}>
            <input type="radio" name="categoria" value="" defaultChecked={!filters.category} className="size-5 accent-primary" />
            Todas
          </label>
          {CATEGORIES.map((category) => (
            <label key={category} className={OPTION}>
              <input
                type="radio"
                name="categoria"
                value={CATEGORY_SLUGS[category]}
                defaultChecked={filters.category === category}
                className="size-5 accent-primary"
              />
              {CATEGORY_LABELS[category]}
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend className="mb-2 font-medium">Tamanho</legend>
          <div className="flex flex-wrap gap-2">
            {["", ...SIZES].map((size) => (
              <label
                key={size || "all"}
                className="inline-flex min-h-12 min-w-12 cursor-pointer items-center justify-center rounded-control border border-control bg-card px-4 has-[:checked]:border-2 has-[:checked]:border-primary"
              >
                <input type="radio" name="tamanho" value={size} defaultChecked={(filters.size ?? "") === size} className="sr-only" />
                {size || "Todos"}
              </label>
            ))}
          </div>
        </fieldset>

        <Field label="Cor" name="cor" defaultValue={filters.color} maxLength={30} />

        <div className="grid grid-cols-2 gap-2">
          <Field
            label="Preço mínimo (R$)"
            name="precoMin"
            inputMode="numeric"
            defaultValue={filters.minPrice?.toString()}
            error={priceError}
          />
          <Field label="Preço máximo (R$)" name="precoMax" inputMode="numeric" defaultValue={filters.maxPrice?.toString()} />
        </div>

        {filters.search && <input type="hidden" name="busca" value={filters.search} />}
        {filters.sort !== "newest" && <input type="hidden" name="ordem" value={SORT_SLUGS[filters.sort]} />}

        <Button variant="primary" type="submit">
          Aplicar
        </Button>
      </Form>
    </details>
  );
}
