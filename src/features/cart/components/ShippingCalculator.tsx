"use client";

import { useActionState } from "react";
import { Button } from "@/src/components/ui/Button.tsx";
import { Field } from "@/src/components/ui/Field.tsx";
import { AlertIcon } from "@/src/components/ui/icons.tsx";
import { quoteShipping } from "../actions/quoteShipping.ts";
import type { ShippingState } from "../types.ts";
import { CepSuggestions } from "./CepSuggestions.tsx";

const TITLE = "Frete e prazo";

// PRO-08 to PRO-11: shipping price and delivery time on the product screen, before the cart.
// PRO-15: with "Funcionais" (remembersCeps), the CEPs calculated here are kept with their city/UF.
export function ShippingCalculator({ productId, savedCep, remembersCeps }: { productId: string; savedCep: string | null; remembersCeps: boolean }) {
  const initial: ShippingState = { status: "idle", cep: savedCep ?? "", message: null, shipping: null };
  const [state, formAction, pending] = useActionState(quoteShipping, initial);
  const calculated = state.status === "ok" && state.shipping ? { cep: state.cep.replace(/\D/g, ""), place: `${state.shipping.city}/${state.shipping.state}` } : null;

  return (
    <form action={formAction} aria-label={TITLE} className="flex flex-col gap-3">
      <h2 className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.08em] text-muted">{TITLE}</h2>
      <input type="hidden" name="productId" value={productId} />
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <CepSuggestions remembers={remembersCeps} calculated={calculated}>
            <Field
              label="CEP"
              name="cep"
              inputMode="numeric"
              autoComplete="postal-code"
              // "01.310-100" has 10 characters (PRO-09).
              maxLength={10}
              defaultValue={state.cep}
              error={state.status === "invalid" ? state.message : null}
            />
          </CepSuggestions>
        </div>
        {/* Without an error the field and the button line up; with one, the button stays at the field's height. */}
        <div className={`shrink-0 ${state.status === "invalid" ? "self-start pt-6" : ""}`}>
          <Button variant="secondary" type="submit" disabled={pending} className="whitespace-nowrap">
            {state.status === "failed" ? "Tentar de novo" : "Calcular"}
          </Button>
        </div>
      </div>
      {state.status === "failed" && (
        <p role="alert" className="flex items-center gap-2 text-sm text-error">
          <AlertIcon className="size-4 shrink-0" />
          {state.message}
        </p>
      )}
      {state.shipping && (
        <>
          <p className="text-sm text-muted">
            Entrega para {state.shipping.city}/{state.shipping.state}
          </p>
          <ul aria-label="Modalidades de entrega" className="flex flex-col divide-y divide-line border-y border-line">
            {state.shipping.options.map((option) => (
              <li key={option.label} className="flex items-baseline justify-between gap-4 py-3 text-sm">
                <span className="flex flex-col">
                  <span className="font-medium">{option.label}</span>
                  <span className="text-success">{option.deliveryTime}</span>
                </span>
                <span className={option.free ? "font-medium text-success" : "font-medium"}>{option.price}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </form>
  );
}
