"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/src/components/ui/Button.tsx";
import { AlertIcon } from "@/src/components/ui/icons.tsx";
import type { AddToCartState } from "@/src/features/cart";
import type { SizeOption } from "../views.ts";
import { RestockAlertCard } from "./RestockAlertCard.tsx";

type Props = {
  sizes: SizeOption[];
  soldOut: boolean;
  addToCart: (
    prev: AddToCartState,
    formData: FormData,
  ) => Promise<AddToCartState>;
};

const INITIAL: AddToCartState = {
  status: "idle",
  message: null,
  focusSizes: false,
};

// PRO-03 to PRO-05, PRO-07, PRO-13, PRO-14. The add action comes from the cart domain through the page.
export function ProductPurchase({ sizes, soldOut, addToCart }: Props) {
  const [state, formAction, pending] = useActionState(addToCart, INITIAL);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const submitting = useRef(false);
  const firstAvailable = useRef<HTMLInputElement>(null);
  const sizeGroup = useRef<HTMLFieldSetElement>(null);

  const selected = sizes.find((s) => s.id === selectedId) ?? null;
  const blocked = soldOut || (selected !== null && !selected.available);

  useEffect(() => {
    if (state.focusSizes) firstAvailable.current?.focus();
  }, [state]);

  // Released when the action ends, whatever its result.
  useEffect(() => {
    if (!pending) submitting.current = false;
  }, [pending]);

  const firstAvailableId = sizes.find((s) => s.available)?.id;

  return (
    <>
      <form
        action={formAction}
        // A double tap must add one piece only: the API adds quantities up.
        onSubmit={(event) => {
          if (submitting.current) event.preventDefault();
          submitting.current = true;
        }}
        className="flex flex-col gap-3"
      >
        <fieldset ref={sizeGroup} className="flex flex-col gap-3">
          <legend className="mb-3 font-mono text-[0.625rem] font-medium uppercase tracking-[0.08em] text-muted">
            Tamanho
          </legend>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => {
              const isSelected = size.id === selectedId;
              return (
                <label
                  key={size.id}
                  className={`inline-flex min-h-12 min-w-12 cursor-pointer items-center justify-center rounded-control px-4 text-sm has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary ${
                    isSelected
                      ? "border-4 border-double border-primary"
                      : "border border-control"
                  }`}
                >
                  <input
                    ref={
                      size.id === firstAvailableId ? firstAvailable : undefined
                    }
                    type="radio"
                    name="productSizeId"
                    value={size.id}
                    // Uncontrolled: React 19 resets the form after each action, back to defaultChecked,
                    // so the chosen size stays checked. The radios also post before the script loads.
                    defaultChecked={isSelected}
                    onChange={() => setSelectedId(size.id)}
                    aria-label={
                      size.available ? size.label : `${size.label}, esgotado`
                    }
                    className="sr-only"
                  />
                  <span
                    className={size.available ? "" : "text-muted line-through"}
                  >
                    {size.label}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {selected && (
          <p className="flex flex-wrap gap-x-3 text-sm">
            <span>Tamanho: {selected.label}</span>
            {selected.available && selected.lowStock && (
              <span className="font-medium text-sale">Últimas peças</span>
            )}
          </p>
        )}

        {state.status === "error" && (
          <p className="flex items-center gap-2 text-sm text-error">
            <AlertIcon className="size-4 shrink-0" />
            {state.message}
          </p>
        )}
        <p role="status" className="text-sm">
          {state.status === "added" ? state.message : ""}
        </p>

        {/* GER-02: the main button replaces the tabs, fixed at the bottom on phones. */}
        <div data-purchase-bar className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-background p-4 md:static md:border-0 md:p-0">
          <Button
            variant="primary"
            type="submit"
            disabled={blocked || pending}
            className="w-full"
          >
            {blocked ? "Esgotado" : "Adicionar à sacola"}
          </Button>
        </div>
      </form>
      {/* PRO-12, PRO-14: outside the purchase form, since the alert has its own form (forms cannot be nested). */}
      {blocked && (
        <RestockAlertCard
          size={selected && !selected.available ? selected : null}
          focusSizes={() => sizeGroup.current?.querySelector("input")?.focus()}
        />
      )}
    </>
  );
}
