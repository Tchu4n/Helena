// Only the fields the screen uses go to components; the full API response never does.
import type { components } from "../../lib/api-types.ts";
import { formatPrice } from "../../lib/format.ts";

type ShippingQuote = components["schemas"]["ShippingQuote"];
type DeliveryType = components["schemas"]["DeliveryType"];

const DELIVERY_LABELS: Record<DeliveryType, string> = { courier: "Motoboy", pac: "PAC", sedex: "Sedex" };

export type ShippingView = {
  city: string;
  state: string;
  options: { label: string; price: string; free: boolean; deliveryTime: string }[];
};

export function toShippingView(quote: ShippingQuote): ShippingView {
  return {
    city: quote.city,
    state: quote.state,
    options: quote.options.map((o) => ({
      label: DELIVERY_LABELS[o.type],
      price: o.free ? "Grátis" : formatPrice(o.price),
      free: o.free,
      deliveryTime: o.deliveryTime,
    })),
  };
}
