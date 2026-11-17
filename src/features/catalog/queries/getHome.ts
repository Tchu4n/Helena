import "server-only";
import { cache } from "react";
import { apiGet, type ApiResult } from "@/src/lib/api";
import type { components } from "@/src/lib/api-types";
import { toHomeView, type HomeView } from "../views.ts";

// Wrapped in cache so the layout (announcement bar) and the home page share one API call per request.
export const getHome = cache(async (): Promise<ApiResult<HomeView>> => {
  const result = await apiGet<components["schemas"]["Home"]>("/v1/home");
  return result.ok ? { ok: true, data: toHomeView(result.data) } : result;
});
