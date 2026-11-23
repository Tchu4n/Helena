// PED-01, PED-03 to PED-08: the order screens get only the fields they show, with texts ready.
import { test } from "node:test";
import assert from "node:assert/strict";
import { addressLine, toMyOrderView, toOrderView } from "../src/features/orders/views.ts";

const order = {
  number: "HL-100482",
  createdAt: "2026-11-22T12:50:00.000Z",
  status: "preparing",
  steps: [
    { step: "payment_confirmed", completedAt: "2026-11-22T13:00:00.000Z" },
    { step: "preparing", completedAt: "2026-11-23T02:30:00.000Z" },
    { step: "shipped", completedAt: null },
    { step: "delivered", completedAt: null },
  ],
  items: [{ name: "Jaqueta sarja", color: "Verde", size: "M", photo: { url: "/j.svg", altText: "Jaqueta" }, unitPrice: 19900, quantity: 1 }],
  subtotal: 19900,
  coupon: null,
  discount: 0,
  shippingAmount: 2000,
  total: 21900,
  installmentPlan: { maxInstallments: 4, installmentAmount: 5475 },
  reservationExpiresAt: null,
  payment: { id: "8f0c1e2a-0000-4000-8000-000000000001", method: "card", status: "approved", installments: 2 },
  delivery: {
    type: "pac",
    deliveryTime: "Chega em até 5 dias úteis",
    city: "São Paulo",
    state: "SP",
    address: { street: "Avenida Paulista" },
    trackingCode: null,
    trackingLink: null,
    deliveredAt: null,
  },
  maskedEmail: "m***a@exemplo.com",
  return: null,
  returnAvailability: { allowed: false, deadline: null, reason: "order_not_delivered" },
};

const KEYS = ["number", "maskedEmail", "paid", "paymentMethod", "place", "deliveryTime", "steps", "currentStep", "tracking", "inSupport", "canReturn"];

test("PED-03 four steps in order, done ones dated dd/mm in São Paulo, current step in text", () => {
  const view = toOrderView(order);
  assert.deepEqual(view.steps, [
    { label: "Pagamento confirmado", done: true, date: "22/11" },
    { label: "Em separação", done: true, date: "22/11" }, // 02:30 UTC on the 23rd is 23:30 on the 22nd in São Paulo
    { label: "Enviado", done: false, date: null },
    { label: "Entregue", done: false, date: null },
  ]);
  assert.equal(view.currentStep, "Em separação");
});

test("PED-01 payment method text", () => {
  assert.equal(toOrderView(order).paymentMethod, "Cartão de crédito · 2x");
  assert.equal(toOrderView({ ...order, payment: { ...order.payment, method: "pix", installments: null } }).paymentMethod, "PIX");
  assert.equal(toOrderView({ ...order, payment: null }).paymentMethod, null);
  assert.equal(toOrderView({ ...order, payment: { ...order.payment, status: "declined" } }).paymentMethod, null);
});

test("PED-05 place is city/state, delivery time as sent", () => {
  const view = toOrderView(order);
  assert.equal(view.place, "Entrega em São Paulo/SP");
  assert.equal(view.deliveryTime, "Chega em até 5 dias úteis");
  assert.equal(view.number, "HL-100482");
  assert.equal(view.maskedEmail, "m***a@exemplo.com");
});

test("PED-04 tracking only for PAC/Sedex with a code", () => {
  const shipped = { ...order.delivery, trackingCode: "AA123456789BR", trackingLink: "https://rastreio.exemplo/AA123456789BR" };
  assert.deepEqual(toOrderView({ ...order, delivery: shipped }).tracking, {
    code: "AA123456789BR",
    link: "https://rastreio.exemplo/AA123456789BR",
  });
  assert.deepEqual(toOrderView({ ...order, delivery: { ...shipped, type: "sedex", trackingLink: null } }).tracking, {
    code: "AA123456789BR",
    link: null,
  });
  assert.equal(toOrderView({ ...order, delivery: { ...shipped, type: "courier" } }).tracking, null);
  assert.equal(toOrderView(order).tracking, null);
});

test("PED-07 support in progress, PED-08 return allowed", () => {
  assert.equal(toOrderView(order).inSupport, false);
  assert.equal(toOrderView({ ...order, status: "support_in_progress" }).inSupport, true);
  assert.equal(toOrderView(order).canReturn, false);
  assert.equal(toOrderView({ ...order, returnAvailability: { allowed: true } }).canReturn, true);
});

test("paid is false only while awaiting payment or after the reservation expired", () => {
  for (const status of ["awaiting_payment", "reservation_expired"]) assert.equal(toOrderView({ ...order, status }).paid, false, status);
  for (const status of ["payment_confirmed", "preparing", "shipped", "delivered", "support_in_progress"])
    assert.equal(toOrderView({ ...order, status }).paid, true, status);
});

test("no step done: currentStep is null", () => {
  const steps = order.steps.map((s) => ({ ...s, completedAt: null }));
  assert.equal(toOrderView({ ...order, status: "awaiting_payment", steps }).currentStep, null);
});

test("PED-05 the view carries no CPF, phone or address", () => {
  assert.deepEqual(Object.keys(toOrderView(order)).sort(), [...KEYS].sort());
  assert.doesNotMatch(JSON.stringify(toOrderView(order)), /Paulista/);
});

test("CTA-03 the address line, only when the API sends the address (signed in)", () => {
  const full = { ...order, delivery: { ...order.delivery, address: { cep: "01310100", street: "Avenida Paulista", number: "1000", complement: null, neighborhood: "Bela Vista", city: "São Paulo", state: "SP" } } };
  assert.equal(addressLine(full), "Avenida Paulista, 1000 · Bela Vista · São Paulo/SP · CEP 01310-100");
  assert.equal(addressLine({ ...full, delivery: { ...full.delivery, address: { ...full.delivery.address, complement: "Apto 12" } } }), "Avenida Paulista, 1000, Apto 12 · Bela Vista · São Paulo/SP · CEP 01310-100");
  const withoutAddress = { ...order.delivery, address: undefined };
  assert.equal(addressLine({ ...order, delivery: withoutAddress }), null);
});

test("CTA-03 an order in the list: number, date dd/mm/yyyy in São Paulo, total and state in Portuguese", () => {
  assert.deepEqual(toMyOrderView({ number: "HL-100482", createdAt: "2026-11-23T02:30:00.000Z", status: "awaiting_payment", total: 21900 }), {
    number: "HL-100482",
    date: "22/11/2026",
    total: "R$\u00a0219,00", // formatPrice puts a no-break space after R$
    status: "Aguardando pagamento",
  });
  const label = (status) => toMyOrderView({ number: "HL-1", createdAt: "2026-11-22T12:00:00.000Z", status, total: 0 }).status;
  assert.equal(label("reservation_expired"), "Cancelado");
  assert.equal(label("payment_confirmed"), "Pagamento confirmado");
  assert.equal(label("preparing"), "Em separação");
  assert.equal(label("shipped"), "Enviado");
  assert.equal(label("delivered"), "Entregue");
  assert.equal(label("support_in_progress"), "Suporte em andamento");
});
