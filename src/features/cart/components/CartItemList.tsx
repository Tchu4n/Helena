"use client";

import Image from "next/image";
import { useActionState, useEffect, useRef, useState } from "react";
import { Badge } from "@/src/components/ui/Badge.tsx";
import { AlertIcon } from "@/src/components/ui/icons.tsx";
import type { ItemActionState, RemoveState } from "../types.ts";
import type { CartItemView } from "../views.ts";

type Action<S> = (prev: S, formData: FormData) => Promise<S>;
type Props = {
  items: CartItemView[];
  updateQuantity: Action<ItemActionState>;
  removeItem: Action<RemoveState>;
  restoreItem: Action<RemoveState>;
};

const IDLE: RemoveState = { status: "idle", removed: null, message: null, at: 0 };
const LINK_BUTTON = "min-h-12 px-1 text-sm underline disabled:text-muted";
// SAC-05: visible for 7 s, then fades for 3 s, 10 s in all.
const FADE_AFTER_MS = 7_000;
const GONE_AFTER_MS = 10_000;

// SAC-02, SAC-04, SAC-05, SAC-07. Removal lives here, above the cards, because the removed card unmounts.
export function CartItemList({ items, updateQuantity, removeItem, restoreItem }: Props) {
  const [removeState, removeAction, removing] = useActionState(removeItem, IDLE);
  const [restoreState, restoreAction, restoring] = useActionState(restoreItem, IDLE);
  // The notice of a removal shows until its own `at` is dismissed or faded out.
  const [dismissedAt, setDismissedAt] = useState(0);
  const [fadingAt, setFadingAt] = useState(0);

  const removed = removeState.status === "removed" ? removeState : null;
  const showNotice = removed !== null && dismissedAt !== removed.at;

  useEffect(() => {
    if (!removed) return;
    const fade = setTimeout(() => setFadingAt(removed.at), FADE_AFTER_MS);
    const gone = setTimeout(() => setDismissedAt(removed.at), GONE_AFTER_MS);
    return () => {
      clearTimeout(fade);
      clearTimeout(gone);
    };
  }, [removed]);

  const error =
    (removeState.status === "error" ? removeState.message : null) ??
    (restoreState.status === "error" && restoreState.at > removeState.at ? restoreState.message : null);

  return (
    <>
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.id}>
            <CartItemCard item={item} updateQuantity={updateQuantity}>
              <form action={removeAction}>
                <input type="hidden" name="itemId" value={item.id} />
                <button type="submit" disabled={removing} data-remove className={LINK_BUTTON}>
                  Remover
                </button>
              </form>
            </CartItemCard>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="flex items-center gap-2 text-sm text-error">
          <AlertIcon className="size-4 shrink-0" />
          {error}
        </p>
      )}
      {showNotice && (
        <div
          role="status"
          className={`fixed inset-x-4 bottom-[calc(var(--bottom-bar)+1rem)] z-20 flex items-center justify-between gap-3 bg-primary py-1 pr-2 pl-4 text-[0.9375rem] text-background transition-opacity duration-[3000ms] ease-linear md:inset-x-auto md:right-4 md:w-96 ${
            fadingAt === removed.at ? "opacity-0" : "opacity-100"
          }`}
        >
          <span>{removed.removed?.name} removida</span>
          <form action={restoreAction} onSubmit={() => setDismissedAt(removed.at)}>
            <input type="hidden" name="productSizeId" value={removed.removed?.productSizeId} />
            <input type="hidden" name="quantity" value={removed.removed?.quantity} />
            <button type="submit" disabled={restoring} className="min-h-12 px-2 underline">
              Desfazer
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function CartItemCard({
  item,
  updateQuantity,
  children,
}: {
  item: CartItemView;
  updateQuantity: Action<ItemActionState>;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(updateQuantity, { itemId: null, message: null });
  // A double tap must change the quantity once: the second tap lands before the button is disabled.
  const submitting = useRef(false);
  useEffect(() => {
    if (!pending) submitting.current = false;
  }, [pending]);

  return (
    <article id={`cart-item-${item.id}`} aria-label={item.name} className="grid grid-cols-[5rem_1fr] gap-3.5 bg-card p-4">
      <div className={`relative aspect-[3/4] bg-surface ${item.soldOut ? "opacity-55" : ""}`}>
        <Image src={item.photoUrl} alt={item.photoAlt} fill sizes="5rem" className="object-cover" />
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className={item.soldOut ? "text-muted" : ""}>{item.name}</span>
        <span className="text-sm text-muted">{item.details}</span>
        <span className="tabular-nums">{item.price}</span>
        {item.soldOut ? (
          <div className="mt-1.5 flex flex-col items-start gap-1">
            <Badge tone="neutral">Esgotada</Badge>
            <p className="text-sm text-muted">Esgotou depois que entrou na sacola. Fica fora do total.</p>
          </div>
        ) : (
          <form
            action={formAction}
            onSubmit={(event) => {
              if (submitting.current) event.preventDefault();
              submitting.current = true;
            }}
            className="mt-1.5"
          >
            <input type="hidden" name="itemId" value={item.id} />
            <div
              role="group"
              aria-label={`Quantidade de ${item.name}`}
              className="inline-flex items-center rounded-control border border-control"
            >
              <button
                type="submit"
                name="quantity"
                value={item.quantity - 1}
                aria-label="Diminuir"
                disabled={pending || item.quantity <= 1}
                className="size-12 rounded-control text-xl disabled:text-line"
              >
                −
              </button>
              <output className="min-w-5 text-center tabular-nums">{item.quantity}</output>
              <button
                type="submit"
                name="quantity"
                value={item.quantity + 1}
                aria-label="Aumentar"
                disabled={pending || !item.canIncrease}
                className="size-12 rounded-control text-xl disabled:text-line"
              >
                +
              </button>
            </div>
          </form>
        )}
        {item.stockLimit && <p className="text-sm font-medium text-sale">{item.stockLimit}</p>}
        {state.message && (
          <p role="alert" className="flex items-center gap-2 text-sm text-error">
            <AlertIcon className="size-4 shrink-0" />
            {state.message}
          </p>
        )}
        <div>{children}</div>
      </div>
    </article>
  );
}
