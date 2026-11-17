import "server-only";
import { apiGet, type ApiResult } from "@/src/lib/api";
import type { components } from "@/src/lib/api-types";
import { toApiQuery, type CatalogFilters } from "../filters.ts";
import { toProductListView, type ProductListView } from "../views.ts";

export async function listProducts(filters: CatalogFilters): Promise<ApiResult<ProductListView>> {
  const result = await apiGet<components["schemas"]["ProductPage"]>("/v1/products", toApiQuery(filters));
  return result.ok ? { ok: true, data: toProductListView(result.data) } : result;
}
