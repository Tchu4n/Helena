import type { ShippingView } from "./views.ts";

export type AddToCartState = { status: "idle" | "added" | "error"; message: string | null; focusSizes: boolean };

export type ShippingState = {
  // "invalid": the CEP typed is wrong (a field error). "failed": our API failed (GER-06).
  status: "idle" | "ok" | "invalid" | "failed";
  cep: string;
  message: string | null;
  shipping: ShippingView | null;
};
