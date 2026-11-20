"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/src/components/ui/Button.tsx";
import { AlertIcon } from "@/src/components/ui/icons.tsx";
import type { CheckoutState } from "../types.ts";

// `soldOutItemIds`: the pieces still sold out in the bag; a message leaves once its piece is removed.
type Props = { total: string; soldOutItemIds: string[]; goToCheckout: () => Promise<CheckoutState> };

// SAC-07, GER-02: total and "Finalizar compra", fixed at the bottom on phones in place of the tabs.
export function CheckoutBar({ total, soldOutItemIds, goToCheckout }: Props) {
  const [state, action, pending] = useActionState(goToCheckout, { messages: [], error: null });
  const bar = useRef<HTMLFormElement>(null);

  // GER-07: while fixed (phones), the bar's real height feeds --bottom-bar, so the cookie notice, the undo notice,
  // the page's bottom space and the focus scroll stay clear of it even when an alert makes it taller.
  useEffect(() => {
    const element = bar.current;
    if (!element) return;
    const root = document.documentElement;
    const observer = new ResizeObserver(() => {
      if (getComputedStyle(element).position === "fixed") root.style.setProperty("--bottom-bar", `${element.offsetHeight}px`);
      else root.style.removeProperty("--bottom-bar");
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--bottom-bar");
    };
  }, []);

  // SAC-07: take her to the first sold-out piece and put focus on its "Remover".
  useEffect(() => {
    const first = state.messages[0];
    if (!first) return;
    const card = document.getElementById(`cart-item-${first.itemId}`);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    card?.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
    card?.querySelector<HTMLButtonElement>("[data-remove]")?.focus({ preventScroll: true });
  }, [state]);

  const alerts = state.error
    ? [{ key: "error", text: state.error }]
    : state.messages.filter((m) => soldOutItemIds.includes(m.itemId)).map((m) => ({ key: m.itemId, text: m.text }));

  return (
    <form
      ref={bar}
      action={action}
      data-purchase-bar
      className="fixed inset-x-0 bottom-0 z-10 flex flex-col gap-3 border-t border-line bg-background p-4 md:static md:border-0 md:px-4 md:pt-0"
    >
      {alerts.length > 0 && (
        <div role="alert" className="flex flex-col gap-1">
          {alerts.map((alert) => (
            <p key={alert.key} className="flex items-start gap-2 text-sm text-error">
              <AlertIcon className="size-4 shrink-0" />
              {alert.text}
            </p>
          ))}
        </div>
      )}
      <div className="flex items-center gap-4">
        <p className="flex flex-col text-sm">
          <span>Total</span>
          <span className="text-[1.0625rem] font-medium tabular-nums">{total}</span>
        </p>
        <Button variant="primary" type="submit" disabled={pending} className="flex-1">
          Finalizar compra
        </Button>
      </div>
    </form>
  );
}
