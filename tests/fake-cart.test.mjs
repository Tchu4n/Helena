import { test } from "node:test";
import assert from "node:assert/strict";
import { cartTotals } from "./e2e/fake-cart.mjs";

const option = (type, price) => ({ type, price, free: false, deliveryTime: "x" });
const quote = { options: [option("courier", 2500), option("pac", 2000), option("sedex", 3500)] };
const totals = (items, couponPercent, chosen = "pac") =>
  cartTotals({ lines: [{ unitPrice: items, quantity: 1, soldOut: false }], couponPercent, quote, chosen });
const pac = (t) => t.deliveryOptions.find((o) => o.type === "pac");

test("section 2: R$ 320,00 without coupon, free shipping", () => {
  const t = totals(32000, 0);
  assert.equal(t.discount, 0);
  assert.equal(pac(t).free, true);
  assert.equal(t.shippingAmount, 0);
  assert.equal(t.total, 32000);
  assert.equal(t.amountToFreeShipping, 0);
});
test("section 2: R$ 320,00 with MARIA10 drops below the free shipping line", () => {
  const t = totals(32000, 10);
  assert.equal(t.discount, 3200);
  assert.equal(pac(t).free, false);
  assert.equal(t.shippingAmount, 2000);
  assert.equal(t.total, 30800);
  assert.equal(t.amountToFreeShipping, 1200);
});
test("section 2: R$ 400,00 with MARIA10 stays free", () => {
  const t = totals(40000, 10);
  assert.equal(t.discount, 4000);
  assert.equal(pac(t).free, true);
  assert.equal(t.total, 36000);
});
test("section 2: R$ 250,00 without coupon", () => {
  const t = totals(25000, 0);
  assert.equal(t.shippingAmount, 2000);
  assert.equal(t.total, 27000);
});
test("section 2: R$ 250,00 with MARIA10", () => {
  const t = totals(25000, 10);
  assert.equal(t.discount, 2500);
  assert.equal(t.total, 24500);
});
test("free shipping only on the cheapest option", () => {
  const t = totals(40000, 0, "sedex");
  assert.deepEqual(t.deliveryOptions.map((o) => o.free), [false, true, false]);
  assert.equal(t.shippingAmount, 3500);
});
test("no quote or nothing chosen leaves shippingAmount null", () => {
  const t = cartTotals({ lines: [{ unitPrice: 1000, quantity: 2, soldOut: false }], couponPercent: 0, quote: null, chosen: null });
  assert.deepEqual(t.deliveryOptions, []);
  assert.equal(t.shippingAmount, null);
  assert.equal(t.total, 2000);
});
test("SAC-07 sold-out line is left out and blocks checkout", () => {
  const t = cartTotals({ lines: [{ unitPrice: 19900, quantity: 1, soldOut: false }, { unitPrice: 7900, quantity: 1, soldOut: true }], couponPercent: 0, quote: null, chosen: null });
  assert.equal(t.subtotal, 19900);
  assert.equal(t.canCheckout, false);
});
test("a normal bag can check out; an empty one cannot", () => {
  assert.equal(totals(1000, 0).canCheckout, true);
  assert.equal(cartTotals({ lines: [], couponPercent: 0, quote: null, chosen: null }).canCheckout, false);
});
test("SAC-16 installments", () => {
  const max = (cents) => cartTotals({ lines: [{ unitPrice: cents, quantity: 1, soldOut: false }], couponPercent: 0, quote: null, chosen: null }).installmentPlan.maxInstallments;
  assert.deepEqual([4990, 10000, 29999, 30000, 100000].map(max), [1, 2, 5, 6, 6]);
});
