# Account, part 2: sign-up details, my orders and personal details — design

> **Status:** approved by the owner on 2026-11-23 (approach 1; one CPF per account; signed-in checkout read-only from the account). It changes the approved account design (`2026-11-23-account-design.md`) where it says so below; everything else there still holds.

## Why

The owner wants every purchase tied to complete details (name, CPF, phone, e-mail, address), with or without an account, and an account to be a complete customer record before it can buy. Today an account created by the code has only the e-mail and the password, so "Dados pessoais" would have nothing to show and checkout couldn't fill anything in.

## Owner's decisions (2026-11-23)

1. **Every purchase carries its own full details.** A guest purchase ("Comprar só com e-mail") keeps name, CPF and phone in that purchase only; no account is created. A signed-in purchase gets a copy of the account's details at that moment (a later fix in the account never changes an old order).
2. **An account is complete before it buys.** After the code and "Crie sua senha", she fills in **name, CPF and phone** ("Seus dados"). The address comes at her first checkout (saved addresses are plan 3).
3. **The "Conta" tab does the same sign-up.** A new e-mail signing in at `/conta` goes code → password → "Seus dados". This **replaces** "an email with no account gets a new, empty account" (`CTA-01`, `CTA-04`).
4. **One CPF per account.** A CPF already in another account is refused with a neutral message. Guest purchases with that CPF don't count: they live only in their orders.
5. **Signed-in checkout:** name, CPF and phone come filled in and **read-only**, like the e-mail; they are changed only in "Dados pessoais" (the CPF never).
6. **Approach 1** for the contract (below), chosen as the one that follows `CLAUDE.md` (additive contract), `CTA-06` (the CPF never changes through the edit call) and the approved account design (one call per step after the code; the code is never held on screen).
7. **"Voltar"** on the "Entrar com senha" form, back to the e-mail step.

## Goals

- Sign-up details: "Seus dados" after the password, at identification and at `/conta`; an account left without them (she closed the app after the password) is sent there before `/checkout` or the account's sections.
- Meus pedidos (`CTA-03`, `CTA-04`), Dados pessoais with the optional password change (`CTA-06`, `CTA-07`), someone else's order (`CTA-11`), and the order page read with the session.
- Signed-in checkout filled in from the account.

## Non-goals

- Saved addresses (plan 3) and privacy (plan 4). Until then those two links still lead to the 404 page.
- Turning a guest purchase into an account, or attaching old guest orders to a new account by CPF.

## Anti-goals

- **The full CPF of an account in the browser.** The account only ever shows `maskedCpf`; checkout never needs the full number from the front end.
- **Someone else's details showing.** Nothing of an account shows before its code or password; "Seus dados" starts empty; a refused CPF doesn't say whose account has it.
- **Asking for details the sale doesn't need** (LGPD): only name, CPF and phone, which the invoice needs anyway.

## Approaches (for the contract)

1. **A call of its own for the sign-up details (chosen).** `PUT /v1/account/details` `{ name, cpf, phone }` saves them once; after that the CPF never changes. `Session` gains an optional `detailsComplete`. All additive; `Customer` keeps its required fields.
2. `PATCH /v1/account` accepting `cpf` only the first time. One call fewer, but the edit call would have two CPF rules, against `CTA-06`.
3. Create the account only at the end, in one call. The account never exists half-done, but the code would have to be held across three screens (against the approved design) or need a temporary token.

## Contract changes (all additive or relaxing)

