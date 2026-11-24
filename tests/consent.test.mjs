// LGPD: the consent cookie is read defensively; anything unexpected counts as "not chosen yet".
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseConsent, serializeConsent } from "../src/features/privacy/consent.ts";

test("no cookie means no choice yet", () => assert.equal(parseConsent(undefined), null));
test("garbage means no choice yet", () => assert.equal(parseConsent("lixo"), null));
test("another version means no choice yet", () =>
  assert.equal(parseConsent('{"v":2,"analytics":true,"marketing":true}'), null));
test("a missing field means no choice yet", () => assert.equal(parseConsent('{"v":1,"analytics":true}'), null));

test("round trip keeps the choice", () => {
  const consent = { v: 1, analytics: true, marketing: false, functional: false };
  assert.deepEqual(parseConsent(serializeConsent(consent)), consent);
});

// GER-05, PRO-15: "Funcionais" came later; a choice made before it counts as not accepted.
test("a v1 cookie from before Funcionais reads as functional off", () =>
  assert.deepEqual(parseConsent('{"v":1,"analytics":true,"marketing":true}'), { v: 1, analytics: true, marketing: true, functional: false }));

test("round trip keeps Funcionais", () => {
  const consent = { v: 1, analytics: false, marketing: false, functional: true };
  assert.deepEqual(parseConsent(serializeConsent(consent)), consent);
});
