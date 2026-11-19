import "server-only";
import { cache } from "react";
import { apiGet } from "@/src/lib/api";
import type { components } from "@/src/lib/api-types";
import { readCartId } from "../cart-session.ts";

// Wrapped in cache: the header, the tabs and the CEP field read the same answer in one request.
export const getCartSummary = cache(async (): Promise<{ pieceCount: number; cep: string | null } | null> => {
  const cartId = await readCartId();
  if (!cartId) return null;
  const result = await apiGet<components["schemas"]["Cart"]>(`/v1/carts/${cartId}`);
  return result.ok ? { pieceCount: result.data.pieceCount, cep: result.data.cep ?? null } : null;
});
