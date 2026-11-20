// PRO-08, PRO-09: the CEP is normalized before the shipping quote; the quote is shown ready for the screen.
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeCep } from "../src/features/cart/cep.ts";
import { toShippingView } from "../src/features/cart/views.ts";

test("PRO-09 hyphen, dot and spaces are ignored", () => {
  for (const input of ["01310100", "01310-100", " 01310 100 ", "01.310-100"]) assert.equal(normalizeCep(input), "01310100");
});

test("PRO-09 short or with letters is invalid", () => {
  for (const input of ["0131010", "01310-10a", "0131a100", ""]) assert.equal(normalizeCep(input), null);
});

test("toShippingView labels options and shows free shipping", () => {
  const view = toShippingView({
    cep: "01310100",
    city: "São Paulo",
    state: "SP",
    options: [
      { type: "pac", price: 0, free: true, deliveryTime: "Chega em até 5 dias úteis" },
      { type: "courier", price: 1500, free: false, deliveryTime: "Chega hoje" },
    ],
  });
  assert.deepEqual(view.options[0], { label: "PAC", price: "Grátis", free: true, deliveryTime: "Chega em até 5 dias úteis" });
  assert.equal(view.options[1].label, "Entrega Helena");
  assert.equal(view.options[1].price, "R$ 15,00");
  assert.equal(view.city, "São Paulo");
});
