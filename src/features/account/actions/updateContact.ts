"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { nameAndPhoneInput } from "@/src/features/checkout";
import { apiPatch } from "@/src/lib/api";
import { bearer, clearSession, readSession } from "@/src/lib/session-cookie";
import type { ContactState } from "../types.ts";

// CTA-06: "Salvar" fixes name and phone, with the CHK-03 messages.
export async function updateContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
  // Authorization: only the account of her own session.
  const session = await readSession();
  if (!session?.detailsComplete) redirect("/conta");
  const parsed = nameAndPhoneInput.safeParse({ name: formData.get("name"), phone: formData.get("phone") });
  if (!parsed.success) {
    const issue = (field: string) => parsed.error.issues.find((i) => i.path[0] === field)?.message;
    return { errors: { name: issue("name"), phone: issue("phone") }, error: null, notice: null };
  }
  const result = await apiPatch("/v1/account", parsed.data, bearer(session));
  if (!result.ok) {
    if (result.problem.status === 401) {
      await clearSession();
      redirect("/conta");
    }
    return { errors: {}, error: result.problem.title, notice: null };
  }
  refresh(); // the page reads the account without cache
  return { errors: {}, error: null, notice: "Dados salvos" };
}
