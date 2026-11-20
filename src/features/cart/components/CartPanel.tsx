"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { Button } from "@/src/components/ui/Button.tsx";
import { CloseIcon } from "@/src/components/ui/icons.tsx";
import type { CartPanelView } from "../views.ts";

type Props = { panel: CartPanelView; onClose: () => void };

// SAC-01: a native modal dialog, so Esc, focus trap, focus return and the backdrop come from the browser.
// It closes only when she asks: "Fechar", a tap outside or Esc; never by itself.
export function CartPanel({ panel, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialog}
      aria-labelledby="cart-panel-title"
      onClose={onClose}
      // A click on the dialog itself (not on its content) is a click on the backdrop.
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
      className="fixed inset-x-0 top-auto bottom-0 m-0 mt-auto w-full max-w-none rounded-t-2xl bg-background p-0 text-primary transition-transform duration-300 backdrop:bg-primary/45 starting:open:translate-y-full motion-reduce:transition-none md:inset-y-0 md:right-0 md:left-auto md:h-full md:max-h-none md:w-[400px] md:rounded-none md:starting:open:translate-x-full md:starting:open:translate-y-0"
    >
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 id="cart-panel-title" className="font-mono text-xs font-medium uppercase tracking-[0.08em]">
            Peça adicionada à sacola
          </h2>
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => dialog.current?.close()}
            className="-mr-3 flex size-12 items-center justify-center rounded-control"
          >
            <CloseIcon className="size-5" />
          </button>
        </div>
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
        <div className="flex flex-col gap-2">
          <Button variant="primary" href="/checkout">
            Finalizar compra
          </Button>
          <Button variant="secondary" href="/sacola">
            Ver sacola
          </Button>
        </div>
      </div>
    </dialog>
  );
}
