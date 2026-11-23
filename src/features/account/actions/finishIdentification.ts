"use server";

import { redirect } from "next/navigation";
import { readSession } from "@/src/lib/session-cookie";
import { clearIdentification } from "../identification-cookie.ts";
import { nextPath } from "../next-path.ts";
import type { IdentificationState } from "../types.ts";

// IDT-09 "Continuar": she is already signed in; only the finished identification is dropped, then "Seus dados"
// if the account lacks them (IDT-14). No authorization to check: it touches nothing but her own cookie, and the
// next page and "Seus dados" check the session themselves.
export async function finishIdentification(prev: IdentificationState, formData: FormData): Promise<IdentificationState> {
  await clearIdentification();
  const session = await readSession();
  if (session && !session.detailsComplete) return { ...prev, step: "details", notice: null, errors: {}, error: null };
  redirect(nextPath(formData));
}
