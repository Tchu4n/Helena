"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { apiGet } from "@/src/lib/api";
import type { components } from "@/src/lib/api-types";
import { readSession } from "@/src/lib/session-cookie";
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
  // CHK-01, IDT-01, IDT-11, IDT-14: straight to identification when the bag's e-mail isn't confirmed and she isn't signed in, or her
  // account still lacks "Seus dados". Going through /checkout
  // first would leave its streamed redirect in the page Next keeps hidden, and coming back after the code
  // would replay it.
  const session = await readSession();
  const ready = session ? session.detailsComplete : Boolean(result.data.verifiedEmail);
  redirect(ready ? "/checkout" : "/checkout/identificacao");
}
