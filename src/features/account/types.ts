export type IdentificationWay = "guest" | "account";

// One state for the steps of identification (IDT-01 to IDT-10). Never holds a code, a password or a token.
export type IdentificationState = {
  step: "email" | "code" | "password" | "existing" | "signin";
  email: string;
  way: IdentificationWay | null;
  sentAt: number | null; // when the last code was sent (IDT-05, IDT-06)
  errors: { email?: string; way?: string; code?: string; password?: string };
  error: string | null;
  notice: string | null;
};

export const EXISTING_ACCOUNT = "Este e-mail já tem uma conta. Você entrou nela e sua senha não mudou.";

export const START: IdentificationState = { step: "email", email: "", way: null, sentAt: null, errors: {}, error: null, notice: null };
