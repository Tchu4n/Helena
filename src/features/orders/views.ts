// Only the fields the order screens use go to components; CPF, phone and address never do (PED-05).
import type { components } from "../../lib/api-types.ts";

type Order = components["schemas"]["Order"];

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