| Where | Change |
|---|---|
| `PUT /v1/account/details` (new) | Session required. Body `{ name, cpf, phone }` (same rules as checkout). `200` `Customer`. `409` `cpf_in_use` when the CPF is in another account; `409` `details_already_set` when the account already has them; `401`; `422`. |
| `Session` | + optional `detailsComplete` (boolean). |
| `PUT /v1/carts/{cartId}/customer` | With a customer session whose account is complete, `name`, `cpf` and `phone` may be left out: the API copies the account's into the purchase. They leave the schema's `required` list (a request that sent them still works); without a session, missing ones answer `422` as today. **(Agent's call: needed because the front end only has the masked CPF.)** |
| `Problem.code` | + `cpf_in_use`, `details_already_set`, `details_missing`. |
| `POST /v1/orders`, `PUT …/customer` | With a session whose account lacks the details: `409` `details_missing`. |

## Screens

### "Seus dados" (step after the password; `/checkout/identificacao` and `/conta`)

```
Seus dados
  Nome completo  [                ]
  CPF            [                ]
  Celular        [                ]
  [ Continuar ]
```

- Same fields, masks and messages as "Dados e entrega" (`CHK-03`).
- `PUT /v1/account/details`; then `helena_session` is rewritten with `detailsComplete: true` and she goes on to `/checkout` or `/conta`.
- `cpf_in_use`: "Não foi possível usar este CPF. Fale com a loja no WhatsApp", with the WhatsApp link (agent's call for the text). `details_already_set`: treated as done.
- Order after the code: new account → "Crie sua senha" → "Seus dados". Existing account (`IDT-09`) or password sign-in (`IDT-10`) without details → "Seus dados" (no password step). Complete → straight on.
- Survives a reload like the other steps (`helena_identification` with `done: "details"`).

### Gate

- `helena_session` keeps `detailsComplete` (from `Session`, rewritten after "Seus dados").
- Signed in without details: `/checkout`, "Finalizar compra", `/conta` and its sections show "Seus dados" first. Any `details_missing` from the API lands there too and rewrites the cookie.
- `Session.detailsComplete` absent (an older API or the mock): treated as `false`; the `details_already_set` answer then fixes it (agent's call).

### Signed-in checkout

- `GET /v1/account` fills name, phone and the masked CPF, read-only; the e-mail as today. Address, delivery and consents as for a guest.
- The customer step goes without `name`, `cpf` and `phone`; the purchase gets the account's copy.

### Meus pedidos (`/conta/pedidos`; `CTA-03`, `CTA-04`)

- `GET /v1/account/orders`, newest first: number, date, total and state ("Pagamento confirmado", "Em separação", "Enviado", "Entregue", as `PED-03`). Each opens `/pedido/HL-…`.
- None: "Você ainda não tem pedidos" and "Ver novidades" (to `/`) (agent's call for the first text).
- 24 per page with the catalog's pagination (agent's call).

### Order page with the session (`CTA-03`, `CTA-11`)

- `/pedido/[numero]` signed in: read with `Authorization` (the API then includes the full address). Without a session, or when the session's read answers `404`, it falls back to the order-access cookie as today.
- Someone else's order: the same "not found" page as a number that doesn't exist (`CTA-11`).

### Dados pessoais (`/conta/dados`; `CTA-06`, `CTA-07`)

- Shows name, e-mail, phone and the masked CPF ("O CPF não pode ser alterado").
- Name and phone: edited and saved with `PATCH /v1/account`, `CHK-03` validation.
- E-mail: a new one gets a code (`POST /v1/email-codes`), then `PATCH /v1/account` `{ email, code }`; `409` → "Este e-mail já está em outra conta" (agent's call). On success `helena_session`'s `email` is rewritten.
- Password: "Criar senha" or "Trocar senha" by `Customer.hasPassword`, `PUT /v1/account/password`, 8 to 72 characters.

### "Voltar" on "Entrar com senha"

- A secondary button under "Entrar", back to the e-mail step, keeping the typed e-mail.

## Spec changes (`docs/SPEC-CLIENT.md`)

- `IDT-08`: + "Seus dados" after the password. `IDT-09`, `IDT-10`: + "Seus dados" when the account lacks them. New `IDT-14` (sign-up details: fields, `CHK-03` validation, CPF in another account, survives a reload) and `IDT-15` ("Voltar").
- `CTA-01`: a new e-mail goes through the full sign-up (password and "Seus dados"), not an empty account. `CTA-04`: an account with no orders (no longer "a new e-mail").
- `IDT-11`: + name, CPF (masked) and phone read-only. `CHK-05`/`CHK-08` wording: a signed-in purchase copies the account's details.
- Decisions table: new rows 23 (every purchase carries its full details; the account is complete before buying), 24 (one CPF per account), 25 (signed-in checkout read-only from the account).
- `docs/GLOSSARY.md`: "Seus dados" → `details step` / `AccountDetailsForm`; "Meus pedidos" → `/conta/pedidos`, `MyOrdersPage`; "Dados pessoais" → `/conta/dados`, `PersonalDetailsPage`.

## Database draft (`database/schema.sql`)

- `customer.cpf` unique among accounts (filtered unique index on rows that are accounts); guest details stay in the order's own columns (check the draft already does this; add it if not).

## Left to the builder

- Component split (the sign-up form reuses the checkout's field rules from the `checkout` domain's public `index.ts` or moves them to a shared place, without importing from inside another domain).
- The fake API's shape for accounts with details, orders per account and the new codes.
- The test list per scenario and the task order.
