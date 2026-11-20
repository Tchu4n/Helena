"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { apiDelete, apiGet } from "@/src/lib/api";
import type { components } from "@/src/lib/api-types";
import { readCartId } from "../cart-session.ts";
import type { RemoveState } from "../types.ts";

const input = z.object({ itemId: z.uuid() });
const failed = (message: string): RemoveState => ({ status: "error", removed: null, message, at: Date.now() });

// SAC-05. What "Desfazer" puts back is read from the API, never from the form.
export async function removeItem(_prev: RemoveState, formData: FormData): Promise<RemoveState> {
  const cartId = await readCartId();
  const parsed = input.safeParse({ itemId: formData.get("itemId") });
  if (!cartId || !parsed.success) return failed("Não foi possível concluir. Tente de novo");

  const cart = await apiGet<components["schemas"]["Cart"]>(`/v1/carts/${cartId}`);
  if (!cart.ok) return failed(cart.problem.title);
  const item = cart.data.items.find((i) => i.id === parsed.data.itemId);
  if (!item) return failed("Não foi possível concluir. Tente de novo");

  const result = await apiDelete(`/v1/carts/${cartId}/items/${item.id}`);
  if (!result.ok) return failed(result.problem.title);
  refresh();
  return {
    status: "removed",
    removed: { productSizeId: item.productSizeId, quantity: item.quantity, name: item.name },
    message: null,
    at: Date.now(),
  };
}
