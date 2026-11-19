"use client";

import { useActionState, useState } from "react";
import { Button } from "@/src/components/ui/Button.tsx";
import { Field } from "@/src/components/ui/Field.tsx";
import { requestRestockAlert } from "../actions/requestRestockAlert.ts";
import type { RestockState } from "../restock-types.ts";

const TITLE = "Avise-me quando estiver disponível";
const INITIAL: RestockState = { status: "idle", message: null, channel: "email", contact: "" };

// PRO-12. E-mail starts checked: it is how the alert reaches her, not marketing consent.
export function RestockAlertForm({ productSizeId, sizeLabel }: { productSizeId: string; sizeLabel: string }) {
  const [state, formAction, pending] = useActionState(requestRestockAlert, INITIAL);
  const [channel, setChannel] = useState<RestockState["channel"]>("email");

  if (state.status === "saved") {
    return (
      <p role="status" className="text-sm">
        {state.message}
      </p>
    );
  }

  return (
    // noValidate: the store shows its own message in Portuguese (PRO-12), not the browser's bubble.
    <form action={formAction} aria-label={TITLE} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="productSizeId" value={productSizeId} />
      <input type="hidden" name="sizeLabel" value={sizeLabel} />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Avisar por</legend>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["email", "E-mail"],
              ["whatsapp", "WhatsApp"],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-control border border-control px-4 text-sm"
            >
              <input
                type="radio"
                name="channel"
                value={value}
                // Uncontrolled: React 19 resets the form after the action and puts back the returned choice.
                defaultChecked={state.channel === value}
                onChange={() => setChannel(value)}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <Field
        key={channel}
        label={channel === "email" ? "E-mail" : "WhatsApp com DDD"}
        name="contact"
        type={channel === "email" ? "email" : "tel"}
        inputMode={channel === "email" ? "email" : "tel"}
        autoComplete={channel === "email" ? "email" : "tel"}
        maxLength={150}
        defaultValue={state.contact}
        error={state.status === "error" ? state.message : null}
      />
      <p className="text-sm text-muted">Usaremos seu contato só para esse aviso.</p>
      <Button variant="secondary" type="submit" disabled={pending}>
        Avisar
      </Button>
    </form>
  );
}
