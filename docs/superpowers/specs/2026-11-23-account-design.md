# My account and identification before buying — design

> **Status:** approved by the owner on 2026-11-23, after review (existing account denied; no sales while e-mail is down). The owner chose: identification before buying, with two ways (only e-mail, or a full account with a password), both confirming the e-mail **before paying**; account creation through a new API call (approach A); the account area as `/conta` with four sections; the build order in four plans.

## Intent

Today anyone can buy by typing any e-mail; the store never knows whether that e-mail is hers. The owner wants every purchase tied to an e-mail the customer has proved is hers, and wants the customer to choose, before buying, between buying with that e-mail alone or creating a full account with a password. With a confirmed e-mail, the account can safely show her history, her saved addresses and her personal details, and fill in the next checkout for her.

## Goals

- A new checkout step, **Identificação**, before "Dados e entrega": e-mail, a 6-digit code sent to it, and the choice "Comprar só com e-mail" or "Criar conta" (with a password). Nobody reaches "Dados e entrega" without a confirmed e-mail.
- Signing in from that step or from `/conta`: with the code, or with the password if she has one.
- `/conta` with Meus pedidos, Meus endereços, Dados pessoais, Privacidade and "Sair" (`CTA-02` to `CTA-11`).
- A signed-in customer skips the identification step and gets checkout filled in with her saved details and address.

## Non-goals

- Social sign-in (Google, Apple), two-factor, "remember this device".
- The admin side of accounts.
- Changing the CPF from the screen (`CTA-06` keeps it locked).
- Merging two accounts.

## Anti-goals (a failure even if it works)

- **Someone sees another person's orders, addresses or details** because she typed their e-mail. Nothing tied to an e-mail shows before that e-mail's code was entered (or its password).
- **The screen tells whether an e-mail is a customer**: "send code" always answers the same, for any e-mail (`CTA-01`).
- **A password, a code or a session token in the browser's storage or in a client prop.** Session only in an `httpOnly` cookie.
- **The guest purchase becomes an account in disguise.** "Comprar só com e-mail" confirms the e-mail for that bag only; it creates no session and shows nothing saved (see Constraints).
- **Checkout stuck** because the code e-mail is slow: "Reenviar código" after 30 s, and the bag and everything typed stay.

## Constraints

- Everything in `CLAUDE.md`. Two of its rules need the owner's eye:
  - "NEVER require an account, password or CAPTCHA to buy" still holds: the guest way confirms only the e-mail, with no account and no password. **Confirming the e-mail before paying is new and is the owner's decision of 2026-11-23**; it goes into `CLAUDE.md` (Business rules) and into the spec's decisions table.
  - "NEVER change the contract in a non-additive way": every contract change below is an addition (new paths, new optional fields, new error codes). The existing `/v1/sessions/links` stays in the contract, unused by the store.
- Next.js 16: Server Actions for every step; cookies only written from Server Actions; every account page, query and action checks the session itself (`proxy.ts` is never the only barrier).
- LGPD: identification asks only for the e-mail (and the optional password). Nothing else is collected before "Dados e entrega".

## Approaches (how the account and the confirmation reach the API)

1. **A — New calls for the code, the session and the account (chosen by the owner).** The API sends a 6-digit code to the e-mail; entering it either confirms the e-mail for the bag (guest) or starts a session (account, created if it doesn't exist). The password is set right after with the existing `PUT /v1/account/password`. Additive contract; the password never goes through the bag.
2. B — The password travels with the checkout details (`PUT /v1/carts/{id}/customer`). Fewer calls, but the password would pass through the bag and the lead, and the account would only exist with an order.
3. C — Create the account and open an "unconfirmed" session at once. Two kinds of session in the back end; a mistake there shows someone else's history.

The owner first chose A when the confirmation was still going to happen after payment; with the confirmation moved before payment, A keeps its shape and the e-mail code replaces the confirmation link.

## How it works

### The code

`POST /v1/email-codes` `{ email }` → `202`, the same for any e-mail (sent with her IP, `X-Forwarded-For`). The API sends a 6-digit code to that e-mail, valid for 10 minutes, single use; 5 wrong tries kill it; a new request replaces the old code. Limits: at most 5 codes per hour per e-mail, plus a limit per IP, so nobody can use the store to flood someone's inbox (each code also costs money); past them, `429`. E-mails are trimmed and lowercased before every call.

**If the e-mail service is down, the store doesn't sell (owner's decision of 2026-11-23):** a purchase never goes ahead without a confirmed e-mail, because unconfirmed orders bring refunds and support trouble. If the code hasn't arrived 2 minutes after it was sent, the screen shows, beside "Reenviar código", the store's WhatsApp for help. Monitoring the e-mail sending is a task for the seller panel (pending list, 2026-11-23).

### Identification (`/checkout/identificacao`, new step 2 of 4)

