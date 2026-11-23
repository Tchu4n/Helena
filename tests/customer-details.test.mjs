// CHK-02 to CHK-07: the details form and the server actions share one schema, with the screen's exact messages.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ADDRESS_FIELDS, addressDetailsInput, addressInput, customerDetailsInput, digits, fieldErrors, isValidCpf } from "../src/features/checkout/schemas/customerDetails.ts";

const VALID = {
  name: "Maria Souza",
  cpf: "52998224725",
  phone: "11987654321",
  cep: "01310100",
  street: "Avenida Paulista",
  number: "1000",
  complement: "",
  neighborhood: "Bela Vista",
  city: "São Paulo",
  state: "SP",
};

function errorsFor(overrides) {
  const result = customerDetailsInput.safeParse({ ...VALID, ...overrides });
  assert.equal(result.success, false);
  return fieldErrors(result.error);
}

// One test per row of the CHK-03 table.
const ROWS = [
  ["cpf", "123.456.789-0", "CPF deve ter 11 números"],
  ["cpf", "1234567890a", "CPF deve ter 11 números"],
  ["phone", "(11) 9abc-0000", "Digite só números"],
  ["cep", "0131010", "Digite um CEP com 8 números"],
  ["name", "", "Campo obrigatório"],
  ["street", "", "Campo obrigatório"],
  ["cpf", "111.444.777-00", "CPF inválido"],
  ["phone", "(11) 9876-543", "Digite o celular com DDD"],
  ["state", "S", "Digite a sigla do estado, como SP"],
];
for (const [field, value, message] of ROWS) {
  test(`CHK-03 ${field} "${value}" → "${message}"`, () => {
    assert.deepEqual(errorsFor({ [field]: value }), { [field]: message });
  });
}

test("CHK-03 every address field is required", () => {
  for (const field of ["number", "neighborhood", "city", "state"]) {
    assert.deepEqual(errorsFor({ [field]: "  " }), { [field]: "Campo obrigatório" });
  }
});

test("CHK-03 separators are dropped before validating", () => {
  const r = customerDetailsInput.safeParse({ ...VALID, cpf: "529.982.247-25", phone: "(11) 98765-4321", cep: "01310-100" });
  assert.equal(r.success, true);
  assert.equal(r.data.cpf, "52998224725");
  assert.equal(r.data.phone, "11987654321");
  assert.equal(r.data.address.cep, "01310100");
});

// IDT-03, CHK-03: the e-mail is not a form field anymore; the server adds the confirmed one.
test("CHK-02 the result is the contract's CustomerDetails without the e-mail", () => {
  assert.deepEqual(customerDetailsInput.parse(VALID), {
    name: "Maria Souza",
    cpf: "52998224725",
    phone: "11987654321",
    address: {
      cep: "01310100",
      street: "Avenida Paulista",
      number: "1000",
      complement: null,
      neighborhood: "Bela Vista",
      city: "São Paulo",
      state: "SP",
    },
    consents: { email: false, whatsapp: false, textVersion: "2026-11" },
  });
});

test("CHK-07 consents follow the two boxes, both off by default", () => {
  assert.deepEqual(customerDetailsInput.parse({ ...VALID, marketingWhatsapp: "on" }).consents, {
    email: false,
    whatsapp: true,
    textVersion: "2026-11",
  });
  assert.deepEqual(customerDetailsInput.parse({ ...VALID, marketingEmail: "on" }).consents.email, true);
});

test("state is upper-cased and a typed complement is kept", () => {
  const r = customerDetailsInput.parse({ ...VALID, state: "sp", complement: " Apto 12 " });
  assert.equal(r.address.state, "SP");
  assert.equal(r.address.complement, "Apto 12");
});

test("values missing from the form (null from FormData) count as empty", () => {
  assert.deepEqual(errorsFor({ name: null }), { name: "Campo obrigatório" });
});

test("fieldErrors keeps screen order, one message per field", () => {
  assert.deepEqual(Object.keys(errorsFor({ cep: "1", name: "" })), ["name", "cep"]);
});

test("digits drops spaces, dots, dashes, parentheses and slashes only", () => {
  assert.equal(digits(" (11) 9.876-54/32 "), "1198765432");
  assert.equal(digits("12a"), "12a");
});

test("isValidCpf checks both check digits and rejects repeated digits", () => {
  assert.equal(isValidCpf("52998224725"), true);
  assert.equal(isValidCpf("52998224724"), false);
  assert.equal(isValidCpf("11111111111"), false);
});

test("IDT-03 an e-mail sent in the form is ignored", () => {
  assert.equal("email" in customerDetailsInput.parse({ ...VALID, email: "outra@exemplo.com" }), false);
});

// CTA-05: Meus endereços uses the checkout's address rules and messages, without the boxes.
const ADDRESS = { cep: "01310-100", street: "Avenida Paulista", number: "1000", complement: "", neighborhood: "Bela Vista", city: "São Paulo", state: "sp" };
const addressError = (overrides, field) => addressInput.safeParse({ ...ADDRESS, ...overrides }).error?.issues.find((i) => i.path[0] === field)?.message;

test("CTA-05 addressInput gives the checkout's messages", () => {
  assert.equal(addressError({ cep: "1234" }, "cep"), "Digite um CEP com 8 números");
  assert.equal(addressError({ street: "" }, "street"), "Campo obrigatório");
  assert.equal(addressError({ state: "S" }, "state"), "Digite a sigla do estado, como SP");
});

test("CTA-05 addressInput gives the contract's Address", () => {
  assert.deepEqual(addressInput.parse(ADDRESS), {
    cep: "01310100",
    street: "Avenida Paulista",
    number: "1000",
    complement: null,
    neighborhood: "Bela Vista",
    city: "São Paulo",
    state: "SP",
  });
  assert.deepEqual(ADDRESS_FIELDS, ["cep", "street", "number", "complement", "neighborhood", "city", "state"]);
});

test("IDT-11 addressDetailsInput is unchanged: the address and the consents", () => {
  const full = customerDetailsInput.parse(VALID);
  assert.deepEqual(addressDetailsInput.parse(VALID), { address: full.address, consents: full.consents });
});
