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
  const consent = { v: 1, analytics: true, marketing: false };
  assert.deepEqual(parseConsent(serializeConsent(consent)), consent);
});
