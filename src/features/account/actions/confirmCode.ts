"use server";

import { redirect } from "next/navigation";
import { readCartId } from "@/src/features/cart";
import { apiPost } from "@/src/lib/api";
import { clearIdentification, readIdentification } from "../identification-cookie.ts";
import { codeInput } from "../schemas/identification.ts";
import { START, type IdentificationState } from "../types.ts";

const FAILED = "Não foi possível concluir. Tente de novo";

// IDT-03, IDT-04. The e-mail and the way come only from her own httpOnly cookie, never from the form.
export async function confirmCode(prev: IdentificationState, formData: FormData): Promise<IdentificationState> {
  const pending = await readIdentification();
  if (!pending) return START; // the 10 minutes ran out: start again
  const base: IdentificationState = { ...prev, step: "code", email: pending.email, way: pending.way, sentAt: pending.sentAt, errors: {}, error: null, notice: null };
  const code = codeInput.safeParse(String(formData.get("code") ?? "").slice(0, 20));
  if (!code.success) return { ...base, errors: { code: code.error.issues[0]?.message } };

  // shortcut: the account way (session and password) arrives with Task 3 of the account plan 1.
  if (pending.way === "account") return { ...base, error: FAILED };

  // Authorization: only her own bag, from the httpOnly cart cookie.
  const cartId = await readCartId();
  if (!cartId) redirect("/sacola");
  const result = await apiPost(`/v1/carts/${cartId}/email-verification`, { email: pending.email, code: code.data });
  if (!result.ok) {
    if (result.problem.status === 404) redirect("/sacola");
    if (result.problem.status === 401) return { ...base, errors: { code: "Código inválido ou vencido" } };
    return { ...base, error: result.problem.title };
  }
  await clearIdentification();
  redirect("/checkout");
}
