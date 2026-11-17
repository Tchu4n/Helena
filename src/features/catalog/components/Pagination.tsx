import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "@/src/components/ui";
import { catalogHref, type CatalogFilters } from "../filters.ts";

const LINK = "inline-flex min-h-12 items-center gap-1 rounded-control border border-control bg-card px-4";

export function Pagination({ filters, total, perPage }: { filters: CatalogFilters; total: number; perPage: number }) {
  const hasPrevious = filters.page > 1;
  const hasNext = filters.page * perPage < total;
  if (!hasPrevious && !hasNext) return null;
  return (
    <nav aria-label="Páginas" className="flex justify-between gap-2">
      {hasPrevious ? (
        <Link href={catalogHref({ ...filters, page: filters.page - 1 })} className={LINK}>
          <ChevronLeftIcon className="size-5" />
          Anterior
        </Link>
      ) : (
        <span />
      )}
      {hasNext && (
        <Link href={catalogHref({ ...filters, page: filters.page + 1 })} className={LINK}>
          Próxima
          <ChevronRightIcon className="size-5" />
        </Link>
      )}
    </nav>
  );
}
