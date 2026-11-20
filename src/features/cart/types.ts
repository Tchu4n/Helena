import type { CartPanelView, ShippingView } from "./views.ts";

// SAC-01: `panel` is what the panel shows after a successful add. `at` is when this answer came,
// for every answer (an add or an error), so a screen can tell answers apart (a fresh panel per add).
export type AddToCartState = {
  status: "idle" | "added" | "error";
  message: string | null;
  focusSizes: boolean;
  panel: CartPanelView | null;
  at: number;
};

export type ShippingState = {
  // "invalid": the CEP typed is wrong (a field error). "failed": our API failed (GER-06).
  status: "idle" | "ok" | "invalid" | "failed";
  cep: string;
  message: string | null;
  shipping: ShippingView | null;
};

// SAC-04: the message belongs to the item it came from.
export type ItemActionState = { itemId: string | null; message: string | null };

// SAC-05: `at` tells one removal from the next, so each one gets its own 10-second notice.
// `itemId` says which card an error belongs to (GER-06: the message shows next to its control).
export type RemoveState = {
  status: "idle" | "removed" | "error";
  itemId: string | null;
  removed: { productSizeId: string; quantity: number; name: string } | null;
  message: string | null;
  at: number;
};

// SAC-11 to SAC-15. "invalid": the API refused the code (a field error). "failed": our API failed (GER-06).
export type CouponState = { status: "idle" | "ok" | "invalid" | "failed"; code: string; message: string | null };

// SAC-07: one message per sold-out piece, or `error` when our API failed (GER-06).
export type CheckoutState = { messages: { itemId: string; text: string }[]; error: string | null };
