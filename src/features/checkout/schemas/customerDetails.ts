// CHK-02 to CHK-07: one schema for the details form (in the browser) and the server actions,
// so both show the same messages. No server-only here on purpose.
import { z } from "zod";
import type { components } from "../../../lib/api-types.ts";

// IDT-03: the e-mail is not a form field; the server adds the one confirmed with the code.
// The contract leaves name, CPF and phone out of `required` (signed in, the API copies the account's).
type AddressDetails = Omit<components["schemas"]["CustomerDetails"], "email" | "name" | "cpf" | "phone">;
type Contact = components["schemas"]["AccountDetails"];
type Address = components["schemas"]["Address"];

// Version of the consent text the boxes show (CHK-07); bump it when the text changes.
export const CONSENT_TEXT_VERSION = "2026-11";

export const DETAILS_FIELDS = [
  "name",
  "cpf",
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
// IDT-14: "Seus dados" asks only these; IDT-11: signed in, checkout shows them read-only.
export const CONTACT_FIELDS = ["name", "cpf", "phone"] as const;
// CTA-05, CTA-12: the address part, shared by checkout and Meus endereços.
export const ADDRESS_FIELDS = ["cep", "street", "number", "complement", "neighborhood", "city", "state"] as const;
export type AddressField = (typeof ADDRESS_FIELDS)[number];

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

// One place for the name, CPF and phone rules: checkout and "Seus dados" (IDT-14) show the same messages.
const contact = {
  name: required(100),
  cpf: text(
    z
      .string()
      .trim()
      .min(1, REQUIRED)
      .transform(digits)
      .pipe(z.string().regex(/^\d{11}$/, "CPF deve ter 11 números").refine(isValidCpf, "CPF inválido")),
  ),
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
};

const addressFields = {
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
};

const address = { ...addressFields, marketingEmail: box, marketingWhatsapp: box };

function toAddress(v: z.infer<z.ZodObject<typeof addressFields>>): Address {
  return {
    cep: v.cep,
    street: v.street,
    number: v.number,
    complement: v.complement || null,
    neighborhood: v.neighborhood,
    city: v.city,
    state: v.state,
  };
}

// CTA-05: an address alone (Meus endereços), with the checkout's messages.
export const addressInput = z.object(addressFields).transform(toAddress);

function toDetails(v: z.infer<z.ZodObject<typeof address>>): AddressDetails {
  return {
    address: toAddress(v),
    consents: { email: v.marketingEmail, whatsapp: v.marketingWhatsapp, textVersion: CONSENT_TEXT_VERSION },
  };
}

// CTA-06: name and phone are fixed in Dados pessoais; the CPF never changes.
export const nameAndPhoneInput = z.object({ name: contact.name, phone: contact.phone });

export const contactInput = z.object(contact).transform((v): Contact => ({ name: v.name, cpf: v.cpf, phone: v.phone }));

// Without a session: name, CPF and phone go with the address.
export const customerDetailsInput = z
  .object({ ...contact, ...address })
  .transform((v): Contact & AddressDetails => ({ name: v.name, cpf: v.cpf, phone: v.phone, ...toDetails(v) }));

// IDT-11: signed in, only the address part; the API copies the account's name, CPF and phone.
export const addressDetailsInput = z.object(address).transform(toDetails);

// The first message of each field, in screen order (CHK-03: focus goes to the first one).
export function fieldErrors(error: z.ZodError): Partial<Record<DetailsField, string>> {
  const errors: Partial<Record<DetailsField, string>> = {};
  for (const field of DETAILS_FIELDS) {
    const issue = error.issues.find((i) => i.path[0] === field);
    if (issue) errors[field] = issue.message;
  }
  return errors;
}
