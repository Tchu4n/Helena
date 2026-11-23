"use server";

import { redirect } from "next/navigation";
import { apiDelete } from "@/src/lib/api";
import { bearer, clearSession, readSession } from "@/src/lib/session-cookie";

// CTA-10: the session ends on the API and here. Whatever the API answers, she is signed out on this device.
export async function signOut(): Promise<void> {
  // Authorization: only her own session, from the httpOnly cookie.
  const session = await readSession();
  if (session) await apiDelete("/v1/sessions/current", bearer(session));
  await clearSession();
  redirect("/conta");
}
