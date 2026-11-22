"use server";

import { refresh } from "next/cache";
import { clearOrderAccess } from "@/src/lib/order-cookie";
import { z } from "zod";
import { apiPut } from "@/src/lib/api";
import { readCartId } from "../cart-session.ts";

const input = z.object({ type: z.enum(["courier", "pac", "sedex"]) });

// SAC-08, CHK-09: the option is chosen on the bag page; the API answers 422 when it doesn't serve the CEP.
export async function chooseDelivery(_prev: { message: string | null }, formData: FormData): Promise<{ message: string | null }> {
  const cartId = await readCartId();
  const parsed = input.safeParse({ type: formData.get("type") });
  if (!cartId || !parsed.success) return { message: "Não foi possível concluir. Tente de novo" };

  const result = await apiPut(`/v1/carts/${cartId}/delivery`, parsed.data);
  if (!result.ok) return { message: result.problem.title };
  await clearOrderAccess(); // any bag change ends the payment in progress (SAC-17)
  refresh();
  return { message: null };
}
