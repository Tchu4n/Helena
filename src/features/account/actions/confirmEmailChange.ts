"use server";

import { redirect } from "next/navigation";
import { apiPatch } from "@/src/lib/api";
import { bearer, clearSession, readSession, saveSession } from "@/src/lib/session-cookie";
import { clearIdentification, readIdentification } from "../identification-cookie.ts";
import { codeInput } from "../schemas/identification.ts";
import type { EmailChangeState } from "../types.ts";

const CLOSED: EmailChangeState = { step: "closed", email: "", errors: {}, error: null, notice: null };

// CTA-06, Review focus 5: the new e-mail takes effect only with its code; one that has another account changes nothing.
export async function confirmEmailChange(prev: EmailChangeState, formData: FormData): Promise<EmailChangeState> {
  // Authorization: only the account of her own session; the new e-mail comes from her own cookie.
  const session = await readSession();
  if (!session?.detailsComplete) redirect("/conta");
  const pending = await readIdentification();
  if (!pending) return { ...CLOSED, step: "email", error: "Código inválido ou vencido" }; // the 10 minutes ran out: ask again
  const base: EmailChangeState = { ...prev, step: "code", email: pending.email, errors: {}, error: null, notice: null };
  const code = codeInput.safeParse(String(formData.get("code") ?? "").slice(0, 20));
  if (!code.success) return { ...base, errors: { code: code.error.issues[0]?.message } };

  const result = await apiPatch("/v1/account", { email: pending.email, code: code.data }, bearer(session));
  if (!result.ok) {
    if (result.problem.code === "invalid_code") return { ...base, errors: { code: "Código inválido ou vencido" } };
    if (result.problem.status === 401) {
      await clearSession();
      redirect("/conta");
    }
    if (result.problem.code === "email_in_use") {
      await clearIdentification();
      return { ...base, step: "email", error: "Este e-mail já está em outra conta" };
    }
    return { ...base, error: result.problem.title };
  }
  await saveSession({ ...session, email: pending.email });
  await clearIdentification();
  return { ...CLOSED, notice: "E-mail trocado" };
}
