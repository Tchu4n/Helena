// CHK-23: what she typed stays in this tab only (sessionStorage), so coming back from payment or from
// the bag refills the form. Owner's decision of 2026-11-20. Card fields are never stored here.
// Every access is wrapped: a private window or blocked storage just means the form starts empty.
import type { DetailsField } from "./schemas/customerDetails.ts";

export type StoredDetails = Record<DetailsField, string> & { marketingEmail: boolean; marketingWhatsapp: boolean };

const KEY = "helena_checkout";

export function readDetails(): Partial<StoredDetails> | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    const value: unknown = raw ? JSON.parse(raw) : null;
    return value && typeof value === "object" ? (value as Partial<StoredDetails>) : null;
  } catch {
    return null;
  }
}

export function writeDetails(values: StoredDetails): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(values));
  } catch {
    // storage unavailable: the form still works, it just won't be refilled
  }
}

export function clearDetails(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // nothing stored
  }
}
