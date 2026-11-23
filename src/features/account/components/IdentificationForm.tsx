"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { AlertIcon, Button, Field } from "@/src/components/ui";
import { CPF_IN_USE, type IdentificationState } from "../types.ts";

type Action = (prev: IdentificationState, formData: FormData) => Promise<IdentificationState>;

type Props = {
  initial: IdentificationState;
  mode: "checkout" | "account";
  whatsapp: string; // digits for https://wa.me/
  requestCode: Action;
  confirmCode: Action;
  createPassword: Action;
  signInWithPassword: Action;
  finishIdentification: Action;
  saveAccountDetails: Action;
  changeEmail: () => Promise<void>;
};

const RESEND_AFTER = 30_000; // IDT-05
const HELP_AFTER = 120_000; // IDT-06

const WAYS = [
  { value: "guest", label: "Comprar só com e-mail", hint: "Você confirma o e-mail a cada compra." },
  { value: "account", label: "Criar conta", hint: "Sua conta guarda pedidos e endereços." },
] as const;

function Alert({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="flex items-start gap-2 text-sm text-error">
      <AlertIcon className="size-5 shrink-0" />
      {children}
    </p>
  );
}

// IDT-14: the "Seus dados" fields, with the checkout's names and limits.
const CONTACT = [
  { name: "name", label: "Nome completo", autoComplete: "name", maxLength: 100 },
  { name: "cpf", label: "CPF", autoComplete: "off", maxLength: 14, inputMode: "numeric" },
  { name: "phone", label: "Celular", autoComplete: "tel-national", maxLength: 15, type: "tel", inputMode: "tel" },
] as const;
type ContactValues = Record<(typeof CONTACT)[number]["name"], string>;

