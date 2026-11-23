"use server";

import { redirect } from "next/navigation";
import { readCartId } from "@/src/features/cart";
import { apiDelete } from "@/src/lib/api";
import { clearIdentification } from "../identification-cookie.ts";

// IDT-13: the bag's confirmed e-mail is dropped, so "Dados e entrega" stays closed until a new one is confirmed.
export async function changeEmail(): Promise<void> {
  // Authorization: only her own bag, from the httpOnly cart cookie.
  const cartId = await readCartId();
  if (cartId) await apiDelete(`/v1/carts/${cartId}/email-verification`);
  await clearIdentification();
  redirect("/checkout/identificacao");
}
