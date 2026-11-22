"use server";

import { refresh } from "next/cache";
import { clearOrderAccess } from "@/src/lib/order-cookie";
import { z } from "zod";
import { apiGet, apiPost, type ApiResult } from "@/src/lib/api";
import type { components } from "@/src/lib/api-types";
import { createCart, readCartId } from "../cart-session.ts";
import type { AddToCartState } from "../types.ts";
import { toCartPanelView } from "../views.ts";

const input = z.object({ productSizeId: z.uuid() });

function addItem(cartId: string, productSizeId: string): Promise<ApiResult<components["schemas"]["Cart"]>> {
  return apiPost(`/v1/carts/${cartId}/items`, { productSizeId, quantity: 1 });
}

// Only a 404 means the cart is gone; a slow or failing API must never cost her the pieces (PRO-07).
async function cartIsGone(cartId: string): Promise<boolean> {
  const cart = await apiGet(`/v1/carts/${cartId}`);
  return !cart.ok && cart.problem.status === 404;
}

// PRO-05, PRO-07.
export async function addToCart(_prev: AddToCartState, formData: FormData): Promise<AddToCartState> {
  // Authorization: the cart is the one in the visitor's own httpOnly cookie, never one sent by the form.
  let cartId = await readCartId();

  const parsed = input.safeParse({ productSizeId: formData.get("productSizeId") });
  if (!parsed.success) return { status: "error", message: "Escolha um tamanho", focusSizes: true, panel: null, at: Date.now() };

  const failed: AddToCartState = {
    status: "error",
    message: "Não foi possível concluir. Tente de novo",
    focusSizes: false,
    panel: null,
    at: Date.now(),
  };
  cartId ??= await createCart();
  if (!cartId) return failed;
  let result = await addItem(cartId, parsed.data.productSizeId);
  // A cookie pointing to a cart the API no longer knows: start a new cart once.
  // An unknown size also answers 404, so the cart is checked first; otherwise its pieces would be lost.
  if (!result.ok && result.problem.status === 404 && (await cartIsGone(cartId))) {
    cartId = await createCart();
    if (!cartId) return failed;
    result = await addItem(cartId, parsed.data.productSizeId);
  }
  if (!result.ok) return { status: "error", message: result.problem.title, focusSizes: false, panel: null, at: Date.now() };

  await clearOrderAccess(); // any bag change ends the payment in progress (SAC-17)
  refresh();
  return {
    status: "added",
    message: "Peça adicionada à sacola",
    focusSizes: false,
    panel: toCartPanelView(result.data, parsed.data.productSizeId),
    at: Date.now(),
  };
}
