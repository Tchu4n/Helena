"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { apiPut } from "@/src/lib/api";
import { bearer, clearSession, readSession } from "@/src/lib/session-cookie";
import { passwordInput } from "../schemas/identification.ts";
import type { PasswordState } from "../types.ts";

// CTA-07: "Criar senha" or "Trocar senha". The password is never kept in the state.
export async function setPassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  // Authorization: only the account of her own session.
  const session = await readSession();
  if (!session?.detailsComplete) redirect("/conta");
  const password = passwordInput.safeParse(String(formData.get("password") ?? "").slice(0, 200));
  if (!password.success) return { errors: { password: password.error.issues[0]?.message }, error: null, notice: null };
  const result = await apiPut("/v1/account/password", { password: password.data }, bearer(session));
  if (!result.ok) {
    if (result.problem.status === 401) {
      await clearSession();
      redirect("/conta");
    }
    return { errors: {}, error: result.problem.title, notice: null };
  }
  refresh(); // "Criar senha" becomes "Trocar senha"
  return { errors: {}, error: null, notice: "Senha salva" };
}
