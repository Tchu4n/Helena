"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { AlertIcon, Button, Field } from "@/src/components/ui";
import type { IdentificationState } from "../types.ts";

type Action = (prev: IdentificationState, formData: FormData) => Promise<IdentificationState>;

type Props = {
  initial: IdentificationState;
  mode: "checkout" | "account";
  whatsapp: string; // digits for https://wa.me/
  requestCode: Action;
  confirmCode: Action;
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

// IDT-01 to IDT-07, IDT-13, CTA-01. Codes and passwords never stay in this state; the e-mail being confirmed
// comes back from the server after a reload (IDT-07).
export function IdentificationForm({ initial, mode, whatsapp, requestCode, confirmCode, changeEmail }: Props) {
  // One state for both steps: the submitted form says which server action answers.
  const [state, dispatch, pending] = useActionState<IdentificationState, FormData>(
    (prev, formData) => (formData.get("intent") === "confirm" ? confirmCode(prev, formData) : requestCode(prev, formData)),
    initial,
  );

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
    const first = state.errors.email ? "email" : state.errors.way ? "way-guest" : state.errors.code ? "code" : null;
    if (first) document.getElementById(first)?.focus();
  }, [state]);

  const heading = mode === "checkout" ? "Identificação" : "Minha conta";

  if (state.step === "code") {
    return (
      <div className="flex flex-col gap-4 px-4 pt-6 pb-8">
        <h1 className="font-serif text-[1.75rem] font-normal">{heading}</h1>
        <form action={dispatch} noValidate className="flex flex-col gap-4 bg-card p-4">
          <input type="hidden" name="intent" value="confirm" />
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
          defaultValue={state.email}
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
    </div>
  );
}
