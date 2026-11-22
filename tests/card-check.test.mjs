// Card field checks of the simulated gateway (plan decision table); the real gateway brings its own.
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkCard, cardToken } from "../src/features/checkout/components/gateway/checkCard.ts";

const NOW = new Date(2026, 10, 22); // November 2026
const good = { number: "4111 1111 1111 0000", name: "MARIA SOUZA", validity: "08/29", cvv: "123" };

test("a good card has no errors", () => {
  assert.deepEqual(checkCard(good, NOW), {});
});

test("number: 13 to 19 digits, spaces ignored", () => {
  assert.equal(checkCard({ ...good, number: "4111 1111 1111" }, NOW).number, "Confira o número do cartão");
  assert.equal(checkCard({ ...good, number: "4".repeat(20) }, NOW).number, "Confira o número do cartão");
  assert.equal(checkCard({ ...good, number: "4111 1111 1111 1" }, NOW).number, undefined);
  assert.equal(checkCard({ ...good, number: "4111 abcd 1111 0000" }, NOW).number, "Confira o número do cartão");
});

test("name: required", () => {
  assert.equal(checkCard({ ...good, name: "  " }, NOW).name, "Campo obrigatório");
});

test("validity: MM/AA, a real month, not in the past", () => {
  assert.equal(checkCard({ ...good, validity: "11/26" }, NOW).validity, undefined); // this month still works
  assert.equal(checkCard({ ...good, validity: "10/26" }, NOW).validity, "Confira a validade");
  assert.equal(checkCard({ ...good, validity: "13/29" }, NOW).validity, "Confira a validade");
  assert.equal(checkCard({ ...good, validity: "0829" }, NOW).validity, "Confira a validade");
});

test("CVV: 3 or 4 digits", () => {
  assert.equal(checkCard({ ...good, cvv: "" }, NOW).cvv, "Confira o CVV");
  assert.equal(checkCard({ ...good, cvv: "12" }, NOW).cvv, "Confira o CVV");
  assert.equal(checkCard({ ...good, cvv: "1234" }, NOW).cvv, undefined);
});

test("the token carries only the last 4 digits", () => {
  assert.equal(cardToken("4111 1111 1111 0002"), "tok_test_0002");
});
