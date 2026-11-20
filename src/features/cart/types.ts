import type { ShippingView } from "./views.ts";

export type AddToCartState = { status: "idle" | "added" | "error"; message: string | null; focusSizes: boolean };

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
export type RemoveState = {
  status: "idle" | "removed" | "error";
  removed: { productSizeId: string; quantity: number; name: string } | null;
  message: string | null;
  at: number;
};

// SAC-11 to SAC-15. "invalid": the API refused the code (a field error). "failed": our API failed (GER-06).
export type CouponState = { status: "idle" | "ok" | "invalid" | "failed"; code: string; message: string | null };
