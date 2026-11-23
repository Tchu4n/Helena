// Only the fields the order screens use go to components; CPF and phone never do, and the address only as
// one line when the API sent it to the account that bought it (PED-05, CTA-03).
import type { components } from "../../lib/api-types.ts";
import { formatPrice } from "../../lib/format.ts";

type Order = components["schemas"]["Order"];
type OrderSummary = components["schemas"]["OrderSummary"];

export type OrderView = {
  number: string;
  maskedEmail: string;
  paid: boolean;
  paymentMethod: string | null; // "PIX" | "Cartão de crédito · 2x"; null without an approved payment
  place: string; // "Entrega em São Paulo/SP"
  deliveryTime: string;
  steps: { label: string; done: boolean; date: string | null }[]; // always 4, in order (PED-03)
  currentStep: string | null;
  tracking: { code: string; link: string | null } | null; // PAC/Sedex with a code only (PED-04)
  inSupport: boolean;
  canReturn: boolean;
};

const STEP_LABELS = {
  payment_confirmed: "Pagamento confirmado",
  preparing: "Em separação",
  shipped: "Enviado",
  delivered: "Entregue",
} as const;

// CTA-03: the state of an order in "Meus pedidos" (PED-03 labels, PED-07).
const STATUS_LABELS: Record<OrderSummary["status"], string> = {
  awaiting_payment: "Aguardando pagamento",
  reservation_expired: "Cancelado",
  payment_confirmed: "Pagamento confirmado",
  preparing: "Em separação",
  shipped: "Enviado",
  delivered: "Entregue",
  support_in_progress: "Suporte em andamento",
};

export type MyOrderView = { number: string; date: string; total: string; status: string };

const fullDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" });

export function toMyOrderView(order: OrderSummary): MyOrderView {
  return { number: order.number, date: fullDate.format(new Date(order.createdAt)), total: formatPrice(order.total), status: STATUS_LABELS[order.status] };
}

// CTA-03: "Avenida Paulista, 1000, Apto 12 · Bela Vista · São Paulo/SP · CEP 01310-100"; null without the address.
export function addressLine(order: Order): string | null {
  const a = order.delivery.address;
  if (!a) return null;
  const street = [a.street, a.number, a.complement].filter(Boolean).join(", ");
  return `${street} · ${a.neighborhood} · ${a.city}/${a.state} · CEP ${a.cep.slice(0, 5)}-${a.cep.slice(5)}`;
}

const dayMonth = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });

function paymentMethod(payment: Order["payment"]): string | null {
  if (payment?.status !== "approved") return null;
  return payment.method === "pix" ? "PIX" : `Cartão de crédito · ${payment.installments ?? 1}x`;
}

export function toOrderView(order: Order): OrderView {
  const steps = order.steps.map((s) => ({
    label: STEP_LABELS[s.step],
    done: s.completedAt != null,
    date: s.completedAt ? dayMonth.format(new Date(s.completedAt)) : null,
  }));
  const { delivery } = order;
  return {
    number: order.number,
    maskedEmail: order.maskedEmail,
    paid: order.status !== "awaiting_payment" && order.status !== "reservation_expired",
    paymentMethod: paymentMethod(order.payment),
    place: `Entrega em ${delivery.city}/${delivery.state}`,
    deliveryTime: delivery.deliveryTime,
    steps,
    currentStep: steps.findLast((s) => s.done)?.label ?? null,
    tracking: delivery.type !== "courier" && delivery.trackingCode ? { code: delivery.trackingCode, link: delivery.trackingLink ?? null } : null,
    inSupport: order.status === "support_in_progress",
    canReturn: order.returnAvailability.allowed,
  };
}
