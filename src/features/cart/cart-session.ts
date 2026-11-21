import "server-only";
import { cookies } from "next/headers";
import { apiPost } from "@/src/lib/api";
import type { components } from "@/src/lib/api-types";
import { CART_COOKIE, CART_MAX_AGE } from "./cookie.ts";

// Plain server module, not "use server": every export of a "use server" file becomes a public endpoint.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The cart id only ever comes from the visitor's own httpOnly cookie, never from a form field.
export async function readCartId(): Promise<string | null> {
  const value = (await cookies()).get(CART_COOKIE)?.value;
  return value && UUID.test(value) ? value : null;
}

// Only callable from a Server Action, where setting cookies is allowed.
export async function createCart(): Promise<string | null> {
  // createCart has no request body in the contract.
  const result = await apiPost<components["schemas"]["Cart"]>("/v1/carts");
  if (!result.ok || !result.data) return null;
  (await cookies()).set(CART_COOKIE, result.data.id, {
    maxAge: CART_MAX_AGE,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return result.data.id;
}

export async function ensureCart(): Promise<string | null> {
  return (await readCartId()) ?? (await createCart());
}

// After a paid order the bag starts empty. Only callable from a Server Action.
export async function forgetCart(): Promise<void> {
  (await cookies()).delete(CART_COOKIE);
}
