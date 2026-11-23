// Only the fields the screen uses go to components; the full API response never does.
// Amounts come ready from the API: nothing here recalculates them.
import type { components } from "../../lib/api-types.ts";
import { deliveryLabel, formatPrice, installmentText } from "../../lib/format.ts";

type Cart = components["schemas"]["Cart"];
type CartItem = components["schemas"]["CartItem"];
type DeliveryOption = components["schemas"]["DeliveryOption"];
type ShippingQuote = components["schemas"]["ShippingQuote"];
type DeliveryType = components["schemas"]["DeliveryType"];

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
      label: deliveryLabel(o.type),
      price: o.free ? "Grátis" : formatPrice(o.price),
      free: o.free,
      deliveryTime: o.deliveryTime,
    })),
  };
}

export type CartItemView = {
  id: string;
  name: string;
  details: string;
  photoUrl: string;
  photoAlt: string;
  price: string;
  quantity: number;
  canIncrease: boolean;
  stockLimit: string | null;
  soldOut: boolean;
};

export type DeliveryOptionView = { type: DeliveryType; label: string; price: string; free: boolean; deliveryTime: string };

export type CartView = {
  pieceCount: number;
  items: CartItemView[];
  subtotal: string;
  coupon: { code: string; text: string } | null;
  discount: string | null;
  freeShipping: string | null;
  cep: string | null;
  deliveryOptions: DeliveryOptionView[];
  chosenDelivery: DeliveryType | null;
  shipping: string | null;
  shippingLabel: string | null;
  total: string;
  installments: string;
  soldOutMessages: { itemId: string; text: string }[];
  reservationExpiresAt: string | null;
  verifiedEmail: string | null; // IDT-03: the e-mail confirmed with the code for this bag
};

export type CartPanelView = {
  name: string;
  details: string;
  photoUrl: string;
  photoAlt: string;
  price: string;
  freeShipping: string | null;
  subtotalLabel: string;
  subtotal: string;
};

const pieces = (n: number) => `${n} ${n === 1 ? "peça" : "peças"}`;

// SAC-04.
export function stockLimitText(max: number): string {
  return `Apenas ${max} ${max === 1 ? "unidade restante" : "unidades restantes"}`;
}

// SAC-09, SAC-14. null once free shipping is reached: the cheapest option just shows "Grátis" (owner, 2026-11-19).
export function freeShippingText(cart: Pick<Cart, "amountToFreeShipping" | "coupon">): string | null {
  if (cart.amountToFreeShipping <= 0) return null;
  return `${cart.coupon ? "Com o cupom, faltam" : "Faltam"} ${formatPrice(cart.amountToFreeShipping)} para o frete grátis`;
}

function toItemView(item: CartItem): CartItemView {
  const atLimit = !item.soldOut && item.quantity >= item.maxQuantity;
  return {
    id: item.id,
    name: item.name,
    details: `${item.color} · ${item.size}`,
    photoUrl: item.photo.url,
    photoAlt: item.photo.altText,
    price: formatPrice(item.unitPrice),
    quantity: item.quantity,
    canIncrease: !item.soldOut && item.quantity < item.maxQuantity,
    stockLimit: atLimit ? stockLimitText(item.maxQuantity) : null,
    soldOut: item.soldOut,
  };
}

function toDeliveryOptionView(o: DeliveryOption): DeliveryOptionView {
  return {
    type: o.type,
    label: deliveryLabel(o.type),
    price: o.free ? "Grátis" : formatPrice(o.price),
    free: o.free,
    deliveryTime: o.deliveryTime,
  };
}

// SAC-17: the reservation time only while she has an order being paid (its cookie); a bag change ends it.
export function toCartView(cart: Cart, hasOrder = false): CartView {
  const options = cart.deliveryOptions ?? [];
  const chosen = options.find((o) => o.type === cart.chosenDelivery);
  const installments = installmentText(cart.installmentPlan);
  return {
    pieceCount: cart.pieceCount,
    items: cart.items.map(toItemView),
    subtotal: formatPrice(cart.subtotal),
    coupon: cart.coupon ? { code: cart.coupon.code, text: `${cart.coupon.code} · ${cart.coupon.percent}% de desconto` } : null,
    discount: cart.discount > 0 ? `− ${formatPrice(cart.discount)}` : null,
    freeShipping: freeShippingText(cart),
    cep: cart.cep ?? null,
    deliveryOptions: options.map(toDeliveryOptionView),
    chosenDelivery: cart.chosenDelivery ?? null,
    shipping: cart.shippingAmount == null ? null : chosen?.free ? "Grátis" : formatPrice(cart.shippingAmount),
    shippingLabel: chosen ? deliveryLabel(chosen.type) : null,
    total: formatPrice(cart.total),
    installments: installments ? `ou ${installments}` : "Pagamento à vista no PIX ou no cartão",
    // SAC-07: shown when she taps "Finalizar compra" with these pieces still in the bag.
    soldOutMessages: cart.items
      .filter((i) => i.soldOut)
      .map((i) => ({
        itemId: i.id,
        text: `A peça ${i.name} (${i.color} · ${i.size}) esgotou. Remova da sacola para finalizar a compra.`,
      })),
    reservationExpiresAt: hasOrder ? (cart.reservationExpiresAt ?? null) : null,
    verifiedEmail: cart.verifiedEmail ?? null,
  };
}

// SAC-01: the piece just added (one unit), plus the bag's subtotal and what is missing for free shipping.
export function toCartPanelView(cart: Cart, productSizeId: string): CartPanelView | null {
  const item = cart.items.find((i) => i.productSizeId === productSizeId);
  if (!item) return null;
  return {
    name: item.name,
    details: `${item.color} · Tamanho ${item.size} · 1 peça`,
    photoUrl: item.photo.url,
    photoAlt: item.photo.altText,
    price: formatPrice(item.unitPrice),
    freeShipping: freeShippingText(cart),
    subtotalLabel: `Subtotal (${pieces(cart.pieceCount)})`,
    subtotal: formatPrice(cart.subtotal),
  };
}
