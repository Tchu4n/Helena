"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/src/components/ui/Button.tsx";
import { AlertIcon, PlusIcon } from "@/src/components/ui/icons.tsx";
import { Sheet } from "@/src/components/ui/Sheet.tsx";
import { CartPanel, type AddToCartState } from "@/src/features/cart/client";
import type { CardProduct } from "../views.ts";

type Props = {
  product: Pick<CardProduct, "name" | "sizes">;
  addToCart: (prev: AddToCartState, formData: FormData) => Promise<AddToCartState>;
};

const INITIAL: AddToCartState = { status: "idle", message: null, focusSizes: false, panel: null, at: 0 };

// CAT-08: pick the size on the card and add, as in PRO-07; then the SAC-01 panel takes the picker's place.
// Answers are told apart by `state.at` (the server's clock), never by the browser's clock.
export function QuickBuy({ product, addToCart }: Props) {
  const [state, formAction, pending] = useActionState(addToCart, INITIAL);
  // The answer already seen when the picker opened; only newer answers belong to this picker.
  const [openedAt, setOpenedAt] = useState<number | null>(null);
  const [closedAt, setClosedAt] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const backToCard = () => trigger.current?.focus();

  const answer = openedAt !== null && state.at > openedAt ? state : null;
  const showPanel = state.panel !== null && state.at > closedAt;
  const showPicker = openedAt !== null && answer?.status !== "added";

  return (
    <>
      {/* A layer the size of the photo puts the button on its bottom right; taps elsewhere still reach the link. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex aspect-[3/4] items-end justify-end p-2">
        <button
          ref={trigger}
          type="button"
          aria-label={`Adicionar ${product.name} à sacola`}
          onClick={() => setOpenedAt(state.at)}
          className="pointer-events-auto flex size-12 items-center justify-center rounded-control border border-control bg-card text-primary"
        >
          <PlusIcon className="size-5" />
        </button>
      </div>
      {showPicker && (
        <SizePicker
          product={product}
          action={formAction}
          pending={pending}
          answer={answer}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onClose={() => {
            setOpenedAt(null);
            backToCard();
          }}
        />
      )}
      {showPanel && state.panel && (
        <CartPanel
          key={state.at}
          panel={state.panel}
          onClose={() => {
            setClosedAt(state.at);
            setOpenedAt(null);
            backToCard();
          }}
        />
      )}
    </>
  );
}

type PickerProps = {
  product: Props["product"];
  action: (formData: FormData) => void;
  pending: boolean;
  answer: AddToCartState | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
};

function SizePicker({ product, action, pending, answer, selectedId, onSelect, onClose }: PickerProps) {
  const sizeGroup = useRef<HTMLFieldSetElement>(null);
  // A double tap must add one piece only: the API adds quantities up (PRO-07).
  const submitting = useRef(false);
  useEffect(() => {
    if (!pending) submitting.current = false;
  }, [pending]);
  // PRO-05: no size chosen sends focus to the sizes.
  useEffect(() => {
    if (answer?.focusSizes) sizeGroup.current?.querySelector<HTMLInputElement>("input:not(:disabled)")?.focus();
  }, [answer]);

  const selected = product.sizes.find((s) => s.id === selectedId) ?? null;

  return (
    <Sheet title="Escolha o tamanho" onClose={onClose}>
      <form
        action={action}
        onSubmit={(event) => {
          if (submitting.current) event.preventDefault();
          submitting.current = true;
        }}
        className="flex flex-col gap-4"
      >
        <p className="text-[0.9375rem]">{product.name}</p>
        <fieldset ref={sizeGroup} className="flex flex-wrap gap-2">
          <legend className="sr-only">Tamanho</legend>
          {product.sizes.map((size) => (
            <label
              key={size.id}
              className={`inline-flex min-h-12 min-w-12 items-center justify-center rounded-control border border-control px-4 text-sm has-checked:border-4 has-checked:border-double has-checked:border-primary has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary ${
                size.available ? "cursor-pointer" : ""
              }`}
            >
              <input
                type="radio"
                name="productSizeId"
                value={size.id}
                disabled={!size.available}
                // Uncontrolled: React resets the form after the action, back to defaultChecked, so the size stays.
                defaultChecked={size.id === selectedId}
                onChange={() => onSelect(size.id)}
                aria-label={size.available ? size.label : `${size.label}, esgotado`}
                className="sr-only"
              />
              <span className={size.available ? "" : "text-muted line-through"}>{size.label}</span>
            </label>
          ))}
        </fieldset>
        {selected?.available && selected.lowStock && <p className="text-sm font-medium text-sale">Últimas peças</p>}
        {answer?.status === "error" && (
          <p role="alert" className="flex items-center gap-2 text-sm text-error">
            <AlertIcon className="size-4 shrink-0" />
            {answer.message}
          </p>
        )}
        <Button variant="primary" type="submit" disabled={pending}>
          Adicionar à sacola
        </Button>
      </form>
    </Sheet>
  );
}
