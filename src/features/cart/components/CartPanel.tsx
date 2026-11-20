"use client";

import Image from "next/image";
import { useActionState } from "react";
import { Button } from "@/src/components/ui/Button.tsx";
import { AlertIcon } from "@/src/components/ui/icons.tsx";
import { Sheet } from "@/src/components/ui/Sheet.tsx";
import { goToCheckout } from "../actions/goToCheckout.ts";
import type { CheckoutState } from "../types.ts";
import type { CartPanelView } from "../views.ts";

type Props = { panel: CartPanelView; onClose: () => void };

const IDLE: CheckoutState = { messages: [], error: null };

// SAC-01. "Finalizar compra" goes through the same check as the bag (SAC-07): a piece of the bag that sold out
// keeps her here, with the message, instead of reaching checkout.
export function CartPanel({ panel, onClose }: Props) {
  const [checkout, checkoutAction, checkingOut] = useActionState(goToCheckout, IDLE);
  const alerts = checkout.error ? [checkout.error] : checkout.messages.map((m) => m.text);

  return (
    <Sheet title="Peça adicionada à sacola" onClose={onClose}>
      <div className="grid grid-cols-[5rem_1fr] gap-3.5 bg-card p-4">
        <div className="relative aspect-[3/4] bg-surface">
          <Image src={panel.photoUrl} alt={panel.photoAlt} fill sizes="5rem" className="object-cover" />
        </div>
        <div className="flex flex-col gap-1 text-[0.9375rem]">
          <span>{panel.name}</span>
          <span className="text-sm text-muted">{panel.details}</span>
          <span className="tabular-nums">{panel.price}</span>
        </div>
      </div>
      {panel.freeShipping && <p className="text-sm">{panel.freeShipping}</p>}
      <p className="flex justify-between gap-3 text-[0.9375rem] font-medium">
        <span>{panel.subtotalLabel}</span>
        <span className="tabular-nums">{panel.subtotal}</span>
      </p>
      {alerts.length > 0 && (
        <div role="alert" className="flex flex-col gap-1">
          {alerts.map((text, index) => (
            <p key={index} className="flex items-start gap-2 text-sm text-error">
              <AlertIcon className="size-4 shrink-0" />
              {text}
            </p>
          ))}
        </div>
      )}
      <form action={checkoutAction} className="flex flex-col gap-2">
        <Button variant="primary" type="submit" disabled={checkingOut}>
          Finalizar compra
        </Button>
        <Button variant="secondary" href="/sacola">
          Ver sacola
        </Button>
      </form>
    </Sheet>
  );
}
