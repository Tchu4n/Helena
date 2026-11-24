"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ADDRESS_FIELDS, addressInput } from "@/src/features/checkout";
import { apiPost, apiPut } from "@/src/lib/api";
import { bearer, clearSession, readSession } from "@/src/lib/session-cookie";
import { ADDRESS_LIMIT, ADDRESS_NOT_FOUND, type AddressFormState } from "../types.ts";

// CTA-05: "Salvar endereço" adds one (no id) or edits hers (hidden id), with the CHK-03 messages.
export async function saveAddress(_prev: AddressFormState, formData: FormData): Promise<AddressFormState> {
  // Authorization: only the account of her own session.
  const session = await readSession();
  if (!session?.detailsComplete) redirect("/conta");
  const rawId = formData.get("id");
  // The id goes into the API path: only a uuid, so a tampered one can't reach another path (CTA-11).
  const id = rawId ? z.uuid().safeParse(rawId) : null;
  if (id && !id.success) return { errors: {}, error: ADDRESS_NOT_FOUND, saved: false };
  const parsed = addressInput.safeParse(Object.fromEntries(ADDRESS_FIELDS.map((field) => [field, formData.get(field) ?? ""])));
  if (!parsed.success) {
    const errors: AddressFormState["errors"] = {};
    for (const issue of parsed.error.issues) errors[issue.path[0] as keyof typeof errors] ??= issue.message;
    return { errors, error: null, saved: false };
  }
  const result = id
    ? await apiPut(`/v1/account/addresses/${id.data}`, parsed.data, bearer(session))
    : await apiPost("/v1/account/addresses", parsed.data, bearer(session));
  if (!result.ok) {
    if (result.problem.status === 401) {
      await clearSession();
      redirect("/conta");
    }
    const error = result.problem.code === "address_limit" ? ADDRESS_LIMIT : result.problem.status === 404 ? ADDRESS_NOT_FOUND : result.problem.title;
    return { errors: {}, error, saved: false };
  }
  refresh(); // the page reads the addresses without cache
  return { errors: {}, error: null, saved: true };
}
