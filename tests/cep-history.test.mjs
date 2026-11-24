// PRO-15: the CEPs whose shipping she calculated, newest first, at most 5, no repeats.
import { test } from "node:test";
import assert from "node:assert/strict";
import { addCep } from "../src/features/cart/cep-history.ts";

const SP = { cep: "01310100", place: "São Paulo/SP" };
const AC = { cep: "69900000", place: "Rio Branco/AC" };

test("PRO-15 the new CEP comes first", () => {
  assert.deepEqual(addCep([SP], AC), [AC, SP]);
});

test("PRO-15 a CEP already there moves to the top without repeating", () => {
  assert.deepEqual(addCep([AC, SP], SP), [SP, AC]);
});

test("PRO-15 a sixth CEP drops the oldest", () => {
  const five = ["11111111", "22222222", "33333333", "44444444", "55555555"].map((cep) => ({ cep, place: null }));
  const next = addCep(five, SP);
  assert.equal(next.length, 5);
  assert.deepEqual(next[0], SP);
  assert.equal(next.at(-1).cep, "44444444");
});

test("SAC-18 a CEP from the bag (no place) keeps the place already known", () => {
  assert.deepEqual(addCep([AC, SP], { cep: "01310100", place: null }), [SP, AC]);
  assert.deepEqual(addCep([], { cep: "01310100", place: null }), [{ cep: "01310100", place: null }]);
});
