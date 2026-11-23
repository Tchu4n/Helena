import "server-only";
import { cookies } from "next/headers";

// The order being paid: its number and the `access` the API returned, sent back as X-Order-Access.
// Shared by the cart (any bag change deletes it) and checkout domains, so it lives here.
// Writes only from Server Actions, where setting cookies is allowed.
const ORDER_COOKIE = "helena_order";
// The order she may read on /pedido/[numero]: moved here when the confirmation opens, or set by a lookup.
// Its own cookie, so a lookup during a new checkout never touches the payment in progress.
const TRACKING_COOKIE = "helena_tracking";

export type OrderAccess = { number: string; access: string };

async function readAccess(name: string): Promise<OrderAccess | null> {
  const raw = (await cookies()).get(name)?.value;
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (
      typeof value === "object" &&
      value !== null &&
      "number" in value &&
      "access" in value &&
      typeof value.number === "string" &&
      typeof value.access === "string"
    ) {
      return { number: value.number, access: value.access };
    }
  } catch {}
  return null;
}

export const readOrderAccess = () => readAccess(ORDER_COOKIE);
export const readTrackingAccess = () => readAccess(TRACKING_COOKIE);

export async function saveOrderAccess(value: OrderAccess): Promise<void> {
  (await cookies()).set(ORDER_COOKIE, JSON.stringify({ number: value.number, access: value.access }), {
    maxAge: 60 * 60, // covers a reservation redone after a decline and the trip to the home page
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export async function clearOrderAccess(): Promise<void> {
  (await cookies()).delete(ORDER_COOKIE);
}

export async function saveTrackingAccess(value: OrderAccess, maxAgeSeconds: number): Promise<void> {
  (await cookies()).set(TRACKING_COOKIE, JSON.stringify({ number: value.number, access: value.access }), {
    maxAge: maxAgeSeconds,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}
