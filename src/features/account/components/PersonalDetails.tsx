"use client";

import { useActionState, useEffect, useState } from "react";
import { AlertIcon, Button, Field } from "@/src/components/ui";
import type { ContactState, EmailChangeState, PasswordState } from "../types.ts";

type Props = {
  account: { name: string; phone: string; maskedCpf: string; email: string; hasPassword: boolean }; // phone formatted
  updateContact: (prev: ContactState, formData: FormData) => Promise<ContactState>;
  requestEmailChange: (prev: EmailChangeState, formData: FormData) => Promise<EmailChangeState>;
  confirmEmailChange: (prev: EmailChangeState, formData: FormData) => Promise<EmailChangeState>;
  setPassword: (prev: PasswordState, formData: FormData) => Promise<PasswordState>;
};

const section = "flex flex-col gap-4 bg-card p-4";
const heading = "font-mono text-xs font-medium uppercase tracking-[0.08em]";

function Alert({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="flex items-start gap-2 text-sm text-error">
      <AlertIcon className="size-5 shrink-0" />
      {children}
    </p>
  );
}

function Notice({ children }: { children: string | null }) {
  return (
    <p role="status" className="text-sm text-success">
      {children ?? ""}
    </p>
  );
}

// Focus goes to the first wrong field (DESIGN.md: errors with border, icon and text).
function useFocusFirst(errors: Record<string, string | undefined>, ids: Record<string, string>) {
  useEffect(() => {
    const first = Object.keys(ids).find((key) => errors[key]);
    if (first) document.getElementById(ids[first])?.focus();
  }, [errors, ids]);
}

const CONTACT_IDS = { name: "name", phone: "phone" };
const EMAIL_IDS = { email: "new-email", code: "code" };
const PASSWORD_IDS = { password: "new-password" };

// CTA-06, CTA-07: name and phone ("Salvar"), the CPF read-only, the e-mail with its code, and the optional password.
export function PersonalDetails({ account, updateContact, requestEmailChange, confirmEmailChange, setPassword }: Props) {
  // Kept here, since React resets a form after each action.
  const [name, setName] = useState(account.name);
  const [phone, setPhone] = useState(account.phone);
  const [contact, saveContact, savingContact] = useActionState(updateContact, { errors: {}, error: null, notice: null });
  useFocusFirst(contact.errors, CONTACT_IDS);

  const [emailChange, sendEmail, sendingEmail] = useActionState<EmailChangeState, FormData>(
    (prev, formData) => (formData.get("intent") === "confirm" ? confirmEmailChange(prev, formData) : requestEmailChange(prev, formData)),
    { step: "closed", email: "", errors: {}, error: null, notice: null },
  );
  const [opened, setOpened] = useState(false);
  useFocusFirst(emailChange.errors, EMAIL_IDS);
  // "Trocar e-mail" opens the step; a finished change ("E-mail trocado") closes it again.
  const emailStep = emailChange.step === "closed" ? (opened && !emailChange.notice ? "email" : "closed") : emailChange.step;

  const [password, savePassword, savingPassword] = useActionState(setPassword, { errors: {}, error: null, notice: null });
  useFocusFirst(password.errors, PASSWORD_IDS);
  const passwordLabel = account.hasPassword ? "Trocar senha" : "Criar senha";

  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-8">
      <h1 className="font-serif text-[1.75rem] font-normal">Dados pessoais</h1>

      <form action={saveContact} noValidate className={section}>
        <Field label="Nome completo" name="name" autoComplete="name" maxLength={100} value={name} onChange={setName} error={contact.errors.name} />
        <Field
          label="Celular"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          maxLength={15}
          value={phone}
          onChange={setPhone}
          error={contact.errors.phone}
        />
        {/* CTA-06: the CPF is shown partly hidden and is never sent from here. */}
        <Field id="cpf" label="CPF" hint="O CPF não pode ser alterado" value={account.maskedCpf} readOnly />
        {contact.error && <Alert>{contact.error}</Alert>}
        <Notice>{contact.notice}</Notice>
        <Button variant="primary" type="submit" disabled={savingContact}>
          {savingContact ? "Processando" : "Salvar"}
        </Button>
      </form>

      <section aria-labelledby="email-heading" className={section}>
        <h2 id="email-heading" className={heading}>
          E-mail
        </h2>
        <p>{account.email}</p>
        <Notice>{emailChange.notice}</Notice>
        {emailStep === "closed" && (
          <Button variant="secondary" onClick={() => setOpened(true)}>
            Trocar e-mail
          </Button>
        )}
        {emailStep === "email" && (
          <form action={sendEmail} noValidate className="flex flex-col gap-4">
            <input type="hidden" name="intent" value="request" />
            <Field
              id="new-email"
              label="Novo e-mail"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={150}
              defaultValue={emailChange.email}
              error={emailChange.errors.email}
            />
            {emailChange.error && <Alert>{emailChange.error}</Alert>}
            <Button variant="primary" type="submit" disabled={sendingEmail}>
              {sendingEmail ? "Processando" : "Receber código"}
            </Button>
          </form>
        )}
        {emailStep === "code" && (
          <form action={sendEmail} noValidate className="flex flex-col gap-4">
            <input type="hidden" name="intent" value="confirm" />
            <p>Enviamos um código para {emailChange.email}</p>
            <Field label="Código" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={11} error={emailChange.errors.code} />
            {emailChange.error && <Alert>{emailChange.error}</Alert>}
            <Button variant="primary" type="submit" disabled={sendingEmail}>
              {sendingEmail ? "Processando" : "Confirmar"}
            </Button>
          </form>
        )}
      </section>

      <form action={savePassword} noValidate className={section}>
        <Field
          id="new-password"
          label="Nova senha"
          name="password"
          type="password"
          autoComplete="new-password"
          hint="Mínimo de 8 caracteres"
          error={password.errors.password}
        />
        {password.error && <Alert>{password.error}</Alert>}
        <Notice>{password.notice}</Notice>
        <Button variant="primary" type="submit" disabled={savingPassword}>
          {savingPassword ? "Processando" : passwordLabel}
        </Button>
      </form>
    </div>
  );
}
