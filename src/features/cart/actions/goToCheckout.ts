"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { apiGet } from "@/src/lib/api";
import type { components } from "@/src/lib/api-types";
import { readCartId } from "../cart-session.ts";
import type { CheckoutState } from "../types.ts";
import { toCartView } from "../views.ts";

// SAC-07: the bag is read from the API at the moment of the tap, so a piece that sold out after the page opened still blocks.
export async function goToCheckout(): Promise<CheckoutState> {
  const cartId = await readCartId();
  if (!cartId) return { messages: [], error: "Não foi possível concluir. Tente de novo" };

  const result = await apiGet<components["schemas"]["Cart"]>(`/v1/carts/${cartId}`);
  if (!result.ok) return { messages: [], error: result.problem.title };
  const { soldOutMessages } = toCartView(result.data);
  if (soldOutMessages.length > 0) {
    refresh(); // the page may not know yet that the piece sold out
    return { messages: soldOutMessages, error: null };
  }
  // The API's own answer (for example, a bag emptied in another tab): back to the bag, which shows why.
  if (!result.data.canCheckout) redirect("/sacola");
  redirect("/checkout");
}
