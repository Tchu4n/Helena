"use server";

import { redirect } from "next/navigation";
import { readCartId } from "@/src/features/cart";
import { apiPost } from "@/src/lib/api";
import type { components } from "@/src/lib/api-types";
import { saveSession } from "@/src/lib/session-cookie";
import { clearIdentification, readIdentification, saveIdentification } from "../identification-cookie.ts";
import { codeInput } from "../schemas/identification.ts";
import { nextPath } from "../next-path.ts";
import { EXISTING_ACCOUNT, START, type IdentificationState } from "../types.ts";

// IDT-03, IDT-04, IDT-08, IDT-09, CTA-01. The e-mail and the way come only from her own httpOnly cookie, never from the form.
export async function confirmCode(prev: IdentificationState, formData: FormData): Promise<IdentificationState> {
  const pending = await readIdentification();
  if (!pending) return START; // the 10 minutes ran out: start again
  const base: IdentificationState = { ...prev, step: "code", email: pending.email, way: pending.way, sentAt: pending.sentAt, errors: {}, error: null, notice: null };
  const code = codeInput.safeParse(String(formData.get("code") ?? "").slice(0, 20));
  if (!code.success) return { ...base, errors: { code: code.error.issues[0]?.message } };

  // CTA-01: at /conta the code only signs in; the bag is left alone and no step follows.
  const atAccount = nextPath(formData) === "/conta";
  // Authorization: only her own bag, from the httpOnly cart cookie.
  const cartId = atAccount ? null : await readCartId();

  // IDT-08, IDT-09: the code starts a session (the account is created if missing) and confirms the bag's e-mail.
  if (pending.way === "account") {
    const session = await apiPost<components["schemas"]["Session"]>("/v1/sessions", {
      email: pending.email,
      code: code.data,
      ...(cartId ? { cartId } : {}),
    });
    if (!session.ok) {
      if (session.problem.status === 401) return { ...base, errors: { code: "Código inválido ou vencido" } };
      return { ...base, error: session.problem.title };
    }
    await saveSession({ token: session.data.token, email: pending.email }, session.data.expiresAt);
    if (atAccount) {
      await clearIdentification();
      redirect("/conta");
    }
    const done = session.data.newAccount ? "password" : "existing";
    await saveIdentification({ ...pending, done });
    return { ...base, step: done, sentAt: null, notice: done === "existing" ? EXISTING_ACCOUNT : null };
  }

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
