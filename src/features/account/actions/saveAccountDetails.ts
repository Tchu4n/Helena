"use server";

import { redirect } from "next/navigation";
import { CONTACT_FIELDS, contactInput } from "@/src/features/checkout";
import { apiPut } from "@/src/lib/api";
import { bearer, clearSession, readSession, saveSession } from "@/src/lib/session-cookie";
import { clearIdentification } from "../identification-cookie.ts";
import { nextPath } from "../next-path.ts";
import { CPF_IN_USE, START, type IdentificationState } from "../types.ts";

// IDT-14: the account's name, CPF and phone, once, before Dados e entrega or the account's sections.
export async function saveAccountDetails(prev: IdentificationState, formData: FormData): Promise<IdentificationState> {
  // Authorization: only the account of her own session.
  const session = await readSession();
  if (!session) return START;
  const base: IdentificationState = { ...prev, step: "details", email: session.email, errors: {}, error: null, notice: null };
  const parsed = contactInput.safeParse(Object.fromEntries(CONTACT_FIELDS.map((f) => [f, formData.get(f)])));
  if (!parsed.success) {
    const errors: IdentificationState["errors"] = {};
    for (const field of CONTACT_FIELDS) errors[field] = parsed.error.issues.find((i) => i.path[0] === field)?.message;
    return { ...base, errors };
  }

  const result = await apiPut("/v1/account/details", parsed.data, bearer(session));
  // Review focus 2: details saved meanwhile (another tab) count as done.
  if (!result.ok && result.problem.code !== "details_already_set") {
    if (result.problem.status === 401) {
      await clearSession();
      return START;
    }
    if (result.problem.code === "cpf_in_use") return { ...base, errors: { cpf: CPF_IN_USE } };
    return { ...base, error: result.problem.title };
  }
  await saveSession({ ...session, detailsComplete: true });
  await clearIdentification();
  redirect(nextPath(formData));
}