// IDT-01 to IDT-10, IDT-13 to IDT-15, CTA-01. Codes and passwords never stay in this state; the e-mail being confirmed
// comes back from the server after a reload (IDT-07).
export function IdentificationForm({
  initial,
  mode,
  whatsapp,
  requestCode,
  confirmCode,
  createPassword,
  signInWithPassword,
  finishIdentification,
  saveAccountDetails,
  changeEmail,
}: Props) {
  // One state for every step: the submitted form says which server action answers.
  const [state, dispatch, pending] = useActionState<IdentificationState, FormData>((prev, formData) => {
    const intent = formData.get("intent");
    if (intent === "confirm") return confirmCode(prev, formData);
    if (intent === "password") return createPassword(prev, formData);
    if (intent === "signin") return signInWithPassword(prev, formData);
    if (intent === "finish") return finishIdentification(prev, formData);
    if (intent === "details") return saveAccountDetails(prev, formData);
    return requestCode(prev, formData);
  }, initial);
  // IDT-10: "Já tem senha? Entrar com senha" swaps the e-mail step for the password sign-in.
  const [withPassword, setWithPassword] = useState(false);
  // IDT-15: the e-mail typed on either first step survives "Voltar".
  const [typedEmail, setTypedEmail] = useState(initial.email);
  // IDT-14: kept here, since React resets the form after each action.
  const [contact, setContact] = useState<ContactValues>({ name: "", cpf: "", phone: "" });
  const next = mode === "checkout" ? "/checkout" : "/conta";

  // Time since the code was sent, refreshed only at the two moments that change the screen.
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const sentAt = state.sentAt;
    if (!sentAt) return;
    const since = Date.now() - sentAt;
    setElapsed(since); // eslint-disable-line react-hooks/set-state-in-effect -- the clock is only readable after mount
    const timers = [RESEND_AFTER, HELP_AFTER].filter((t) => t > since).map((t) => setTimeout(() => setElapsed(Date.now() - sentAt), t - since));
    return () => timers.forEach(clearTimeout);
  }, [state.sentAt]);

  // Focus goes to the first wrong field (DESIGN.md: errors with border, icon and text).
  useEffect(() => {
    const e = state.errors;
    const first = (["email", "code", "password", "name", "cpf", "phone"] as const).find((f) => e[f]) ?? (e.way ? "way-guest" : null);
    if (first) document.getElementById(first)?.focus();
  }, [state]);

  const heading = mode === "checkout" ? "Identificação" : "Minha conta";

  // IDT-08: only for an account the code has just created.
  if (state.step === "password") {
    return (
      <div className="flex flex-col gap-4 px-4 pt-6 pb-8">
        <h1 className="font-serif text-[1.75rem] font-normal">{heading}</h1>
        <form action={dispatch} noValidate className="flex flex-col gap-4 bg-card p-4">
          <input type="hidden" name="intent" value="password" />
          <input type="hidden" name="next" value={next} />
          <Field
            label="Crie sua senha"
            name="password"
            type="password"
            autoComplete="new-password"
            hint="Mínimo de 8 caracteres"
            error={state.errors.password}
          />
          {state.error && <Alert>{state.error}</Alert>}
          <Button variant="primary" type="submit" disabled={pending}>
            {pending ? "Processando" : "Continuar"}
          </Button>
        </form>
      </div>
    );
  }

  // IDT-09: "Criar conta" on an e-mail that has one signs her in and keeps the old password.
  if (state.step === "existing") {
    return (
      <div className="flex flex-col gap-4 px-4 pt-6 pb-8">
        <h1 className="font-serif text-[1.75rem] font-normal">{heading}</h1>
        <form action={dispatch} className="flex flex-col gap-4 bg-card p-4">
          <input type="hidden" name="intent" value="finish" />
          <input type="hidden" name="next" value={next} />
          <p role="status">{state.notice}</p>
          <Button variant="primary" type="submit" disabled={pending}>
            Continuar
          </Button>
        </form>
      </div>
    );
  }

  // IDT-14: an account is complete (name, CPF, phone) before it buys; the address comes at the first purchase.
  if (state.step === "details") {
    return (
      <div className="flex flex-col gap-4 px-4 pt-6 pb-8">
        <h1 className="font-serif text-[1.75rem] font-normal">{heading}</h1>
        <form action={dispatch} noValidate className="flex flex-col gap-4 bg-card p-4">
          <input type="hidden" name="intent" value="details" />
          <input type="hidden" name="next" value={next} />
          <h2 className="font-serif text-xl font-normal">Seus dados</h2>
          {CONTACT.map((field) => (
            <div key={field.name} className="flex flex-col gap-2">
              <Field
                {...field}
                error={state.errors[field.name]}
                value={contact[field.name]}
                onChange={(value) => setContact((c) => ({ ...c, [field.name]: value }))}
              />
              {field.name === "cpf" && state.errors.cpf === CPF_IN_USE && (
                <a href={`https://wa.me/${whatsapp}`} className="flex min-h-12 items-center text-sm text-primary underline">
                  Fale com a loja no WhatsApp
                </a>
              )}
            </div>
          ))}
          {state.error && <Alert>{state.error}</Alert>}
          <Button variant="primary" type="submit" disabled={pending}>
            {pending ? "Processando" : "Continuar"}
          </Button>
        </form>
      </div>
    );
  }

  if (state.step === "code") {
    return (
      <div className="flex flex-col gap-4 px-4 pt-6 pb-8">
        <h1 className="font-serif text-[1.75rem] font-normal">{heading}</h1>
        <form action={dispatch} noValidate className="flex flex-col gap-4 bg-card p-4">
          <input type="hidden" name="intent" value="confirm" />
          <input type="hidden" name="next" value={next} />
          <p>Enviamos um código para {state.email}</p>
          <Field label="Código" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={11} error={state.errors.code} />
          {state.error && <Alert>{state.error}</Alert>}
          <Button variant="primary" type="submit" disabled={pending}>
            {pending ? "Processando" : "Confirmar"}
          </Button>
        </form>
        <div className="flex flex-col gap-2">
          <form action={dispatch}>
            <input type="hidden" name="intent" value="request" />
            <input type="hidden" name="resend" value="1" />
            <Button variant="secondary" type="submit" disabled={pending || elapsed < RESEND_AFTER} className="w-full">
              Reenviar código
            </Button>
          </form>
          <p role="status" className="text-sm text-success">
            {state.notice ?? ""}
          </p>
          {elapsed >= HELP_AFTER && (
            <a href={`https://wa.me/${whatsapp}`} className="flex min-h-12 items-center text-sm text-primary underline">
              Não recebeu? Fale com a loja no WhatsApp
            </a>
          )}
          <Button variant="secondary" onClick={() => startTransition(() => changeEmail())}>
            Trocar e-mail
          </Button>
        </div>
      </div>
    );
  }

  if (withPassword) {
    return (
      <div className="flex flex-col gap-4 px-4 pt-6 pb-8">
        <h1 className="font-serif text-[1.75rem] font-normal">{heading}</h1>
        <form action={dispatch} noValidate className="flex flex-col gap-4 bg-card p-4">
          <input type="hidden" name="intent" value="signin" />
          <input type="hidden" name="next" value={next} />
          <Field
            label="E-mail"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            maxLength={150}
            defaultValue={typedEmail}
            onChange={setTypedEmail}
            error={state.errors.email}
          />
          <Field label="Senha" name="password" type="password" autoComplete="current-password" error={state.errors.password} />
          {state.error && <Alert>{state.error}</Alert>}
          <Button variant="primary" type="submit" disabled={pending}>
            {pending ? "Processando" : "Entrar"}
          </Button>
        </form>
        <Button variant="secondary" onClick={() => setWithPassword(false)}>
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-8">
      <h1 className="font-serif text-[1.75rem] font-normal">{heading}</h1>
      {/* noValidate: the store shows its own messages in Portuguese, not the browser's bubble. */}
      <form action={dispatch} noValidate className="flex flex-col gap-4 bg-card p-4">
        <input type="hidden" name="intent" value="request" />
        <input type="hidden" name="mode" value={mode} />
        <Field
          label="E-mail"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={150}
          defaultValue={typedEmail}
          onChange={setTypedEmail}
          error={state.errors.email}
        />
        {mode === "checkout" && (
          <div role="radiogroup" aria-labelledby="way-label" aria-describedby={state.errors.way ? "way-error" : undefined} className="flex flex-col gap-2">
            <p id="way-label" className="text-sm font-medium">
              Como você quer comprar?
            </p>
            {WAYS.map((way) => (
              <label
                key={way.value}
                className={`grid min-h-14 cursor-pointer grid-cols-[1.5rem_1fr] items-center gap-2.5 border px-3 py-2.5 has-checked:border-primary has-focus-visible:outline-2 has-focus-visible:outline-primary ${state.errors.way ? "border-2 border-error" : "border-line"}`}
              >
                <input
                  id={`way-${way.value}`}
                  type="radio"
                  name="way"
                  value={way.value}
                  // Uncontrolled: React 19 resets the form after the action and puts back the returned choice.
                  defaultChecked={state.way === way.value}
                  className="size-5 accent-primary"
                />
                <span className="flex flex-col">
                  <span>{way.label}</span>
                  <span className="text-sm text-muted">{way.hint}</span>
                </span>
              </label>
            ))}
            {state.errors.way && (
              <p id="way-error" className="flex items-start gap-1 text-sm text-error">
                <AlertIcon className="size-5 shrink-0" />
                {state.errors.way}
              </p>
            )}
          </div>
        )}
        {/* IDT-01 (LGPD): she is told how the e-mail is used when she gives it. */}
        <p className="text-[0.8125rem] text-muted">Usaremos este e-mail para o pedido e para lembrar você de uma compra não concluída.</p>
        {state.error && <Alert>{state.error}</Alert>}
        <Button variant="primary" type="submit" disabled={pending}>
          {pending ? "Processando" : "Receber código"}
        </Button>
      </form>
      <Button variant="secondary" onClick={() => setWithPassword(true)}>
        Já tem senha? Entrar com senha
      </Button>
    </div>
  );
}
