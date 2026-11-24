"use server";

import { redirect } from "next/navigation";
import { apiPost } from "@/src/lib/api";
import { bearer, clearSession, readSession } from "@/src/lib/session-cookie";
import type { PrivacyNotice } from "../types.ts";

// CTA-09: a request for the team; the type is fixed by the action, never read from the form.
async function send(type: "copy" | "deletion"): Promise<{ email: string } | PrivacyNotice> {
  // Authorization: only the account of her own session.
  const session = await readSession();
  if (!session?.detailsComplete) redirect("/conta");
  const result = await apiPost("/v1/account/data-requests", { type }, bearer(session));
  if (!result.ok) {
    if (result.problem.status === 401) {
      await clearSession();
      redirect("/conta");
    }
    return { notice: null, error: result.problem.title };
  }
  return { email: session.email };
}

// CTA-09: the copy goes only to the account's e-mail; she stays signed in.
export async function requestCopy(): Promise<PrivacyNotice> {
  const sent = await send("copy");
  if (!("email" in sent)) return sent;
  return { notice: `Pedido registrado. Enviaremos a cópia para ${sent.email} em até 15 dias.`, error: null };
}

// CTA-09: the API ends every session of the account; this device's cookie goes too.
export async function requestDeletion(): Promise<PrivacyNotice> {
  const sent = await send("deletion");
  if (!("email" in sent)) return sent;
  await clearSession();
  redirect("/conta?exclusao=pedida");
}
