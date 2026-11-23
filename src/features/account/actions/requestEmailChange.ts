"use server";

import { redirect } from "next/navigation";
import { apiPost } from "@/src/lib/api";
import { forwardedFor } from "@/src/lib/request-ip";
import { readSession } from "@/src/lib/session-cookie";
import { saveIdentification } from "../identification-cookie.ts";
import { emailInput } from "../schemas/identification.ts";
import type { EmailChangeState } from "../types.ts";

// CTA-06 "Receber código": a code goes to the new e-mail; the e-mail waits in her own httpOnly cookie,
// never in the form, so the confirmation can't be pointed at another address.
export async function requestEmailChange(_prev: EmailChangeState, formData: FormData): Promise<EmailChangeState> {
  // Authorization: only the account of her own session.
  const session = await readSession();
  if (!session?.detailsComplete) redirect("/conta");
  const typed = String(formData.get("email") ?? "").slice(0, 200);
  const email = emailInput.safeParse(typed);
  if (!email.success) return { step: "email", email: typed, errors: { email: email.error.issues[0]?.message }, error: null, notice: null };
  // The API limits codes by e-mail and IP (429), so her IP goes with the call.
  const result = await apiPost("/v1/email-codes", { email: email.data }, await forwardedFor());
  if (!result.ok) return { step: "email", email: typed, errors: {}, error: result.problem.title, notice: null };
  await saveIdentification({ email: email.data, way: "account", sentAt: Date.now() });
  return { step: "code", email: email.data, errors: {}, error: null, notice: null };
}
