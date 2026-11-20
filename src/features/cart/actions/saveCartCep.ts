"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { saveCep } from "../cart-api.ts";
import { readCartId } from "../cart-session.ts";
import { normalizeCep } from "../cep.ts";
import type { ShippingState } from "../types.ts";

const input = z.object({ cep: z.string().max(20) });
const FAILED = "Não foi possível concluir. Tente de novo";

// SAC-08 with the rules of PRO-09 to PRO-11. The typed CEP always goes back in the state (GER-06).
export async function saveCartCep(_prev: ShippingState, formData: FormData): Promise<ShippingState> {
  // Authorization: only the visitor's own cart (cookie); there is no bag page without one.
  const cartId = await readCartId();
  const typed = typeof formData.get("cep") === "string" ? String(formData.get("cep")).slice(0, 20) : "";
  const parsed = input.safeParse({ cep: formData.get("cep") });
  if (!cartId || !parsed.success) return { status: "failed", cep: typed, message: FAILED, shipping: null };

  const cep = normalizeCep(parsed.data.cep);
  if (!cep) return { status: "invalid", cep: typed, message: "Digite um CEP com 8 números", shipping: null };

  const result = await saveCep(cep);
  if (!result?.ok) return { status: "failed", cep: typed, message: result?.problem.title ?? FAILED, shipping: null };
  refresh();
  return { status: "ok", cep: typed, message: null, shipping: null };
}
