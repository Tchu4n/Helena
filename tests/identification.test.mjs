// IDT-01 to IDT-10: the identification fields, checked on the server with the store's own messages.
import { test } from "node:test";
import assert from "node:assert/strict";
import { codeInput, emailInput, passwordInput, wayInput } from "../src/features/account/schemas/identification.ts";

const message = (result) => (result.success ? null : result.error.issues[0].message);

test("emailInput trims and lowercases", () => {
  assert.equal(emailInput.parse("  MARIA@Exemplo.com "), "maria@exemplo.com");
});

test("emailInput messages", () => {
  assert.equal(message(emailInput.safeParse("")), "Campo obrigatório");
  assert.equal(message(emailInput.safeParse("   ")), "Campo obrigatório");
  assert.equal(message(emailInput.safeParse("maria.exemplo.com")), "Digite um e-mail válido");
  assert.equal(message(emailInput.safeParse(`${"a".repeat(140)}@exemplo.com`)), "Digite um e-mail válido"); // 152 > 150
});

test("Review focus 3: codeInput keeps the 6 digits of a pasted code with spaces", () => {
  assert.equal(codeInput.parse(" 482 917 "), "482917");
  assert.equal(codeInput.parse("482917"), "482917");
});

test("codeInput refuses anything but 6 digits", () => {
  for (const bad of ["48291", "4829170", "48291a", ""]) {
    assert.equal(message(codeInput.safeParse(bad)), "Digite os 6 números do código", bad);
  }
});

test("passwordInput: 8 to 72 characters, not trimmed", () => {
  assert.equal(message(passwordInput.safeParse("a".repeat(7))), "A senha precisa ter pelo menos 8 caracteres");
  assert.equal(passwordInput.parse("a".repeat(8)), "a".repeat(8));
  assert.equal(passwordInput.parse("a".repeat(72)), "a".repeat(72));
  assert.equal(message(passwordInput.safeParse("a".repeat(73))), "A senha pode ter no máximo 72 caracteres");
  assert.equal(passwordInput.parse(" abcdefg"), " abcdefg");
});

test("wayInput: guest or account", () => {
  assert.equal(wayInput.parse("guest"), "guest");
  assert.equal(wayInput.parse("account"), "account");
  assert.equal(message(wayInput.safeParse("")), "Escolha como quer comprar");
  assert.equal(message(wayInput.safeParse(null)), "Escolha como quer comprar");
});
