"use client";

import { useImperativeHandle, useState, type Ref } from "react";
import { Field } from "@/src/components/ui/Field.tsx";
import { cardToken, checkCard, type CardErrors, type CardFields } from "./checkCard.ts";

export type CardGateway = { createToken: () => { token: string } | null };

const ORDER = ["number", "name", "validity", "cvv"] as const;
const heading = "font-mono text-xs font-medium uppercase tracking-[0.08em]";

// CHK-18: stands in for the gateway's own fields. The inputs have no `name` and sit outside any form,
// so the browser never sends them; only the token leaves this component. The real gateway replaces it.
export function SimulatedCardFields({ ref }: { ref: Ref<CardGateway> }) {
  const [card, setCard] = useState<CardFields>({ number: "", name: "", validity: "", cvv: "" });
  const [errors, setErrors] = useState<CardErrors>({});
  const set = (key: keyof CardFields) => (value: string) => setCard((c) => ({ ...c, [key]: value }));

  useImperativeHandle(ref, () => ({
    createToken() {
      const found = checkCard(card);
      setErrors(found);
      const first = ORDER.find((key) => found[key]);
      if (first) {
        document.getElementById(`card-${first}`)?.focus();
        return null;
      }
      return { token: cardToken(card.number) };
    },
  }));

  return (
    <fieldset aria-labelledby="card-gateway" className="flex flex-col gap-3">
      <h3 id="card-gateway" className={`${heading} text-muted`}>
        Campos do gateway · simulado
      </h3>
      <Field id="card-number" label="Número do cartão" inputMode="numeric" autoComplete="cc-number" maxLength={23} value={card.number} onChange={set("number")} error={errors.number} />
      <Field id="card-name" label="Nome impresso no cartão" autoComplete="cc-name" maxLength={60} value={card.name} onChange={set("name")} error={errors.name} />
      <div className="grid grid-cols-2 gap-2">
        <Field id="card-validity" label="Validade" inputMode="numeric" autoComplete="cc-exp" maxLength={5} value={card.validity} onChange={set("validity")} error={errors.validity} />
        <Field id="card-cvv" label="CVV" inputMode="numeric" autoComplete="cc-csc" maxLength={4} value={card.cvv} onChange={set("cvv")} error={errors.cvv} />
      </div>
    </fieldset>
  );
}
