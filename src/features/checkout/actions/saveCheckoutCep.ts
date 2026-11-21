"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { normalizeCep, readCartId, saveCep } from "@/src/features/cart";

const FAILED = "Não foi possível concluir. Tente de novo";

// CHK-09, CHK-10: the CEP typed at checkout goes into her cart, which recalculates the options (cheapest chosen at first).
export async function saveCheckoutCep(cep: string): Promise<{ ok: boolean; message: string | null }> {
  // Authorization: only her own cart, from the httpOnly cookie; checkout never creates one.
  if (!(await readCartId())) return { ok: false, message: FAILED };
  const parsed = z.string().max(20).safeParse(cep);
  const normalized = parsed.success ? normalizeCep(parsed.data) : null;
  if (!normalized) return { ok: false, message: "Digite um CEP com 8 números" };

  const result = await saveCep(normalized);
  if (!result?.ok) return { ok: false, message: result?.problem.title ?? FAILED };
  refresh();
  return { ok: true, message: null };
}
