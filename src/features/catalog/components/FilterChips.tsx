import Link from "next/link";
import { CloseIcon } from "@/src/components/ui";
import { activeChips, type CatalogFilters } from "../filters.ts";

// CAT-02: active filters as removable chips above the grid.
export function FilterChips({ filters }: { filters: CatalogFilters }) {
  const chips = activeChips(filters);
  if (chips.length === 0) return null;
  return (
    <ul aria-label="Filtros ativos" className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <li key={chip.label}>
          <Link
            href={chip.href}
            aria-label={`Remover filtro: ${chip.label}`}
            className="inline-flex min-h-12 items-center gap-1 rounded-control border border-control bg-card pl-4 pr-3 text-sm"
          >
            {chip.label}
            <CloseIcon className="size-4" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
