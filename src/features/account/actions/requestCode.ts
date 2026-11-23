"use server";

import { z } from "zod";
import { apiPost } from "@/src/lib/api";
import { forwardedFor } from "@/src/lib/request-ip";
import { readIdentification, saveIdentification } from "../identification-cookie.ts";
import { emailInput, wayInput } from "../schemas/identification.ts";
import { START, type IdentificationState, type IdentificationWay } from "../types.ts";

const mode = z.enum(["checkout", "account"]);

// IDT-01, IDT-02, IDT-05, CTA-01. No authorization to check: anyone may ask for a code, and the API answers
// the same for any e-mail and limits attempts by e-mail and IP (429), so her IP goes with the call.
export async function requestCode(prev: IdentificationState, formData: FormData): Promise<IdentificationState> {
  let email: string;
  let way: IdentificationWay;
  const resend = formData.get("resend") === "1";
  if (resend) {
    const pending = await readIdentification();
    if (!pending) return START; // the 10 minutes ran out: start again
    ({ email, way } = pending);
  } else {
    const typed = String(formData.get("email") ?? "").slice(0, 200);
    const parsedEmail = emailInput.safeParse(typed);
    // In /conta there is no choice: the code always signs in.
    const parsedWay = mode.safeParse(formData.get("mode")).data === "account" ? wayInput.safeParse("account") : wayInput.safeParse(formData.get("way"));
    if (!parsedEmail.success || !parsedWay.success) {
      return {
        ...START,
        email: typed,
        way: parsedWay.success ? parsedWay.data : null,
        errors: { email: parsedEmail.error?.issues[0]?.message, way: parsedWay.error?.issues[0]?.message },
      };
    }
    email = parsedEmail.data;
    way = parsedWay.data;
  }

  const result = await apiPost("/v1/email-codes", { email }, await forwardedFor());
  if (!result.ok) return { ...prev, error: result.problem.title, notice: null, errors: {} };
  const sentAt = Date.now();
  await saveIdentification({ email, way, sentAt });
  return { step: "code", email, way, sentAt, errors: {}, error: null, notice: resend ? "Código reenviado" : null };
}
