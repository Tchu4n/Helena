// PRO-12: the contact for "Avise-me" is checked before it goes to the API.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRestockContact } from "../src/features/catalog/restock.ts";

test("email ok", () => {
  assert.deepEqual(parseRestockContact("email", " Maria@Exemplo.com "), { ok: true, contact: "maria@exemplo.com" });
});

test("email invalid", () => {
  assert.deepEqual(parseRestockContact("email", "maria@"), { ok: false, message: "Digite um e-mail válido" });
});

test("whatsapp keeps digits", () => {
  assert.deepEqual(parseRestockContact("whatsapp", "(11) 98765-4321"), { ok: true, contact: "11987654321" });
});

test("whatsapp from autofill with country code", () => {
  assert.deepEqual(parseRestockContact("whatsapp", "+55 11 98765-4321"), { ok: true, contact: "11987654321" });
});

test("whatsapp invalid", () => {
  assert.deepEqual(parseRestockContact("whatsapp", "98765"), {
    ok: false,
    message: "Digite o WhatsApp com DDD, só números",
  });
});

test("contact over 150 chars", () => {
  const long = `${"a".repeat(150)}@exemplo.com`;
  assert.deepEqual(parseRestockContact("email", long), { ok: false, message: "Digite um e-mail válido" });
});
