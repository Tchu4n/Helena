"use server";

import { redirect } from "next/navigation";
import { apiPut } from "@/src/lib/api";
import { bearer, clearSession, readSession } from "@/src/lib/session-cookie";
import { clearIdentification } from "../identification-cookie.ts";
import { passwordInput } from "../schemas/identification.ts";
import { nextPath } from "../next-path.ts";
import { START, type IdentificationState } from "../types.ts";

// IDT-08, CTA-07: the password of an account the code has just created. Never kept in the state.
export async function createPassword(prev: IdentificationState, formData: FormData): Promise<IdentificationState> {
  // Authorization: only the account of her own session.
  const session = await readSession();
  if (!session) return START;
  const base: IdentificationState = { ...prev, step: "password", errors: {}, error: null, notice: null };
  const password = passwordInput.safeParse(String(formData.get("password") ?? "").slice(0, 200));
  if (!password.success) return { ...base, errors: { password: password.error.issues[0]?.message } };

  const result = await apiPut("/v1/account/password", { password: password.data }, bearer(session));
  if (!result.ok) {
    if (result.problem.status === 401) {
      await clearSession();
      return START;
    }
    return { ...base, error: result.problem.title };
  }
  await clearIdentification();
  redirect(nextPath(formData));
}
