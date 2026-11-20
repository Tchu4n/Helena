"use client";

import { useActionState, useOptimistic, useState } from "react";
import { Button } from "@/src/components/ui/Button.tsx";
import { Field } from "@/src/components/ui/Field.tsx";
import { AlertIcon } from "@/src/components/ui/icons.tsx";
import type { ShippingState } from "../types.ts";
import type { CartView } from "../views.ts";

type Props = Pick<CartView, "cep" | "deliveryOptions" | "chosenDelivery" | "freeShipping"> & {
  saveCartCep: (prev: ShippingState, formData: FormData) => Promise<ShippingState>;
  chooseDelivery: (prev: { message: string | null }, formData: FormData) => Promise<{ message: string | null }>;
};

const TITLE = "Frete e prazo";

function Alert({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="flex items-center gap-2 text-sm text-error">
      <AlertIcon className="size-4 shrink-0" />
      {children}
    </p>
  );
}

// SAC-08 to SAC-10: CEP, options with price and time, and what is missing for free shipping.
export function CartShipping({ cep, deliveryOptions, chosenDelivery, freeShipping, saveCartCep, chooseDelivery }: Props) {
  const [cepState, cepAction, savingCep] = useActionState(saveCartCep, {
    status: "idle",
    cep: cep ?? "",
    message: null,
    shipping: null,
  });
  // The tapped option shows checked at once and goes back to the bag's own choice if the API refuses it.
  // The form is never remounted nor disabled, so keyboard focus stays on the option (GER-07).
  const [picked, setPicked] = useOptimistic(chosenDelivery);
  const [deliveryMessage, setDeliveryMessage] = useState<string | null>(null);
  const deliveryAction = async (formData: FormData) => {
    setPicked(String(formData.get("type")) as CartView["chosenDelivery"]);
    const result = await chooseDelivery({ message: null }, formData);
    setDeliveryMessage(result.message);
  };

  return (
    <section aria-label={TITLE} className="flex flex-col gap-3 bg-card p-4">
      <h2 className="font-mono text-xs font-medium uppercase tracking-[0.08em]">{TITLE}</h2>
      <form action={cepAction} className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <Field
            label="CEP"
            name="cep"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={10}
            // React resets the form after the action: the typed CEP comes back in the state.
            defaultValue={cepState.status === "idle" ? (cep ?? "") : cepState.cep}
            error={cepState.status === "invalid" ? cepState.message : null}
          />
        </div>
        <div className={`shrink-0 ${cepState.status === "invalid" ? "self-start pt-6" : ""}`}>
          <Button variant="secondary" type="submit" disabled={savingCep} className="whitespace-nowrap">
            {cepState.status === "failed" ? "Tentar de novo" : cep ? "Alterar" : "Calcular"}
          </Button>
        </div>
      </form>
      {cepState.status === "failed" && <Alert>{cepState.message}</Alert>}

      {deliveryOptions.length > 0 && (
        <form action={deliveryAction}>
          <fieldset className="flex flex-col border-t border-line">
            <legend className="sr-only">Modalidade de entrega</legend>
            {deliveryOptions.map((option) => (
              <label
                key={option.type}
                className="grid min-h-14 cursor-pointer grid-cols-[1.5rem_1fr_auto] items-center gap-2.5 border-b border-line py-2.5 text-[0.9375rem] has-focus-visible:outline-2 has-focus-visible:outline-primary"
              >
                <input
                  type="radio"
                  name="type"
                  value={option.type}
                  checked={option.type === picked}
                  onChange={(event) => event.currentTarget.form?.requestSubmit()}
                  className="size-5 accent-primary"
                />
                <span className="flex flex-col">
                  <span>{option.label}</span>
                  <span className="text-sm text-success">{option.deliveryTime}</span>
                </span>
                <span className={`tabular-nums ${option.free ? "font-medium text-success" : ""}`}>{option.price}</span>
              </label>
            ))}
          </fieldset>
          {/* Without JavaScript the change can't submit by itself. */}
          <noscript>
            <Button variant="secondary" type="submit" className="mt-3">
              Escolher entrega
            </Button>
          </noscript>
        </form>
      )}
      {deliveryMessage && <Alert>{deliveryMessage}</Alert>}
      {freeShipping && <p className="text-sm">{freeShipping}</p>}
    </section>
  );
}
