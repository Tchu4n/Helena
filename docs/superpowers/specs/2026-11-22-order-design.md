# Order confirmation and tracking — design

> **Status:** draft for the owner's approval (2026-11-22). The owner chose the flow (confirmation screen with a green check that goes back to the home page by itself) and left the how to the agent.

## Intent

Right after paying, the customer needs one unmistakable sign that it worked: a big green check with "Pedido confirmado", understood even by someone who doesn't read the text. Then the store takes her back to the home page so she can keep shopping, without a dead-end screen. Later, from the e-mail or the store, she can follow the order (paid, being prepared, shipped, delivered) without an account.

## Goals

- `/pedido/[numero]` as the **confirmation** right after payment (`PED-01`, `PED-02`) and as **tracking** afterwards (`PED-03`, `PED-04`, `PED-07`, `PED-08`).
- **Lookup without an account** by order number + e-mail (`PED-05`, `PED-06`), at `/pedido` and on `/pedido/[numero]` when she has no access.
- Paid PIX and approved card land on the confirmation instead of the home page.

## Non-goals

- My account (`CTA-*`) and the e-mail sign-in link: the full address only comes with a customer session.
- The returns screen (`DEV-*`): "Solicitar devolução" links to `/devolucao`, which leads to the 404 page until that screen is built (same as `/privacidade`).
- The e-mail itself (sent by the back end).

## Anti-goals (a failure even if it works)

- Order data shown to someone who is not identified: no access cookie, or number and e-mail that don't match. A made-up `/pedido/HL-…` shows only the lookup form.
- A lookup answer that says which of number or e-mail is wrong (`PED-06`).
- CPF, phone or the full address on any of these screens (`PED-05`).
- The green color as the only sign: the check always comes with the text "Pedido confirmado".
- The automatic return pulling the screen away from someone who is reading or about to tap.

## Spec changes this work brings (owner's decisions of 2026-11-22)

Written into `docs/SPEC-CLIENT.md` before any test or code:

| Scenario | Today | Becomes |
|---|---|---|
| `CHK-16`, `CHK-20` | taken to the home page with "Pagamento concluído com sucesso" | taken to the order confirmation (`PED-01`) |
| `PED-01` | the confirmation screen | + a large check icon in the `success` color above "Pedido confirmado"; with no interaction, the screen goes to the home page after 8 seconds; any interaction (tap, scroll, key, focus moving) cancels it; no countdown on screen |
| `PED-02` | bag emptied | + happens when the confirmation opens |

The home page's success box ("Pagamento concluído com sucesso", `?pedido=`) is removed with its tests; the glossary loses `?pedido=` and gains the new routes.

## Constraints

Everything in `CLAUDE.md`. Contract unchanged: `getOrder` (`GET /v1/orders/{number}` with `X-Order-Access`) and `accessOrderWithoutAccount` (`POST /v1/orders/access`) already cover every scenario.

## Approaches

1. **One route, two modes (chosen).** `/pedido/[numero]` reads the order once; `?confirmado=1` (set only by the payment flow) shows the confirmation layout on top of the same data; without it, tracking. One query, one access check, and "Acompanhar pedido" is just the same URL without the parameter.
2. Two routes (`/pedido/[numero]/confirmado` and `/pedido/[numero]`). Same data read twice in two pages and a second route in the glossary, for no gain.
3. Keep the home box and add a link to tracking. Doesn't give the owner the confirmation screen she asked for.

## How it works

**Access.** Two `httpOnly` cookies, both `{ number, access }`, `SameSite=Lax`, `Secure` in production, `path: "/"`:
- `helena_order` (exists): the order being paid. Deleted when the confirmation opens, so checkout starts clean (`PED-02`).
- `helena_tracking` (new): the order she may read. Set when the confirmation opens (moved from `helena_order`) and after a lookup that matched; `maxAge` until the `expiresAt` the API gave, or 1 hour after payment. A separate cookie so a lookup during a new checkout never touches the payment in progress.

The page reads the order with `helena_tracking`, or with `helena_order` when it is the same number (the first render, before the move). The number in the URL is never trusted alone: if neither cookie has that number, or the API answers 401/404, the page shows the lookup form with the number filled in.

**Confirmation** (`/pedido/HL-…?confirmado=1`, order paid): check icon (`success`), "Pedido confirmado", the number, "Enviamos os detalhes para {e-mail mascarado}", the summary already used at checkout (items, total, payment method, delivery option and time), "Acompanhar pedido" (to `/pedido/HL-…`) and "Continuar comprando" (to `/`). A small client leaf, on mount, calls a Server Action that moves the access cookie and forgets the bag; the layout keeps what it first showed (as `SuccessNotice` does today). After 8 s with no `pointerdown`, `keydown`, `scroll`, `touchstart` or `focusin`, it calls `router.push("/")`. `prefers-reduced-motion`: no animation on the check. If the order is not paid, the parameter is ignored and tracking shows.

**Tracking** (`/pedido/HL-…`): the four steps in order with the current one in text ("Etapa atual: Em separação") and the date of each completed one (`PED-03`); PAC/Sedex after shipping: tracking code with "Copiar código" and the tracking link; courier: the expected delivery that day, no code (`PED-04`); items, delivery time, city/state, no address (`PED-05`); a return in progress shows "Suporte em andamento" (`PED-07`); `returnAvailability.allowed` shows "Solicitar devolução" (`PED-08`).

**Lookup** (`/pedido`, and on `/pedido/HL-…` without access): "Número do pedido" and "E-mail", one Server Action: Zod → `POST /v1/orders/access` → 201 saves `helena_tracking` and redirects to `/pedido/HL-…`; 404 → "Não encontramos um pedido com esses dados"; 429 and others → `problem.title`. A footer link "Acompanhar pedido" leads to `/pedido`.

**Fake API** gains `POST /v1/orders/access` and test hooks to move an order forward (preparing, shipped with or without a code, delivered, return requested).

## Agent's calls (for the owner to check)

- Payment method text: "PIX" or "Cartão de crédito · Nx" from `payment.method` and `payment.installments`.
- Courier "expected delivery that day" uses the order's `delivery.deliveryTime` ("Chega hoje") as the API sends it.
- The confirmation never moves focus by code (a `focusin` would cancel the return); the screen reader reads the page from the top, where the check and "Pedido confirmado" are.
- Footer link "Acompanhar pedido" so a customer without the e-mail at hand can find the lookup.
- The confirmation's 8 s return happens again on reload with `?confirmado=1`; harmless, since it is her own order.

## Left to the builder

Exact copy not given above (e.g. the step dates format), the domain split (`src/features/orders/`), the glossary names, and the test list per scenario.
