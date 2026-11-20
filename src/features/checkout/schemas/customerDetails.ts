// CHK-02 to CHK-07: one schema for the details form (in the browser) and the server actions,
// so both show the same messages. No server-only here on purpose.
import { z } from "zod";
import type { components } from "../../../lib/api-types.ts";

type CustomerDetails = components["schemas"]["CustomerDetails"];

// Version of the consent text the boxes show (CHK-07); bump it when the text changes.
export const CONSENT_TEXT_VERSION = "2026-11";

export const DETAILS_FIELDS = [
  "name",
  "cpf",
  "email",
  "phone",
  "cep",
  "street",
  "number",
  "complement",
  "neighborhood",
  "city",
  "state",
] as const;
export type DetailsField = (typeof DETAILS_FIELDS)[number];

const REQUIRED = "Campo obrigatório";
const TOO_LONG = "Texto muito longo"; // only reachable by getting around the field's maxLength

// CHK-03: dots, dashes, parentheses, slashes and spaces typed by the customer are dropped.
export function digits(value: string): string {
  return value.replace(/[\s.\-()/]/g, "");
}

// Standard CPF check: 11 digits, not all the same, both check digits right (mod 11).
export function isValidCpf(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const check = (length: number) => {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += Number(cpf[i]) * (length + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return check(9) === Number(cpf[9]) && check(10) === Number(cpf[10]);
}

// FormData gives null for a missing field; treat it as empty text.
const text = (schema: z.ZodType<string>) => z.preprocess((v) => (typeof v === "string" ? v : ""), schema);
const required = (max: number) => text(z.string().trim().min(1, REQUIRED).max(max, TOO_LONG));
// An unchecked box is simply missing from the form data.
const box = z.unknown().optional().transform((v) => v === "on");

export const customerDetailsInput = z
  .object({
    name: required(100),
    cpf: text(
      z
        .string()
        .trim()
        .min(1, REQUIRED)
        .transform(digits)
        .pipe(z.string().regex(/^\d{11}$/, "CPF deve ter 11 números").refine(isValidCpf, "CPF inválido")),
    ),
    email: text(z.string().trim().min(1, REQUIRED).max(150, TOO_LONG).regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, "Digite um e-mail válido")),
    phone: text(
      z
        .string()
        .trim()
        .min(1, REQUIRED)
        .transform(digits)
        .pipe(
          z
            .string()
            .regex(/^\d+$/, "Digite só números")
            .min(10, "Digite o celular com DDD")
            .max(11, "Digite o celular com DDD"),
        ),
    ),
    cep: text(z.string().trim().min(1, REQUIRED).transform(digits).pipe(z.string().regex(/^\d{8}$/, "Digite um CEP com 8 números"))),
    street: required(100),
    number: required(10),
    complement: text(z.string().trim().max(40, TOO_LONG)),
    neighborhood: required(60),
    city: required(60),
    state: text(
      z
        .string()
        .trim()
        .min(1, REQUIRED)
        .regex(/^[A-Za-z]{2}$/, "Digite a sigla do estado, como SP")
        .transform((v) => v.toUpperCase()),
    ),
    marketingEmail: box,
    marketingWhatsapp: box,
  })
  .transform(
    (v): CustomerDetails => ({
      name: v.name,
      cpf: v.cpf,
      email: v.email,
      phone: v.phone,
      address: {
        cep: v.cep,
        street: v.street,
        number: v.number,
        complement: v.complement || null,
        neighborhood: v.neighborhood,
        city: v.city,
        state: v.state,
      },
      consents: { email: v.marketingEmail, whatsapp: v.marketingWhatsapp, textVersion: CONSENT_TEXT_VERSION },
    }),
  );

// The first message of each field, in screen order (CHK-03: focus goes to the first one).
export function fieldErrors(error: z.ZodError): Partial<Record<DetailsField, string>> {
  const errors: Partial<Record<DetailsField, string>> = {};
  for (const field of DETAILS_FIELDS) {
    const issue = error.issues.find((i) => i.path[0] === field);
    if (issue) errors[field] = issue.message;
  }
  return errors;
}
