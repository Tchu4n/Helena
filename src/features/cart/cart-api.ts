import "server-only";
import { apiPut, type ApiResult } from "@/src/lib/api";
import type { components } from "@/src/lib/api-types";
import { createCart, ensureCart } from "./cart-session.ts";

type Cart = components["schemas"]["Cart"];

// PRO-08, SAC-08: saves the CEP in the visitor's own cart (cookie). While nothing is chosen,
// the cheapest option is chosen right away (owner, 2026-11-19). Only callable from a Server Action.
export async function saveCep(cep: string): Promise<ApiResult<Cart> | null> {
  let cartId = await ensureCart();
  if (!cartId) return null;
  let result = await apiPut<Cart>(`/v1/carts/${cartId}/cep`, { cep });
  if (!result.ok && result.problem.status === 404) {
    cartId = await createCart();
    if (!cartId) return result;
    result = await apiPut<Cart>(`/v1/carts/${cartId}/cep`, { cep });
  }
  if (!result.ok || result.data.chosenDelivery || !result.data.deliveryOptions?.length) return result;

  const cheapest = result.data.deliveryOptions.reduce((a, b) => (b.price < a.price ? b : a));
  const chosen = await apiPut<Cart>(`/v1/carts/${cartId}/delivery`, { type: cheapest.type });
  // The CEP is saved either way; failing to choose only leaves the choice to her.
  return chosen.ok ? chosen : result;
}
