// CTA-08: one line per channel, with the date in São Paulo time.
import { test } from "node:test";
import assert from "node:assert/strict";
import { toConsentViews } from "../src/features/privacy/views.ts";

test("CTA-08 with nothing recorded: both channels, e-mail first, never accepted", () => {
  assert.deepEqual(toConsentViews([]), [
    { channel: "email", label: "Quero receber novidades por e-mail", accepted: false, line: "Nunca aceito" },
    { channel: "whatsapp", label: "Quero receber novidades por WhatsApp", accepted: false, line: "Nunca aceito" },
  ]);
});

test("CTA-08 accepted and revoked show their dates", () => {
  const [email, whatsapp] = toConsentViews([
    { channel: "whatsapp", accepted: false, recordedAt: "2026-11-21T02:30:00Z" },
    { channel: "email", accepted: true, recordedAt: "2026-11-20T15:00:00Z" },
  ]);
  assert.equal(email.accepted, true);
  assert.equal(email.line, "Aceito em 20/11/2026");
  assert.equal(whatsapp.accepted, false);
  assert.equal(whatsapp.line, "Cancelado em 20/11/2026"); // 23:30 of the 20th in São Paulo
});

test("CTA-08 not accepted without a date is never accepted", () => {
  assert.equal(toConsentViews([{ channel: "email", accepted: false, recordedAt: null }])[0].line, "Nunca aceito");
});