```
Sacola → Identificação → Dados e entrega → Pagamento

  E-mail      [ maria@exemplo.com ]
  ( ) Comprar só com e-mail
  ( ) Criar conta
  Usaremos este e-mail para o pedido e para lembrar você
  de uma compra não concluída.
  [ Receber código ]
  Já tem senha? Entrar com senha
        ↓
  Enviamos um código para maria@exemplo.com
  Código      [ 4 8 2 9 1 7 ]
  [ Confirmar ]   Reenviar código (em 30 s)   Trocar e-mail
        ↓ (only "Criar conta" with a new account)
  Crie sua senha   [ ******** ]  mín. 8
  [ Continuar ]
```

- Neither way comes pre-checked. "Comprar só com e-mail" says in one line that the e-mail is confirmed again at each purchase; "Criar conta" says the account keeps orders and addresses.
- **The reminder notice moves here** from "Dados e entrega": this is where she gives the e-mail now (LGPD: she is told when she hands over the contact).
- **The code step survives a reload.** Switching to the e-mail app can make the Instagram browser reload the page; the e-mail waiting for a code and the chosen way are kept in a short-lived `httpOnly` cookie (`helena_identification`, 10 minutes, written by the Server Action that asked for the code), so she comes back straight to "Digite o código". The code field takes a paste, opens the numeric keyboard (`inputmode="numeric"`, `autocomplete="one-time-code"`).
- **Comprar só com e-mail:** `POST /v1/carts/{cartId}/email-verification` `{ email, code }` → `204`; the bag now holds a confirmed e-mail. No session, nothing saved shows, and checkout is the purchase of today.
- **Criar conta:** `POST /v1/sessions` `{ email, code, cartId }` → `201` session (the bag's e-mail is confirmed in the same call). With `newAccount: true` the account was just created, and only then the screen asks "Crie sua senha" (8 to 72 characters) → `PUT /v1/account/password`. The password is asked **after** the code, so it is never held on screen while she fetches the code, and it is never asked when it won't be used. **If the e-mail already has an account, creating it again is denied (owner's decision of 2026-11-23):** `newAccount: false`, no password is asked, the old one stays, and the screen says "Este e-mail já tem uma conta. Você entrou nela e sua senha não mudou." She is signed in (the code proved the e-mail is hers, so saying the account exists reveals nothing to a stranger) and the purchase goes on. Changing the password is done in Dados pessoais.
- **Entrar com senha:** `POST /v1/sessions` `{ email, password, cartId }` (the existing body, plus `cartId`) → session, bag e-mail confirmed.
- Wrong or expired code, or wrong password: one neutral message, "Código inválido ou vencido" / "E-mail ou senha não conferem". Typed values stay.
- Already signed in: the step is skipped (`/checkout/identificacao` → `/checkout`). A bag started on another day has no confirmed e-mail yet, so `PUT /v1/carts/{id}/customer` sent with the session (`Authorization`) confirms the session's e-mail for that bag; the e-mail in the body must be the session's (agent's call).
- `/checkout` without a confirmed e-mail in the bag → `/checkout/identificacao`. `/checkout/pagamento` needs no check of its own: the API creates an order only for a bag with a confirmed e-mail (agent's call).

### Checkout after identification

- The e-mail field of "Dados e entrega" comes filled with the confirmed e-mail and can't be edited there; "Trocar e-mail" drops the bag's confirmation (`DELETE /v1/carts/{cartId}/email-verification`) and goes back to identification.
- Signed in: name, phone, CPF and the saved address come filled in (the address part arrives with plan 3).
- **An unchecked marketing box at checkout never revokes a consent.** The boxes still come unchecked (`CLAUDE.md`); for a signed-in customer who already accepted a channel, unchecked at checkout means "not now", and revoking happens only in Privacidade (`CTA-08`). The contract's description of the customer step says so (wording only).
- Back-end barrier (contract): `PUT /v1/carts/{id}/customer` answers `422` `email_not_verified` if the e-mail differs from the confirmed one; `POST /v1/orders` answers `409` `email_not_verified` when the bag has no confirmed e-mail. The front end handles both by sending her to identification.

### Session

- Cookie `helena_session`, `httpOnly`, `Secure` in production, `SameSite=Lax`, `path: "/"`, `maxAge` until the session's `expiresAt`. Read by a `server-only` helper in `src/lib/` (shared by checkout, orders and account, like the order cookie).
- Sent to the API as `Authorization: Bearer`. A `401` from any account call deletes the cookie and shows the sign-in screen.
- "Sair" (`CTA-10`): `DELETE /v1/sessions/current`, cookie deleted, back to `/conta`.

### `/conta`

```
Not signed in                         Signed in
Minha conta                           Olá, Maria
E-mail [__________]                   Meus pedidos        ›
[ Receber código ]                    Meus endereços      ›
Entrar com senha                      Dados pessoais      ›
                                      Privacidade         ›
                                      [ Sair ]
```

- Same sign-in as identification, without the bag: code (`POST /v1/sessions` `{ email, code }`) or password. A new e-mail signs in to a new account with no orders (`CTA-04`).
- Sections at `/conta/pedidos`, `/conta/enderecos`, `/conta/dados`, `/conta/privacidade`; each page checks the session and, without one, shows the sign-in.
- Meus pedidos (`CTA-03`, `CTA-04`): `GET /v1/account/orders`, newest first; each opens `/pedido/HL-…`, which now also reads the order with the session (the API then includes the full address).
- Meus endereços (`CTA-05`), Dados pessoais with the optional password (`CTA-06`, `CTA-07`), Privacidade (`CTA-08`, `CTA-09`): as the spec says, through the existing `/v1/account/*` calls.
- **Changing the e-mail in Dados pessoais asks for a code sent to the new e-mail** (`POST /v1/email-codes` to it, then `PATCH /v1/account` with `email` and `code`); otherwise someone could put another person's e-mail on an account. Contract: `PATCH /v1/account` + optional `code`, required when `email` changes (`422` `email_not_verified` without it).
- Someone else's order or address: the same "not found" as a missing one (`CTA-11`; the API already answers `404`).

### Contract additions (all additive)

| Addition | What |
|---|---|
| `POST /v1/email-codes` | `{ email }` → `202`; `422`, `429` |
| `POST /v1/carts/{cartId}/email-verification` | `{ email, code }` → `204`; `401` code wrong or expired (one problem for both); `429` |
| `DELETE /v1/carts/{cartId}/email-verification` | → `204`; the bag needs a new confirmation ("Trocar e-mail") |
| `NewSession` | + `code` (with `email`), + optional `cartId` |
| `Session` | + `newAccount` (boolean; `true` only when this call created the account) |
| `Cart` | + `verifiedEmail` (nullable) |
| `PUT /v1/carts/{cartId}/customer` | + optional `customerSession` (confirms the session's e-mail for the bag); + `422` `email_not_verified` |
| `POST /v1/orders` | + `409` `email_not_verified` |
| `PATCH /v1/account` | + optional `code`, required when `email` changes; + `422` `email_not_verified` |

### Spec changes (before tests)

- New section for identification (`IDT-01`…) covering: the two ways, code sent, wrong/expired code, resend, WhatsApp help after 2 minutes, coming back after a reload, password after the code, existing account denied, "Trocar e-mail", sign-in with password, skip when signed in, redirect without a confirmed e-mail.
- The reminder notice (`CHK-06`) moves to identification; unchecked marketing boxes never revoke (`CHK-07`); `CTA-06` gains the code for a new e-mail.
- `CTA-01` rewritten: sign-in by code (no link). `CTA-07`: the password can also be created at identification.
- `CHK` scenarios that start at "Dados e entrega" gain the Given "a confirmed e-mail"; the e-mail field is read-only there.
- `SAC-02` / `PurchaseSteps`: 4 steps (Sacola, Identificação, Dados e entrega, Pagamento).
- Decisions table: row 10 updated; new row for the confirmation before paying.

### Build order (one plan each, each approved before it starts)

1. Code, identification step, session, sign-in and sign-out, `/conta` home, checkout gate (`IDT-*`, `CTA-01`, `CTA-02`, `CTA-07` at identification, `CTA-10`).
2. Meus pedidos and Dados pessoais with the password (`CTA-03`, `CTA-04`, `CTA-06`, `CTA-07`, `CTA-11`), and the order page read with the session.
3. Meus endereços and the saved address in checkout (`CTA-05`).
4. Privacidade (`CTA-08`, `CTA-09`).

## Agent's calls (for the owner to check)

- **The link in `CTA-01` becomes a code everywhere.** One way to prove the e-mail, in checkout and in `/conta`; she never leaves the store tab with a bag open; and e-mail scanners can't spend a code by opening it. This changes the link approved earlier in the conversation.
- **"Comprar só com e-mail" creates no account and no session.** It keeps the rule "never require an account to buy" true, and nothing saved shows to a guest. She gets her history only if she signs in.
- **Code:** 6 digits, 10 minutes, single use, 5 tries, resend after 30 s, at most 5 codes per hour per e-mail; WhatsApp help shows after 2 minutes without a code.
- **The e-mail is read-only in "Dados e entrega"**, changed only through "Trocar e-mail", so the purchase can never go out with an e-mail she didn't confirm.
- **No separate check on the payment page:** an order only exists for a bag with a confirmed e-mail, and the store has no orders from before this rule.
- **Existing tests:** the checkout, payment and order screen tests start from a bag with a confirmed e-mail through a new fake-API hook, so only the identification tests go through the code screen.

## Left to the builder

Exact copy not given above, the split of components between the `account` and `checkout` domains (shared sign-in form exported from `account`), glossary names, the fake-API shape of codes and sessions, and the test list per scenario.
