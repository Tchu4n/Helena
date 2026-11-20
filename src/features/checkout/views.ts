// Only the fields the checkout screens use go to components; the full API response never does.
// Amounts come ready from the API; the one division here is the per-installment text (CHK-19).
import type { components } from "../../lib/api-types.ts";
import { deliveryLabel, formatPrice, installmentText } from "../../lib/format.ts";
import type { CartView } from "../cart/index.ts";

type Order = components["schemas"]["Order"];
type OrderStatus = components["schemas"]["OrderStatus"];

export type SummaryView = {
  pieceCount: number;
  items: { name: string; details: string; photoUrl: string; photoAlt: string; price: string; quantity: number }[];
  subtotal: string;
  coupon: string | null;
  discount: string | null;
  shippingLabel: string | null; // "Frete (PAC)"
  shipping: string | null;
  deliveryTime: string | null;
  total: string;
  installments: string;
};

export type InstallmentOption = { value: number; text: string };

export type PaymentView = {
  number: string;
  total: string;
  totalCents: number;
  reservationExpiresAt: string | null;
  status: OrderStatus;
  installmentOptions: InstallmentOption[];
  summary: SummaryView;
  pix: { pixCode: string; qrCode: string } | null;
};

// Same wording as the bag (SAC-16).
const installmentsLine = (plan: Order["installmentPlan"]) => {
  const text = installmentText(plan);
  return text ? `ou ${text}` : "Pagamento à vista no PIX ou no cartão";
};

// CHK-11 on /checkout: the bag as the API last calculated it.
export function summaryFromCart(cart: CartView): SummaryView {
  const chosen = cart.deliveryOptions.find((o) => o.type === cart.chosenDelivery);
  return {
    pieceCount: cart.pieceCount,
    items: cart.items
      .filter((i) => !i.soldOut)
      .map(({ name, details, photoUrl, photoAlt, price, quantity }) => ({ name, details, photoUrl, photoAlt, price, quantity })),
    subtotal: cart.subtotal,
    coupon: cart.coupon?.code ?? null,
    discount: cart.discount,
    shippingLabel: cart.shippingLabel ? `Frete (${cart.shippingLabel})` : null,
    shipping: cart.shipping,
    deliveryTime: chosen?.deliveryTime ?? null,
    total: cart.total,
    installments: cart.installments,
  };
}

// CHK-11 on /checkout/pagamento: the order, frozen when payment started.
export function summaryFromOrder(order: Order): SummaryView {
  return {
    pieceCount: order.items.reduce((sum, i) => sum + i.quantity, 0),
    items: order.items.map((i) => ({
      name: i.name,
      details: `${i.color} · ${i.size}`,
      photoUrl: i.photo.url,
      photoAlt: i.photo.altText,
      price: formatPrice(i.unitPrice),
      quantity: i.quantity,
    })),
    subtotal: formatPrice(order.subtotal),
    coupon: order.coupon ?? null,
    discount: order.discount > 0 ? `− ${formatPrice(order.discount)}` : null,
    shippingLabel: `Frete (${deliveryLabel(order.delivery.type)})`,
    shipping: order.shippingAmount === 0 ? "Grátis" : formatPrice(order.shippingAmount),
    deliveryTime: order.delivery.deliveryTime,
    total: formatPrice(order.total),
    installments: installmentsLine(order.installmentPlan),
  };
}

// CHK-19: every option up to the order's limit, all interest-free.
export function installmentOptions(total: number, maxInstallments: number): InstallmentOption[] {
  return Array.from({ length: maxInstallments }, (_, i) => {
    const n = i + 1;
    return { value: n, text: `${n}x de ${formatPrice(Math.floor(total / n))} sem juros` };
  });
}

export function toPaymentView(order: Order): PaymentView {
  const pix = order.payment?.status === "pending" ? order.payment.pix : null;
  return {
    number: order.number,
    total: formatPrice(order.total),
    totalCents: order.total,
    reservationExpiresAt: order.reservationExpiresAt ?? null,
    status: order.status,
    installmentOptions: installmentOptions(order.total, order.installmentPlan.maxInstallments),
    summary: summaryFromOrder(order),
    pix: pix ? { pixCode: pix.pixCode, qrCode: pix.qrCode } : null,
  };
}
