"use server";

import { z } from "zod";
import { apiPost, apiPut } from "@/src/lib/api";
import type { components } from "@/src/lib/api-types";
import { createCart, ensureCart } from "../cart-session.ts";
import { normalizeCep } from "../cep.ts";
import type { ShippingState } from "../types.ts";
import { toShippingView } from "../views.ts";

const input = z.object({ cep: z.string().max(20), productId: z.uuid() });

// PRO-08 to PRO-11. The quote is public data; the CEP is only saved in the visitor's own cart (cookie).
// The typed CEP always goes back in the state, so an error never clears the field (GER-06).
export async function quoteShipping(_prev: ShippingState, formData: FormData): Promise<ShippingState> {
  const parsed = input.safeParse(Object.fromEntries(formData));
  const typed = typeof formData.get("cep") === "string" ? String(formData.get("cep")).slice(0, 20) : "";
  if (!parsed.success) return { status: "failed", cep: typed, message: "Não foi possível concluir. Tente de novo", shipping: null };

  const cep = normalizeCep(parsed.data.cep);
  if (!cep) return { status: "invalid", cep: typed, message: "Digite um CEP com 8 números", shipping: null };

  const result = await apiPost<components["schemas"]["ShippingQuote"]>("/v1/shipping/quotes", {
    cep,
    productId: parsed.data.productId,
  });
  if (!result.ok) return { status: "failed", cep: typed, message: result.problem.title, shipping: null };

  await saveCep(cep);
  return { status: "ok", cep: typed, message: null, shipping: toShippingView(result.data) };
}

// PRO-08: the CEP is kept in the cart for the cart page and checkout. A failure here never hides the quote.
async function saveCep(cep: string) {
  const cartId = await ensureCart();
  if (!cartId) return;
  const saved = await apiPut(`/v1/carts/${cartId}/cep`, { cep });
  if (!saved.ok && saved.problem.status === 404) {
    const newId = await createCart();
    if (newId) await apiPut(`/v1/carts/${newId}/cep`, { cep });
  }
}
