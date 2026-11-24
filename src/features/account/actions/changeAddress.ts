import "server-only";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { apiDelete, apiPut } from "@/src/lib/api";
import { bearer, clearSession, readSession } from "@/src/lib/session-cookie";
import { ADDRESS_NOT_FOUND, type AddressNotice } from "../types.ts";

// CTA-05, CTA-11: the shared steps of "Remover" and "Tornar favorito" on one of her addresses.
export async function changeAddress(formData: FormData, how: "remove" | "favorite", notice: string): Promise<AddressNotice> {
  // Authorization: only the account of her own session; the API answers 404 for another account's address.
  const session = await readSession();
  if (!session?.detailsComplete) redirect("/conta");
  // The id goes into the API path: only a uuid.
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { notice: null, error: ADDRESS_NOT_FOUND };
  const path = `/v1/account/addresses/${id.data}`;
  const result = how === "remove" ? await apiDelete(path, bearer(session)) : await apiPut(`${path}/favorite`, undefined, bearer(session));
  if (!result.ok) {
    if (result.problem.status === 401) {
      await clearSession();
      redirect("/conta");
    }
    return { notice: null, error: result.problem.status === 404 ? ADDRESS_NOT_FOUND : result.problem.title };
  }
  refresh(); // the page reads the addresses without cache
  return { notice, error: null };
}
