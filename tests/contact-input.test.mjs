// IDT-14, IDT-11: "Seus dados" uses the checkout's own name, CPF and phone rules; signed in, checkout sends only the address part.
import { test } from "node:test";
import assert from "node:assert/strict";
import { addressDetailsInput, CONTACT_FIELDS, contactInput, customerDetailsInput } from "../src/features/checkout/schemas/customerDetails.ts";

const CONTACT = { name: "Maria Souza", cpf: "52998224725", phone: "11987654321" };
const ADDRESS = {
  cep: "01310-100",
  street: "Avenida Paulista",
  number: "1000",
  complement: "",
  neighborhood: "Bela Vista",
  city: "São Paulo",
  state: "sp",
};

const firstMessage = (schema, value) => {
  const result = schema.safeParse(value);
  assert.equal(result.success, false);
  return result.error.issues[0].message;
};

test("IDT-14 contact fields, in screen order", () => {
  assert.deepEqual(CONTACT_FIELDS, ["name", "cpf", "phone"]);
});

for (const [field, value, message] of [
  ["name", "", "Campo obrigatório"],
  ["cpf", "123", "CPF deve ter 11 números"],
  ["cpf", "52998224724", "CPF inválido"],
  ["phone", "1199", "Digite o celular com DDD"],
]) {
  test(`IDT-14 ${field} "${value}" → "${message}", as at checkout`, () => {
    assert.equal(firstMessage(contactInput, { ...CONTACT, [field]: value }), message);
    assert.equal(firstMessage(customerDetailsInput, { ...CONTACT, ...ADDRESS, [field]: value }), message);
  });
}

test("IDT-14 separators are dropped from CPF and phone", () => {
  assert.deepEqual(contactInput.parse({ name: " Maria Souza ", cpf: "529.982.247-25", phone: "(11) 98765-4321" }), CONTACT);
});

test("IDT-11 signed in: the address part alone is valid and carries no name, CPF or phone", () => {
  const out = addressDetailsInput.parse(ADDRESS);
  assert.equal("name" in out || "cpf" in out || "phone" in out, false);
  assert.equal(out.address.cep, "01310100");
  assert.equal(out.address.state, "SP");
  assert.equal(out.address.complement, null);
  assert.deepEqual(out.consents, { email: false, whatsapp: false, textVersion: "2026-11" });
});

test("CHK-03 the full form still gives the same object", () => {
  const out = customerDetailsInput.parse({ ...CONTACT, ...ADDRESS, marketingEmail: "on" });
  assert.deepEqual(out, {
    ...CONTACT,
    address: { cep: "01310100", street: "Avenida Paulista", number: "1000", complement: null, neighborhood: "Bela Vista", city: "São Paulo", state: "SP" },
    consents: { email: true, whatsapp: false, textVersion: "2026-11" },
  });
});
