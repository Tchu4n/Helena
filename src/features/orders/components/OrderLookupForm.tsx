"use client";

import { useActionState, useEffect } from "react";
import { AlertIcon, Button, Field } from "@/src/components/ui";
import type { LookupState } from "../actions/lookUpOrder.ts";

type Props = { number?: string; lookUpOrder: (prev: LookupState, formData: FormData) => Promise<LookupState> };

// PED-05, PED-06: number + e-mail, no account. On /pedido and on /pedido/HL-… when she has no access.
export function OrderLookupForm({ number = "", lookUpOrder }: Props) {
  const [state, formAction, pending] = useActionState(lookUpOrder, { errors: {}, error: null, values: { number, email: "" } });

  // Focus goes to the first wrong field, so she hears and fixes it right away.
  useEffect(() => {
    const first = state.errors.number ? "number" : state.errors.email ? "email" : null;
    if (first) document.getElementById(first)?.focus();
  }, [state]);

  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-[1.75rem] font-normal">Acompanhar pedido</h1>
        <p className="text-muted">Use o número do pedido e o e-mail da compra.</p>
      </div>
      {/* noValidate: the store shows its own messages in Portuguese, not the browser's bubble. */}
      <form action={formAction} noValidate className="flex flex-col gap-4 bg-card p-4">
        <Field label="Número do pedido" name="number" autoComplete="off" maxLength={40} defaultValue={state.values.number} error={state.errors.number} />
        <Field
          label="E-mail"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={150}
          defaultValue={state.values.email}
          error={state.errors.email}
        />
        {state.error && (
          <p role="alert" className="flex items-start gap-2 text-sm text-error">
            <AlertIcon className="size-5 shrink-0" />
            {state.error}
          </p>
        )}
        <Button variant="primary" type="submit" disabled={pending}>
          {pending ? "Processando" : "Ver pedido"}
        </Button>
      </form>
    </div>
  );
}
