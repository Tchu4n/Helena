import "server-only";
import { cookies } from "next/headers";

// The order being paid: its number and the `access` the API returned, sent back as X-Order-Access.
// Shared by the cart (any bag change deletes it) and checkout domains, so it lives here.
// Writes only from Server Actions, where setting cookies is allowed.
const ORDER_COOKIE = "helena_order";

export type OrderAccess = { number: string; access: string };

export async function readOrderAccess(): Promise<OrderAccess | null> {
  const raw = (await cookies()).get(ORDER_COOKIE)?.value;
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
