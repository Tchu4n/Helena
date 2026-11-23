// IDT-01 to IDT-10: the identification fields, with the store's own messages (the first issue is the field error).
import { z } from "zod";

const REQUIRED = "Campo obrigatório";
const BAD_EMAIL = "Digite um e-mail válido";
const BAD_CODE = "Digite os 6 números do código";

export const emailInput = z
  .string({ error: REQUIRED })
  .trim()
  .toLowerCase()
  .min(1, REQUIRED)
  .max(150, BAD_EMAIL)
  .pipe(z.email(BAD_EMAIL));

// Review focus 3: a pasted code may come with spaces.
export const codeInput = z
  .string({ error: BAD_CODE })
  .transform((value) => value.replace(/\s/g, ""))
  .pipe(z.string().regex(/^\d{6}$/, BAD_CODE));

// Not trimmed: a space is a valid password character.
export const passwordInput = z
  .string({ error: "A senha precisa ter pelo menos 8 caracteres" })
  .min(8, "A senha precisa ter pelo menos 8 caracteres")
  .max(72, "A senha pode ter no máximo 72 caracteres");

export const wayInput = z.enum(["guest", "account"], { error: "Escolha como quer comprar" });
