# Checkout — design

> **Status:** draft for the owner's approval (2026-11-20); the builder check's questions are answered. Approved prototype: https://claude.ai/artifact/NMW73nYpRGUzZipiNuNR7e (version 2, with the owner's later answer: an approved card goes to the same place as a paid PIX).

## Intent

The customer is 18 to 30, on her phone, often coming from an Instagram post. She has a bag and wants to pay now. Checkout must let her finish in a few taps, with one hand, without an account, password or CAPTCHA, and without surprises in the total. For the store, the details she types are worth keeping even if she gives up (a lead for a reminder), and stock must never be sold twice.

## Goals

- Steps 2 and 3 of the purchase: **details and delivery** (`/checkout`) and **payment** (`/checkout/pagamento`), against the existing contract and the fake API.
- **PIX** working end to end against what the API returns (QR code, copy-and-paste code, status polling).
- **Card** working end to end with a **simulated gateway**: browser-only fields that produce a token, so the real gateway can replace them later without touching the rest.
- The 15-minute reservation with its countdown on the payment screen and, while it runs, on the bag (`SAC-17`).
- After a paid PIX or an approved card, the customer lands on the home page with "Pagamento concluído com sucesso" and the order number.

## Non-goals

- Account, password, login link (`CTA-*`).
- The order confirmation and tracking screens (`PED-*`). The success message on the home page replaces the confirmation for now.
- Apple Pay, Google Pay, wallets: they depend on the real gateway.
- A separate billing address: it is the delivery address.
- Address lookup by CEP from an outside service.
- Choosing the payment gateway, antifraud and 3-D Secure: they come with the real gateway.

## Anti-goals (a failure even if it works)

- Card number, name, expiry or CVV reaching the store's server, a log, a form post or any storage.
- Charging without a valid reservation, or after a piece hit zero.
- A pre-checked marketing box, or one box for both channels.
- Showing or filling in any data from an earlier purchase tied to the CPF or e-mail (`CHK-08`).
- Checkout blocked because the shipping API is down (`PRO-11` fixed fee applies).
- A total that changes without the screen saying so (`CHK-10`).

## Spec changes this work brings (owner's decisions of 2026-11-20)

Written into `docs/SPEC-CLIENT.md` before any test or code:

| Scenario | Today | Becomes |
|---|---|---|
| `CHK-02` | "the CEP entered before comes already filled in" | The CEP field starts empty. Delivery options show once she types a valid CEP |
| `CHK-16` | taken to the order confirmation (`PED-01`) | taken to the home page, which shows "Pagamento concluído com sucesso" with the order number until she closes it |
| `CHK-20` | taken to the order confirmation (`PED-01`) | same as `CHK-16` |
| `PRO-10` and decision 20 | "Motoboy" | "Entrega Helena" (**already done** on 2026-11-20) |

