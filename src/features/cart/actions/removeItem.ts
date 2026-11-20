"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { apiDelete, apiGet } from "@/src/lib/api";
import type { components } from "@/src/lib/api-types";
import { readCartId } from "../cart-session.ts";
import type { RemoveState } from "../types.ts";

const input = z.object({ itemId: z.uuid() });
const failed = (message: string, itemId: string | null = null): RemoveState => ({
  status: "error",
  itemId,
  removed: null,
  message,
  at: Date.now(),
});

// SAC-05. What "Desfazer" puts back is read from the API, never from the form.
export async function removeItem(prev: RemoveState, formData: FormData): Promise<RemoveState> {
  const cartId = await readCartId();
  const parsed = input.safeParse({ itemId: formData.get("itemId") });
  if (!cartId || !parsed.success) return failed("Não foi possível concluir. Tente de novo");

  const cart = await apiGet<components["schemas"]["Cart"]>(`/v1/carts/${cartId}`);
  if (!cart.ok) return failed(cart.problem.title, parsed.data.itemId);
  const item = cart.data.items.find((i) => i.id === parsed.data.itemId);
  // Already gone (a second tap, or removed in another tab): show the bag as it is and keep the last notice.
  if (!item) {
    refresh();
    return prev;
  }

  const result = await apiDelete(`/v1/carts/${cartId}/items/${item.id}`);
  if (!result.ok) return failed(result.problem.title, item.id);
  refresh();
  return {
    status: "removed",
    itemId: item.id,
    removed: { productSizeId: item.productSizeId, quantity: item.quantity, name: item.name },
    message: null,
    at: Date.now(),
  };
}
