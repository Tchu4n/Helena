"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Button, CheckIcon } from "@/src/components/ui";
import { clearDetails } from "@/src/features/checkout/client";
import type { OrderView } from "../views.ts";

type Props = { order: OrderView; summary: ReactNode; finishPurchase: () => Promise<void> };

const RETURN_MS = 8000;
// Any sign she is reading or about to tap keeps her here (PED-01). No "scroll": the browser scrolls on navigation.
const INTERACTIONS = ["pointerdown", "keydown", "touchstart", "wheel", "focusin"] as const;

// PED-01, PED-02: the check and "Pedido confirmado"; the purchase ends here, then home after 8 s without interaction.
// No focus is moved by code: that would fire focusin and cancel the return.
export function OrderConfirmation({ order, summary, finishPurchase }: Props) {
  const router = useRouter();
  // What first showed stays: finishPurchase moves the cookies and the page renders again.
  const [shown] = useState({ order, summary });

  useEffect(() => {
    clearDetails();
    void finishPurchase();
  }, [finishPurchase]);

  useEffect(() => {
    const cancel = () => {
      clearTimeout(timer);
      for (const name of INTERACTIONS) window.removeEventListener(name, cancel);
    };
    const timer = setTimeout(() => {
      cancel();
      router.push("/");
    }, RETURN_MS);
    for (const name of INTERACTIONS) window.addEventListener(name, cancel, { passive: true });
    return cancel;
  }, [router]);

  const { number, maskedEmail, paymentMethod } = shown.order;
  return (
    <div className="flex flex-col gap-6 px-4 pt-8 pb-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <CheckIcon className="size-16 text-success" />
        <h1 className="font-serif text-[1.75rem] font-normal">Pedido confirmado</h1>
        <p className="font-medium">Pedido {number}</p>
        <p className="text-muted">Enviamos os detalhes para {maskedEmail}</p>
      </div>
      {paymentMethod && (
        <p className="flex justify-between gap-3 bg-card px-4 py-3 text-[0.9375rem]">
          <span>Forma de pagamento</span>
          <span>{paymentMethod}</span>
        </p>
      )}
      {shown.summary}
      <div className="flex flex-col gap-2">
        <Button variant="primary" href={`/pedido/${number}`}>
          Acompanhar pedido
        </Button>
        <Button variant="secondary" href="/">
          Continuar comprando
        </Button>
      </div>
    </div>
  );
}
