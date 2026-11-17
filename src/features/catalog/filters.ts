// Catalog filters live in the page address (CAT-03), with Portuguese names because the address
// is part of the store the customer sees. This file converts between the address and the API.
import type { components, operations } from "../../lib/api-types.ts";

export type Category = components["schemas"]["Category"];
export type Sort = NonNullable<NonNullable<operations["listProducts"]["parameters"]["query"]>["sort"]>;

export type CatalogFilters = {
  category?: Category;
  size?: string;
  color?: string;
  minPrice?: number; // reais
  maxPrice?: number; // reais
  search?: string;
  sort: Sort;
  page: number;
};

type Params = Record<string, string | string[] | undefined>;

export const CATEGORY_LABELS: Record<Category, string> = {
  tshirts: "Camisetas",
  pants: "Calças",
  jackets: "Jaquetas",
  accessories: "Acessórios",
};

export const SORT_LABELS: Record<Sort, string> = {
  newest: "Novidades",
  lowest_price: "Menor preço",
  highest_price: "Maior preço",
  biggest_discount: "Maior desconto",
  best_sellers: "Mais vendidos",
};

// Address value <-> API value.
export const CATEGORY_SLUGS: Record<Category, string> = {
  tshirts: "camisetas",
  pants: "calcas",
  jackets: "jaquetas",
  accessories: "acessorios",
};

export const SORT_SLUGS: Record<Sort, string> = {
  newest: "novidades",
  lowest_price: "menor-preco",
  highest_price: "maior-preco",
  biggest_discount: "maior-desconto",
  best_sellers: "mais-vendidos",
};

const PRICE_ERROR = "O preço mínimo não pode ser maior que o máximo";
const MAX_TEXT = { size: 5, color: 30, search: 80 }; // limits from the contract

function first(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

function text(value: string | string[] | undefined, max: number): string | undefined {
  return first(value)?.slice(0, max);
}

function wholeNumber(value: string | string[] | undefined, min: number): number | undefined {
  const raw = first(value);
  if (!raw || !/^\d+$/.test(raw)) return undefined;
  const n = Number(raw);
  return n >= min ? n : undefined;
}

function findKey<K extends string>(map: Record<K, string>, slug: string | undefined): K | undefined {
  return (Object.keys(map) as K[]).find((key) => map[key] === slug);
}

export function parseFilters(params: Params): { filters: CatalogFilters; priceError: string | null } {
  let minPrice = wholeNumber(params.precoMin, 0);
  let maxPrice = wholeNumber(params.precoMax, 0);
  let priceError: string | null = null;
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    priceError = PRICE_ERROR;
    minPrice = undefined;
    maxPrice = undefined;
  }

  return {
    filters: {
      category: findKey(CATEGORY_SLUGS, first(params.categoria)),
      size: text(params.tamanho, MAX_TEXT.size),
      color: text(params.cor, MAX_TEXT.color),
      minPrice,
      maxPrice,
      search: text(params.busca, MAX_TEXT.search),
      sort: findKey(SORT_SLUGS, first(params.ordem)) ?? "newest",
      page: wholeNumber(params.pagina, 1) ?? 1,
    },
    priceError,
  };
}

// Keys always in this order, so the same filters always give the same address.
export function toSearchParams(filters: CatalogFilters): string {
  const params = new URLSearchParams();
  if (filters.category) params.set("categoria", CATEGORY_SLUGS[filters.category]);
  if (filters.size) params.set("tamanho", filters.size);
  if (filters.color) params.set("cor", filters.color);
  if (filters.minPrice !== undefined) params.set("precoMin", String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set("precoMax", String(filters.maxPrice));
  if (filters.search) params.set("busca", filters.search);
  if (filters.sort !== "newest") params.set("ordem", SORT_SLUGS[filters.sort]);
  if (filters.page > 1) params.set("pagina", String(filters.page));
  return params.toString();
}

export function catalogHref(filters: CatalogFilters): string {
  const query = toSearchParams(filters);
  return query ? `/catalogo?${query}` : "/catalogo";
}

export function toApiQuery(filters: CatalogFilters): Record<string, string | number | undefined> {
  return {
    category: filters.category,
    size: filters.size,
    color: filters.color,
    minPrice: filters.minPrice === undefined ? undefined : filters.minPrice * 100,
    maxPrice: filters.maxPrice === undefined ? undefined : filters.maxPrice * 100,
    search: filters.search,
    sort: filters.sort,
    page: filters.page,
  };
}

// CAT-02: one removable chip per filter; removing one goes back to page 1.
export function activeChips(filters: CatalogFilters): { label: string; href: string }[] {
  const without = (change: Partial<CatalogFilters>) => catalogHref({ ...filters, ...change, page: 1 });
  const chips: { label: string; href: string }[] = [];
  if (filters.category) chips.push({ label: CATEGORY_LABELS[filters.category], href: without({ category: undefined }) });
  if (filters.size) chips.push({ label: `Tamanho ${filters.size}`, href: without({ size: undefined }) });
  if (filters.color) chips.push({ label: `Cor ${filters.color}`, href: without({ color: undefined }) });
  if (filters.minPrice !== undefined)
    chips.push({ label: `A partir de R$ ${filters.minPrice}`, href: without({ minPrice: undefined }) });
  if (filters.maxPrice !== undefined)
    chips.push({ label: `Até R$ ${filters.maxPrice}`, href: without({ maxPrice: undefined }) });
  if (filters.search) chips.push({ label: `Busca: ${filters.search}`, href: without({ search: undefined }) });
  return chips;
}

// A GET form also sends empty fields (?cor=&precoMin=). Returns the clean address to redirect to,
// or null when the address is already clean. With a price error the typed values stay, so the
// screen can show the error next to them (CAT-04).
export function canonicalRedirect(params: Params): string | null {
  const { filters, priceError } = parseFilters(params);
  if (priceError) return null;
  const current = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const v of Array.isArray(value) ? value : value === undefined ? [] : [value]) current.append(key, v);
  }
  return current.toString() === toSearchParams(filters) ? null : catalogHref(filters);
}
