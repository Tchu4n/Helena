import "server-only";
import { cache } from "react";
import { apiGet } from "@/src/lib/api";
import type { components } from "@/src/lib/api-types";
import { readCartId } from "../cart-session.ts";
import { toCartView, type CartView } from "../views.ts";

type Cart = components["schemas"]["Cart"];

// The bag is read without cache (decision of 2026-11-19, option A); `cache` only shares one answer per request.
const fetchCart = cache(async () => {
  const cartId = await readCartId();
  if (!cartId) return null;
  return apiGet<Cart>(`/v1/carts/${cartId}`);
});

// Wrapped in cache: the header, the tabs and the CEP field read the same answer in one request.
export const getCartSummary = cache(async (): Promise<{ pieceCount: number; cep: string | null } | null> => {
  const result = await fetchCart();
  return result?.ok ? { pieceCount: result.data.pieceCount, cep: result.data.cep ?? null } : null;
});

// SAC-02, SAC-03: no cookie, or a cart the API no longer knows (404), is just an empty bag.
export async function getCart(): Promise<{ ok: true; cart: CartView | null } | { ok: false; title: string }> {
  const result = await fetchCart();
  if (!result) return { ok: true, cart: null };
  if (result.ok) return { ok: true, cart: toCartView(result.data) };
  return result.problem.status === 404 ? { ok: true, cart: null } : { ok: false, title: result.problem.title };
}
