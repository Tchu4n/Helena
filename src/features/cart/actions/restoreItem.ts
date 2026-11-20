"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { apiPost } from "@/src/lib/api";
import { readCartId } from "../cart-session.ts";
import type { RemoveState } from "../types.ts";

const input = z.object({ productSizeId: z.uuid(), quantity: z.coerce.number().int().min(1).max(99) });

// SAC-05: "Desfazer" adds the same size and quantity again, as the contract says. The API checks the stock.
export async function restoreItem(_prev: RemoveState, formData: FormData): Promise<RemoveState> {
  const cartId = await readCartId();
  const parsed = input.safeParse({ productSizeId: formData.get("productSizeId"), quantity: formData.get("quantity") });
  const failed = (title: string): RemoveState => ({
    status: "error",
    removed: null,
    message: `Não foi possível desfazer: ${title}`,
    at: Date.now(),
  });
  if (!cartId || !parsed.success) return failed("Tente de novo");

  const result = await apiPost(`/v1/carts/${cartId}/items`, parsed.data);
  if (!result.ok) return failed(result.problem.title);
  refresh();
  return { status: "idle", removed: null, message: null, at: Date.now() };
}
