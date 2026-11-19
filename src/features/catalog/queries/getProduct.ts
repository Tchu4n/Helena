import "server-only";
import { apiGet, type ApiResult, type Problem } from "@/src/lib/api";
import type { components } from "@/src/lib/api-types";
import { toProductView, type ProductView } from "../views.ts";

const NOT_FOUND: Problem = { type: "about:blank", title: "Não encontrado", status: 404, code: "not_found" };

// Only plain slugs reach the API, so an odd address ("..", "..%2Fcarts") can never reach another API route.
export async function getProduct(slug: string): Promise<ApiResult<ProductView>> {
  if (!/^[a-z0-9-]+$/.test(slug)) return { ok: false, problem: NOT_FOUND };
  const result = await apiGet<components["schemas"]["Product"]>(`/v1/products/${encodeURIComponent(slug)}`);
  return result.ok ? { ok: true, data: toProductView(result.data) } : result;
}
