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

const IDLE: RemoveState = { status: "idle", itemId: null, removed: null, message: null, at: 0 };
const LINK_BUTTON = "min-h-12 px-1 text-sm underline aria-disabled:text-muted";
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
  // Effects follow the removal by its `at`, not by the state object: the same removal sent back by the
  // server must not restart the 10 seconds nor move the focus again (SAC-05).
  const removedAt = removed?.at ?? 0;
  // A double tap must remove once: the second tap lands before React knows the first is pending.
  const removingNow = useRef(false);
  useEffect(() => {
    if (!removing) removingNow.current = false;
  }, [removing]);
  // The removed card unmounts with the focus: it goes to "Desfazer" (GER-07).
  const undoButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (removedAt) undoButton.current?.focus();
  }, [removedAt]);
  // A card that leaves without a new removal (already gone in another tab) takes the focus with it:
  // it goes to "Desfazer" if a notice is on screen, otherwise to the first "Remover" left.
  const list = useRef<HTMLUListElement>(null);
  const tappedItemId = useRef<string | null>(null);
  useEffect(() => {
    const id = tappedItemId.current;
    if (!id || items.some((i) => i.id === id)) return;
    tappedItemId.current = null;
    if (document.activeElement && document.activeElement !== document.body) return;
    (undoButton.current ?? list.current?.querySelector<HTMLButtonElement>("[data-remove]"))?.focus();
  }, [items]);

  useEffect(() => {
    if (!removedAt) return;
    const fade = setTimeout(() => setFadingAt(removedAt), FADE_AFTER_MS);
    const gone = setTimeout(() => setDismissedAt(removedAt), GONE_AFTER_MS);
    return () => {
      clearTimeout(fade);
      clearTimeout(gone);
    };
  }, [removedAt]);

  // A failed removal shows on its card; a failed undo has no card left, so it shows below the list.
  const removeError = removeState.status === "error" ? removeState : null;
  const restoreError = restoreState.status === "error" && restoreState.at > removeState.at ? restoreState.message : null;

  return (
    <>
      <ul ref={list} className="flex flex-col gap-3">
        {items.map((item, index) => (
          <li key={item.id}>
            <CartItemCard
              item={item}
              eager={index === 0}
              updateQuantity={updateQuantity}
              removeError={removeError?.itemId === item.id ? removeError.message : null}
            >
              <form
                action={removeAction}
                onSubmit={(event) => {
                  if (removingNow.current) {
                    event.preventDefault();
                    return;
                  }
                  removingNow.current = true;
                  tappedItemId.current = item.id;
                }}
              >
                <input type="hidden" name="itemId" value={item.id} />
                {/* Busy while a removal runs; aria-disabled keeps the focus (the guard above blocks the tap). */}
                <button type="submit" data-remove aria-disabled={removing} className={LINK_BUTTON}>
                  Remover
                </button>
              </form>
            </CartItemCard>
          </li>
        ))}
      </ul>
      {(restoreError || (removeError && !removeError.itemId)) && (
        <ErrorLine>{restoreError ?? removeError?.message}</ErrorLine>
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
            <button ref={undoButton} type="submit" disabled={restoring} className="min-h-12 px-2 underline">
              Desfazer
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function ErrorLine({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="flex items-center gap-2 text-sm text-error">
      <AlertIcon className="size-4 shrink-0" />
      {children}
    </p>
  );
}

function CartItemCard({
  item,
  eager,
  updateQuantity,
  removeError,
  children,
}: {
  item: CartItemView;
  removeError: string | null;
  // GER-08: the first photo is the largest content on screen; loading it lazily cost about 1.7 s on slow 4G.
  eager: boolean;
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
        <Image
          src={item.photoUrl}
          alt={item.photoAlt}
          fill
          sizes="5rem"
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          className="object-cover"
        />
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
              // aria-disabled, not disabled: a disabled button would drop the keyboard focus (GER-07).
              const submitter = (event.nativeEvent as SubmitEvent).submitter;
              if (submitting.current || submitter?.getAttribute("aria-disabled") === "true") {
                event.preventDefault();
                return;
              }
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
                // At the limit the button sends no quantity, so a tap before the script loads changes nothing.
                name={item.quantity > 1 ? "quantity" : undefined}
                value={item.quantity - 1}
                aria-label="Diminuir"
                aria-disabled={pending || item.quantity <= 1}
                className="size-12 rounded-control text-xl aria-disabled:text-line"
              >
                −
              </button>
              <output className="min-w-5 text-center tabular-nums">{item.quantity}</output>
              <button
                type="submit"
                name={item.canIncrease ? "quantity" : undefined}
                value={item.quantity + 1}
                aria-label="Aumentar"
                aria-disabled={pending || !item.canIncrease}
                className="size-12 rounded-control text-xl aria-disabled:text-line"
              >
                +
              </button>
            </div>
          </form>
        )}
        {item.stockLimit && <p className="text-sm font-medium text-sale">{item.stockLimit}</p>}
        {state.message && <ErrorLine>{state.message}</ErrorLine>}
        {removeError && <ErrorLine>{removeError}</ErrorLine>}
        <div>{children}</div>
      </div>
    </article>
  );
}
