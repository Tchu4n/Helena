"use server";

import { redirect } from "next/navigation";
import { readCartId } from "@/src/features/cart";
import { apiPost } from "@/src/lib/api";
import type { components } from "@/src/lib/api-types";
import { forwardedFor } from "@/src/lib/request-ip";
import { clearSession, saveSession } from "@/src/lib/session-cookie";
import { clearIdentification } from "../identification-cookie.ts";
import { nextPath } from "../next-path.ts";
import { emailInput } from "../schemas/identification.ts";
import type { IdentificationState } from "../types.ts";

const WRONG = "E-mail ou senha não conferem";

// IDT-10, IDT-14, CTA-01. No authorization to check: anyone may try; the API limits attempts (429) and answers
// one 401 for any mismatch. The e-mail she typed comes back as typed; the password never does.
export async function signInWithPassword(prev: IdentificationState, formData: FormData): Promise<IdentificationState> {
  await clearSession(); // a new identification ends any old session
  const typed = String(formData.get("email") ?? "").slice(0, 200);
  const password = String(formData.get("password") ?? "");
  const base: IdentificationState = { ...prev, step: "signin", email: typed, errors: {}, error: null, notice: null };
  const email = emailInput.safeParse(typed);
  if (!email.success) return { ...base, errors: { email: email.error.issues[0]?.message } };
  if (!password) return { ...base, errors: { password: "Campo obrigatório" } };
  if (password.length > 72) return { ...base, error: WRONG };

  // The bag's e-mail is confirmed in the same call, when there is a bag.
  const cartId = await readCartId();
  const session = await apiPost<components["schemas"]["Session"]>(
    "/v1/sessions",
    { email: email.data, password, ...(cartId ? { cartId } : {}) },
    await forwardedFor(),
  );
  if (!session.ok) return { ...base, error: session.problem.status === 401 ? WRONG : session.problem.title };
  const detailsComplete = session.data.detailsComplete ?? false;
  await saveSession({ token: session.data.token, email: email.data, detailsComplete, expiresAt: session.data.expiresAt });
  await clearIdentification();
  if (!detailsComplete) return { ...base, step: "details", email: email.data };
  // CTA-09: this sign-in cancelled a pending deletion; the next screen says so once.
  redirect(session.data.deletionCancelled ? `${nextPath(formData)}?exclusao=cancelada` : nextPath(formData));
}
