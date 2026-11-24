// CTA-05: Meus endereços gets only the fields it shows, with the texts ready.
import { test } from "node:test";
import assert from "node:assert/strict";
import { toAddressView } from "../src/features/account/views.ts";

const saved = {
  id: "7d0f2b8e-5c1a-4f3e-9b6d-2a8c4e1f0a11",
  favorite: true,
  cep: "01310100",
  street: "Avenida Paulista",
  number: "1000",
  complement: "Apto 12",
  neighborhood: "Bela Vista",
  city: "São Paulo",
  state: "SP",
};

test("CTA-05 the address as one line, the place and the CEP with its dash", () => {
  const view = toAddressView(saved);
  assert.equal(view.id, saved.id);
  assert.equal(view.favorite, true);
  assert.equal(view.line, "Avenida Paulista, 1000, Apto 12");
  assert.equal(view.place, "Bela Vista · São Paulo/SP");
  assert.equal(view.cep, "01310-100");
});

test("CTA-05 without a complement: no trailing comma, and the field is empty", () => {
  const view = toAddressView({ ...saved, complement: null, favorite: false });
  assert.equal(view.line, "Avenida Paulista, 1000");
  assert.equal(view.favorite, false);
  assert.deepEqual(view.fields, {
    cep: "01310100",
    street: "Avenida Paulista",
    number: "1000",
    complement: "",
    neighborhood: "Bela Vista",
    city: "São Paulo",
    state: "SP",
  });
});
