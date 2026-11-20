"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { apiPatch } from "@/src/lib/api";
import { readCartId } from "../cart-session.ts";
import type { ItemActionState } from "../types.ts";

const input = z.object({ itemId: z.uuid(), quantity: z.coerce.number().int().min(1).max(99) });
const FAILED = "Não foi possível concluir. Tente de novo";

// SAC-04. The API keeps the limit (maxQuantity); a 409 means the stock dropped while the bag was open.
export async function updateQuantity(prev: ItemActionState, formData: FormData): Promise<ItemActionState> {
  // Authorization: the cart is the one in the visitor's own httpOnly cookie; the item id only goes inside its path.
  const cartId = await readCartId();
  // A −/+ at its limit sends no quantity (tapped before the script loaded): nothing changes, not even the
  // message already on the card.
  if (cartId && formData.get("quantity") === null) return prev;
  const parsed = input.safeParse({ itemId: formData.get("itemId"), quantity: formData.get("quantity") });
  if (!cartId || !parsed.success) return { itemId: null, message: FAILED };

  const { itemId, quantity } = parsed.data;
  const result = await apiPatch(`/v1/carts/${cartId}/items/${itemId}`, { quantity });
  if (!result.ok) {
    // The new limit must show (409, review focus 1), or the item is gone, removed in another tab (404):
    // the page is read again either way.
    if (result.problem.status === 409 || result.problem.status === 404) refresh();
    return { itemId, message: result.problem.title };
  }
  refresh();
  return { itemId, message: null };
}
