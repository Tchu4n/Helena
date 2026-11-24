import type { AddressField } from "@/src/features/checkout/client";

export type IdentificationWay = "guest" | "account";

// One state for the steps of identification (IDT-01 to IDT-10, IDT-14). Never holds a code, a password or a token.
export type IdentificationState = {
  step: "email" | "code" | "password" | "existing" | "signin" | "details";
  email: string;
  way: IdentificationWay | null;
  sentAt: number | null; // when the last code was sent (IDT-05, IDT-06)
  errors: { email?: string; way?: string; code?: string; password?: string; name?: string; cpf?: string; phone?: string };
  error: string | null;
  notice: string | null;
};

// CTA-06, CTA-07: the three forms of Dados pessoais. Never hold a code or a password.
export type ContactState = { errors: { name?: string; phone?: string }; error: string | null; notice: string | null };
export type EmailChangeState = {
  step: "closed" | "email" | "code";
  email: string; // the new e-mail, once the code was sent
  errors: { email?: string; code?: string };
  error: string | null;
  notice: string | null;
};
export type PasswordState = { errors: { password?: string }; error: string | null; notice: string | null };

// IDT-14: neutral, says nothing about the other account; the form adds the WhatsApp link under it.
export const CPF_IN_USE = "Não foi possível usar este CPF.";

// CTA-09: the texts of `?exclusao=` (after asking for deletion; after a sign-in that cancelled it).
export const DELETION_NOTICES = {
  pedida: "Pedido de exclusão registrado. Você saiu da conta em todos os aparelhos.",
  cancelada: "Seu pedido de exclusão foi cancelado porque você entrou de novo.",
} as const;

export const EXISTING_ACCOUNT = "Este e-mail já tem uma conta. Você entrou nela e sua senha não mudou.";

export const START: IdentificationState = { step: "email", email: "", way: null, sentAt: null, errors: {}, error: null, notice: null };

// CTA-05: the address form of Meus endereços, and the notice of "Remover" and "Tornar favorito".
export type AddressFormState = { errors: Partial<Record<AddressField, string>>; error: string | null; saved: boolean };
export type AddressNotice = { notice: string | null; error: string | null };
export const ADDRESS_NOT_FOUND = "Endereço não encontrado";
export const ADDRESS_LIMIT = "Você chegou ao limite de 10 endereços. Remova um para adicionar outro.";
