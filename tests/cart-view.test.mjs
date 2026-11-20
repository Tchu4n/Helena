// SAC-01, SAC-04, SAC-07, SAC-09 to SAC-11, SAC-16: the bag screens get only the fields they show, with texts ready.
import { test } from "node:test";
import assert from "node:assert/strict";
import { freeShippingText, stockLimitText, toCartPanelView, toCartView } from "../src/features/cart/views.ts";

const jacket = {
  id: "c0000000-0000-4000-8000-000000000001",
  productSizeId: "5a1e0000-0000-4000-8000-000000000002",
  slug: "jaqueta-sarja-verde",
  name: "Jaqueta sarja",
  color: "Verde",
  size: "M",
  photo: { url: "/placeholders/jacket.svg", altText: "Jaqueta sarja verde" },
  unitPrice: 19900,
  quantity: 1,
  maxQuantity: 3,
  subtotal: 19900,
  soldOut: false,
};

function cartWith(overrides = {}) {
  return {
    id: "9b2f6a10-0000-4000-8000-0000000000aa",
    items: [jacket],
    pieceCount: 1,
    subtotal: 19900,
    coupon: null,
    discount: 0,
    amountToFreeShipping: 10100,
    cep: null,
    deliveryOptions: [],
    chosenDelivery: null,
    shippingAmount: null,
    total: 19900,
    installmentPlan: { maxInstallments: 3, installmentAmount: 6633 },
    reservationExpiresAt: null,
    canCheckout: true,
    ...overrides,
  };
}

test("SAC-04 stock limit text", () => {
  assert.equal(stockLimitText(3), "Apenas 3 unidades restantes");
  assert.equal(stockLimitText(1), "Apenas 1 unidade restante");
});

test("SAC-04 + stops at maxQuantity", () => {
  const atLimit = toCartView(cartWith({ items: [{ ...jacket, quantity: 3, subtotal: 59700 }] })).items[0];
  assert.equal(atLimit.canIncrease, false);
  assert.equal(atLimit.stockLimit, "Apenas 3 unidades restantes");
  const below = toCartView(cartWith()).items[0];
  assert.equal(below.canIncrease, true);
  assert.equal(below.stockLimit, null);
});

test("SAC-02 item fields", () => {
  const item = toCartView(cartWith()).items[0];
  assert.equal(item.details, "Verde · M");
  assert.equal(item.price, "R$ 199,00");
  assert.equal(item.quantity, 1);
  assert.equal(item.photoAlt, "Jaqueta sarja verde");
});

test("SAC-09 amount left", () => {
  assert.equal(freeShippingText({ amountToFreeShipping: 5000, coupon: null }), "Faltam R$ 50,00 para o frete grátis");
  assert.equal(
    freeShippingText({ amountToFreeShipping: 1200, coupon: { code: "MARIA10", percent: 10 } }),
    "Com o cupom, faltam R$ 12,00 para o frete grátis",
  );
});

test("SAC-10 reached shows no line", () => {
  assert.equal(freeShippingText({ amountToFreeShipping: 0, coupon: null }), null);
});

test("SAC-10 free option and shipping line", () => {
  const view = toCartView(
    cartWith({
      cep: "01310100",
      amountToFreeShipping: 0,
      deliveryOptions: [
        { type: "courier", price: 2500, free: false, deliveryTime: "Chega hoje" },
        { type: "pac", price: 0, free: true, deliveryTime: "Chega em até 5 dias úteis" },
      ],
      chosenDelivery: "pac",
      shippingAmount: 0,
    }),
  );
  assert.deepEqual(
    view.deliveryOptions.map((o) => [o.type, o.label, o.price]),
    [
      ["courier", "Motoboy", "R$ 25,00"],
      ["pac", "PAC", "Grátis"],
    ],
  );
  assert.equal(view.shipping, "Grátis");
  assert.equal(view.shippingLabel, "PAC");
  assert.equal(view.freeShipping, null);
  assert.equal(toCartView(cartWith()).shipping, null);
});

test("SAC-07 sold-out message names the piece", () => {
  const striped = {
    ...jacket,
    id: "c0000000-0000-4000-8000-000000000002",
    name: "Camiseta listrada",
    color: "Azul",
    size: "P",
    soldOut: true,
    maxQuantity: 0,
  };
  const view = toCartView(cartWith({ items: [jacket, striped], canCheckout: false }));
  assert.equal(view.items[1].soldOut, true);
  assert.deepEqual(view.soldOutMessages, [
    { itemId: striped.id, text: "A peça Camiseta listrada (Azul · P) esgotou. Remova da sacola para finalizar a compra." },
  ]);
  assert.deepEqual(toCartView(cartWith()).soldOutMessages, []);
});

test("SAC-16 installments line", () => {
  assert.equal(
    toCartView(cartWith({ installmentPlan: { maxInstallments: 6, installmentAmount: 5000 } })).installments,
    "ou até 6x de R$ 50,00 sem juros",
  );
  assert.equal(
    toCartView(cartWith({ installmentPlan: { maxInstallments: 1, installmentAmount: 4990 } })).installments,
    "Pagamento à vista no PIX ou no cartão",
  );
});

test("SAC-11 coupon and discount", () => {
  const view = toCartView(cartWith({ coupon: { code: "MARIA10", percent: 10 }, discount: 2500 }));
  assert.deepEqual(view.coupon, { code: "MARIA10", text: "MARIA10 · 10% de desconto" });
  assert.equal(view.discount, "− R$ 25,00");
  const none = toCartView(cartWith());
  assert.equal(none.coupon, null);
  assert.equal(none.discount, null);
});

test("toCartView never carries the cart id", () => {
  const view = toCartView(cartWith());
  assert.equal("id" in view, false);
  assert.equal(JSON.stringify(view).includes("9b2f6a10-0000-4000-8000-0000000000aa"), false);
});

test("SAC-01 panel view", () => {
  const panel = toCartPanelView(cartWith({ pieceCount: 2, subtotal: 39800, items: [{ ...jacket, quantity: 2 }] }), jacket.productSizeId);
  assert.equal(panel.name, "Jaqueta sarja");
  assert.equal(panel.details, "Verde · Tamanho M · 1 peça");
  assert.equal(panel.price, "R$ 199,00");
  assert.equal(panel.subtotalLabel, "Subtotal (2 peças)");
  assert.equal(panel.subtotal, "R$ 398,00");
  assert.equal(panel.freeShipping, "Faltam R$ 101,00 para o frete grátis");
  assert.equal(toCartPanelView(cartWith(), jacket.productSizeId).subtotalLabel, "Subtotal (1 peça)");
  assert.equal(toCartPanelView(cartWith(), "00000000-0000-4000-8000-000000000000"), null);
});