Fewer helper texts (owner's feedback on the prototype): no line saying the purchase goes on with both boxes unchecked, no explanation under PIX, no explanation after "Tentar de novo" or after a declined card. The `CHK-06` reminder notice stays (LGPD).

## Approaches considered

| | Approach | Trade-off | Decision |
|---|---|---|---|
| A | PIX now, card in a later plan once the gateway is chosen | Nothing thrown away, but checkout is not complete | Not chosen |
| **B** | **Card with a simulated gateway now, plus PIX** | The whole flow works today; the simulated fields are replaced when the gateway arrives | **Chosen by the owner**, "B mas faça o PIX também" |
| C | Choose the gateway first | The card is built once, right; the work waits for the owner and sandbox credentials | Not chosen |

## How it works

### Screens (as in the approved prototype)

**`/checkout` — Dados e entrega**
- Reduced header and the 3-step progress, step 2 current (the `GER-02` rule already in `globals.css`).
- A closed summary at the top ("Resumo · N peças · total"), which opens to items, discount, shipping, delivery time and total (`CHK-11`).
- Fields, label above, `autocomplete` on each: Nome completo, CPF, E-mail, Celular; then CEP, Rua, Número, Complemento (opcional), Bairro, Cidade, UF. She types city and state herself (the `Cart` has no city; no prefill). Messages exactly as `CHK-03`, plus three new ones accepted by the owner on 2026-11-20 and written into `CHK-03` first: CPF with 11 numbers but wrong check digits → "CPF inválido"; phone with fewer than 10 numbers → "Digite o celular com DDD"; state that isn't two letters → "Digite a sigla do estado, como SP". Length limits from the contract (`maxLength` on each field) stop typing at the limit, with no message. Separators dropped before validating; errors with border, icon and text; focus to the first error; nothing typed is cleared (`CHK-04`).
- The `CHK-06` notice next to the contact fields, with a link to the privacy policy.
- Delivery options for the typed CEP (same rules as the bag: cheapest chosen at first, `PRO-10`, `PRO-11`). Until she types one, the list says "Digite o CEP para ver as opções de entrega" and the summary keeps the bag's own shipping and total (the cart still holds the bag's CEP and option). Typing a CEP saves it in the cart (the bag's `saveCep`); when the total changes, a bordered note shows the total before (the bag's, or the previous CEP's) and the new one until she moves on (`CHK-10`). Same CEP as the bag: no note.
- Two unchecked boxes, "Quero receber novidades por e-mail" and "Quero receber novidades por WhatsApp" (`CHK-07`).
- Fixed bottom bar: total and "Ir para pagamento".

**`/checkout/pagamento` — Pagamento**
- Countdown "Sua reserva termina em MM:SS" in `sale`, from the order's `reservationExpiresAt`.
- The same closed summary.
- Method: PIX or "Cartão de crédito", two tiles with a double border when chosen.
- PIX: "Gerar código PIX" → QR code, the code, "Copiar código PIX", "Aguardando pagamento". The screen polls the order; when it is paid, she goes to the home page with the success message.
- Card: the gateway fields (simulated), "Parcelas" with only the options the order's `installmentPlan` allows, all "sem juros" (`CHK-19`), and "Pagar R$ X", which turns into "Processando" and is disabled after the first tap (`CHK-22`). Declined: error with icon and text, "Pagar com PIX" (`CHK-21`). Approved: home page with the success message.
- Reservation over: "Reserva encerrada", the PIX code gone, "Tentar de novo" (`CHK-17`), which goes back to choosing the method; the next "Gerar código PIX" or "Pagar" reserves again through `payOrder` (409 → back to the bag, `CHK-13`).
- After a declined card the API has already released the reservation: the countdown leaves; "Pagar com PIX" or a new card reserves again the same way, and the countdown comes back from the order's new `reservationExpiresAt`.

**Home page after payment**: a success box at the top ("Pagamento concluído com sucesso", "Pedido HL-…", the masked e-mail), closed by its own button. It shows only when the order cookie matches the number and `getOrder` says the order is paid; otherwise the home page shows nothing extra.

**Bag with a reservation running** (`SAC-17`): the countdown at the top of `/sacola`.

### Data and flow

- **New domain `checkout`** (already in the glossary): `components/`, `actions/`, `queries/`, `schemas/`, `index.ts`, and `client.ts` if a client component of another domain needs it.
- **Lead (`CHK-05`)**: when every required field is valid and she leaves a field, a Server Action calls `saveCustomerDetails` (`PUT /v1/carts/{cookie id}/customer`), with the consents and `textVersion`, forwarding her IP in `X-Forwarded-For`. Saving again after a change is fine.
- **"Ir para pagamento"**: validates on the server (Zod, the same rules), saves the details, then `createOrder` with an `Idempotency-Key`. 201 → the order's `access` and number go into an `httpOnly`, `Secure`, `SameSite=Lax` cookie and she goes to `/checkout/pagamento`. 409 (sold out) → back to `/sacola`, which shows the `SAC-07` message on arrival (`CHK-13`). 422 → the screen's error.
- **Payment**: `payOrder` with `X-Order-Access` from the cookie and a new `Idempotency-Key` per attempt. PIX polling goes through a Server Action that reads the order (`getOrder`); the client calls it every few seconds while the PIX is on screen.
- **Simulated gateway**: a client component in `src/features/checkout/components/gateway/`. Its inputs have no `name` and sit outside any form that posts, so the browser never sends them. On "Pagar" it makes a token in the browser (`tok_test_` + the last four digits) and only the token and the number of installments go to the Server Action. The fake API approves any token except one ending in `0002`, which it declines with a message. The real gateway later replaces this one component.
- **Success message**: the payment screen sends her to `/?pedido=HL-…` (my call; the parameter goes into the glossary). The home page reads the order with the order cookie and shows the box only if that order is paid, so a made-up link shows nothing. After the box shows, the order cookie and the cart cookie are deleted (the bag starts empty); closing the box removes the parameter.
- **Order cookie**: `httpOnly`, `Secure`, `SameSite=Lax`, one hour (covers a reservation redone after a decline and the trip to the home page).
- **Order and bag while paying** (my calls, also written into the fake API): "Ir para pagamento" again for the same cart replaces its order still awaiting payment, and that order's reservation is released (the back end does it; the contract's `createOrder` description gets this sentence, a documentation-only addition). Any change in the bag (quantity, removal, coupon, CEP, option) deletes the order cookie: the old reservation ends by itself, and she reaches payment again only through "Ir para pagamento", with a new order for the new total. Until she changes something, the bag shows the countdown (`SAC-17`).
- **Fake API** (first task, like the bag's Task 1): `PUT …/customer`, `POST /v1/orders` (replaces the cart's order still awaiting payment), `GET /v1/orders/{number}`, `POST /v1/orders/{number}/payments` (a decline releases the reservation; a new attempt reserves again or answers 409), following the contract; test hooks to mark a PIX paid, to end a reservation now, and to make a piece sell out before reserving. Reservations count against stock, so a 409 never comes from her own old order.

### Going back without losing anything (`CHK-23`)

The contract's `Cart` doesn't return the customer's details, so nothing on the server can refill the form when she comes back from payment. **Owner's decision (2026-11-20): keep what she typed in `sessionStorage`**, for this tab only, deleted after payment and gone when the tab closes. Card fields are never stored.

Why this one (safety and LGPD): nothing new is collected (the same data already goes to the API as a lead), and it never leaves her device again. The alternative, the API returning her cart's details, would let anyone holding the cart cookie read name, CPF and address over the network for the cookie's 30 days, on a shared phone for example. The remaining risk of `sessionStorage` is a malicious script on the page reading it; the store loads no third-party scripts in checkout, and a Content-Security-Policy header is a hardening worth a task of its own later.

## Constraints

Everything in `CLAUDE.md` and the product and bag plans. In particular: authorization in every action (cart from the cookie, order access from its cookie), Zod at every boundary, `refresh()` or `updateTag` after changes, `"use client"` only on leaves, no whole API response to a client component, tokens only, 48px targets, focus never under the fixed bar, `prefers-reduced-motion`. No new dependency. No contract change, except one documentation sentence in `createOrder` (see "Order and bag while paying").

## Left to the builder

Component split, file names (following the glossary), the polling interval (2 to 5 seconds), the order cookie's name and expiry (no longer than the reservation plus a margin), the fake API's internal shapes, and the order of tasks after the fake API.
