"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { apiPatch } from "@/src/lib/api";
import { readCartId } from "../cart-session.ts";
import type { ItemActionState } from "../types.ts";

const input = z.object({ itemId: z.uuid(), quantity: z.coerce.number().int().min(1).max(99) });
const FAILED = "Não foi possível concluir. Tente de novo";

// SAC-04. The API keeps the limit (maxQuantity); a 409 means the stock dropped while the bag was open.
export async function updateQuantity(_prev: ItemActionState, formData: FormData): Promise<ItemActionState> {
  // Authorization: the cart is the one in the visitor's own httpOnly cookie; the item id only goes inside its path.
  const cartId = await readCartId();
  const parsed = input.safeParse({ itemId: formData.get("itemId"), quantity: formData.get("quantity") });
  if (!cartId || !parsed.success) return { itemId: null, message: FAILED };

  const { itemId, quantity } = parsed.data;
  const result = await apiPatch(`/v1/carts/${cartId}/items/${itemId}`, { quantity });
  if (!result.ok) {
    // The new limit must show, so the page is read again (review focus 1).
    if (result.problem.status === 409) refresh();
    return { itemId, message: result.problem.title };
  }
  refresh();
  return { itemId, message: null };
}
