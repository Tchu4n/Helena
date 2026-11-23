"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { apiPost } from "@/src/lib/api";
import type { components } from "@/src/lib/api-types";
import { saveTrackingAccess } from "@/src/lib/order-cookie";
import { forwardedFor } from "@/src/lib/request-ip";

export type LookupState = {
  errors: { number?: string; email?: string };
  error: string | null;
  values: { number: string; email: string }; // what she typed comes back, so an error never clears a field
};

const REQUIRED = "Campo obrigatório";
const BAD_EMAIL = "Digite um e-mail válido";
const NumberField = z
  .string()
  .trim()
  .toUpperCase()
  .min(1, REQUIRED)
  .regex(/^HL-\d{1,12}$/, "Confira o número do pedido");
const EmailField = z.string().trim().toLowerCase().min(1, REQUIRED).max(150, BAD_EMAIL).pipe(z.email(BAD_EMAIL));

const firstIssue = (result: z.ZodSafeParseResult<string>) => (result.success ? undefined : result.error.issues[0]?.message);

// PED-05, PED-06. No authorization to check: a public lookup that only answers when number and e-mail match;
// the API limits attempts by IP (429), so her IP goes with the call. The access goes to the tracking cookie
// only, so a payment in progress (the order cookie) is never touched.
export async function lookUpOrder(_prev: LookupState, formData: FormData): Promise<LookupState> {
  const values = { number: String(formData.get("number") ?? "").slice(0, 40), email: String(formData.get("email") ?? "").slice(0, 200) };
  const number = NumberField.safeParse(values.number);
  const email = EmailField.safeParse(values.email);
  if (!number.success || !email.success) {
    return { errors: { number: firstIssue(number), email: firstIssue(email) }, error: null, values };
  }

  const result = await apiPost<components["schemas"]["OrderAccess"]>(
    "/v1/orders/access",
    { number: number.data, email: email.data },
    await forwardedFor(),
  );
  if (!result.ok) {
    const error = result.problem.status === 404 ? "Não encontramos um pedido com esses dados" : result.problem.title;
    return { errors: {}, error, values };
  }
  const seconds = Math.floor((Date.parse(result.data.expiresAt) - Date.now()) / 1000);
  await saveTrackingAccess({ number: number.data, access: result.data.access }, Math.max(60, Number.isFinite(seconds) ? seconds : 60));
  redirect(`/pedido/${number.data}`);
}
