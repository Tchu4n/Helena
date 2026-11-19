import { z } from "zod";

const email = z.email().max(150);

// PRO-12: e-mail is stored in lower case; WhatsApp keeps only digits (area code + number, as the contract's Phone).
export function parseRestockContact(
  channel: "email" | "whatsapp",
  contact: string,
): { ok: true; contact: string } | { ok: false; message: string } {
  if (channel === "email") {
    const value = contact.trim().toLowerCase();
    return email.safeParse(value).success ? { ok: true, contact: value } : { ok: false, message: "Digite um e-mail válido" };
  }
  // Autofill gives "+55 11 98765-4321": the country code is dropped.
  const digits = contact.replace(/\D/g, "").replace(/^55(\d{10,11})$/, "$1");
  return /^\d{10,11}$/.test(digits)
    ? { ok: true, contact: digits }
    : { ok: false, message: "Digite o WhatsApp com DDD, só números" };
}
