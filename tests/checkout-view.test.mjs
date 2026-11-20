// CHK-11, CHK-19: the checkout screens get only the fields they show, with texts ready.
import { test } from "node:test";
import assert from "node:assert/strict";
import { installmentOptions, summaryFromCart, summaryFromOrder, toPaymentView } from "../src/features/checkout/views.ts";

const nb = (s) => s.replaceAll("R$ ", "R$\u00a0"); // formatPrice puts a no-break space after R$

test("CHK-19 R$ 150,00 offers exactly 1x, 2x and 3x, all sem juros", () => {
  assert.deepEqual(
    installmentOptions(15000, 3).map((o) => o.text),
    ["1x de R$ 150,00 sem juros", "2x de R$ 75,00 sem juros", "3x de R$ 50,00 sem juros"].map(nb),
  );
  assert.deepEqual(installmentOptions(15000, 3).map((o) => o.value), [1, 2, 3]);
});

test("installment text rounds down to the cent", () => {
  assert.equal(installmentOptions(10001, 2)[1].text, nb("2x de R$ 50,00 sem juros"));
});

const order = {
  number: "HL-100001",
  createdAt: "2026-11-20T12:00:00.000Z",
  status: "awaiting_payment",
  steps: [],
  items: [
    { name: "Jaqueta sarja", color: "Verde", size: "M", photo: { url: "/j.svg", altText: "Jaqueta" }, unitPrice: 19900, quantity: 1 },
    { name: "Camiseta básica", color: "Off-white", size: "P", photo: { url: "/c.svg", altText: "Camiseta" }, unitPrice: 11900, quantity: 2 },
  ],
  subtotal: 31800,
  coupon: "MARIA10",
  discount: 3180,
  shippingAmount: 2000,
  total: 30620,
  installmentPlan: { maxInstallments: 6, installmentAmount: 5103 },
  reservationExpiresAt: "2026-11-20T12:15:00.000Z",
  payment: null,
  delivery: { type: "pac", deliveryTime: "Chega em até 5 dias úteis", city: "São Paulo", state: "SP" },
  maskedEmail: "m***a@exemplo.com",
  return: null,
  returnAvailability: { allowed: false },
};

test("CHK-11 summaryFromOrder", () => {
  assert.deepEqual(summaryFromOrder(order), {
    pieceCount: 3,
    items: [
      { name: "Jaqueta sarja", details: "Verde · M", photoUrl: "/j.svg", photoAlt: "Jaqueta", price: nb("R$ 199,00"), quantity: 1 },
      { name: "Camiseta básica", details: "Off-white · P", photoUrl: "/c.svg", photoAlt: "Camiseta", price: nb("R$ 119,00"), quantity: 2 },
    ],
    subtotal: nb("R$ 318,00"),
    coupon: "MARIA10",
    discount: nb("− R$ 31,80"),
    shippingLabel: "Frete (PAC)",
    shipping: nb("R$ 20,00"),
    deliveryTime: "Chega em até 5 dias úteis",
    total: nb("R$ 306,20"),
    installments: nb("ou até 6x de R$ 51,03 sem juros"),
  });
});

test("summaryFromOrder: free shipping shows Grátis, no coupon shows no discount", () => {
  const s = summaryFromOrder({ ...order, coupon: null, discount: 0, shippingAmount: 0 });
  assert.equal(s.shipping, "Grátis");
  assert.equal(s.discount, null);
  assert.equal(s.coupon, null);
});

test("CHK-11 summaryFromCart takes the bag's own shipping and leaves sold-out pieces out", () => {
  const cart = {
    pieceCount: 1,
    items: [
      { id: "1", name: "Jaqueta sarja", details: "Verde · M", photoUrl: "/j.svg", photoAlt: "Jaqueta", price: "R$ 199,00", quantity: 1, canIncrease: true, stockLimit: null, soldOut: false },
      { id: "2", name: "Boné", details: "Preto · U", photoUrl: "/b.svg", photoAlt: "Boné", price: "R$ 79,00", quantity: 1, canIncrease: false, stockLimit: null, soldOut: true },
    ],
    subtotal: "R$ 199,00",
    coupon: null,
    discount: null,
    freeShipping: null,
    cep: "01310100",
    deliveryOptions: [{ type: "pac", label: "PAC", price: "R$ 20,00", free: false, deliveryTime: "Chega em até 5 dias úteis" }],
    chosenDelivery: "pac",
    shipping: "R$ 20,00",
    shippingLabel: "PAC",
    total: "R$ 219,00",
    installments: "ou até 4x de R$ 54,75 sem juros",
    soldOutMessages: [],
  };
  const s = summaryFromCart(cart);
  assert.equal(s.items.length, 1);
  assert.equal(s.pieceCount, 1);
  assert.equal(s.shippingLabel, "Frete (PAC)");
  assert.equal(s.deliveryTime, "Chega em até 5 dias úteis");
  assert.equal(s.total, "R$ 219,00");
  assert.equal(summaryFromCart({ ...cart, chosenDelivery: null, shipping: null, shippingLabel: null }).shippingLabel, null);
});

test("toPaymentView", () => {
  const v = toPaymentView({
    ...order,
    payment: { id: "p", method: "pix", status: "pending", installments: null, message: null, pix: { pixCode: "000201", qrCode: "data:image/png;base64,x", expiresAt: "2026-11-20T12:15:00.000Z" } },
  });
  assert.equal(v.number, "HL-100001");
  assert.equal(v.total, nb("R$ 306,20"));
  assert.equal(v.totalCents, 30620);
  assert.equal(v.reservationExpiresAt, "2026-11-20T12:15:00.000Z");
  assert.equal(v.installmentOptions.length, 6);
  assert.deepEqual(v.pix, { pixCode: "000201", qrCode: "data:image/png;base64,x" });
  assert.equal(toPaymentView({ ...order, payment: { id: "p", method: "card", status: "declined", installments: 1, message: "x", pix: null } }).pix, null);
});
