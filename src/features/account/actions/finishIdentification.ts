"use server";

import { redirect } from "next/navigation";
import { clearIdentification } from "../identification-cookie.ts";
import { nextPath } from "../next-path.ts";

// IDT-09 "Continuar": she is already signed in; only the finished identification is dropped. No authorization
// to check: it touches nothing but her own cookie, and the next page checks the session itself.
export async function finishIdentification(formData: FormData): Promise<void> {
  await clearIdentification();
  redirect(nextPath(formData));
}
