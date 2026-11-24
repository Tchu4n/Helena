# Account, part 4: privacy (consents and my data) — design

> **Status:** written on 2026-11-24 from the owner's decisions of the same day; waiting for the owner's approval. The owner reviews every screen text once all the screens are done; until then the texts below stand.
> Builds on `2026-11-23-account-design.md` (session, `/conta`) and the plans after it. Scenarios: `CTA-08`, `CTA-09` in `docs/SPEC-CLIENT.md`. References read in full: the LGPD guide and story 20 of the requirements (`docs/referencias/`).

## Why

`/conta` shows "Privacidade", and today the link leads to the 404 page. Story 20: "Como cliente, quero escolher o que aceito receber e controlar meus dados, sem que isso me impeça de comprar." The LGPD (art. 8, §5 and art. 18) gives her the right to revoke a consent and to ask for a copy or the deletion of her data, for free and in a simple way; the LGPD guide asks the same of a small store, which needs at least a channel for these requests even without a data protection officer.

## What the owner decided (2026-11-24)

1. **The privacy page is for customers with an account.** A guest buyer is not given a screen: what was kept of an unfinished purchase is deleted after 30 days (decision 27), and for what an order keeps (the invoice data) she has two ways, written down outside this plan:
   - a contact channel on the privacy policy page `/privacidade` (already in the pending list) to ask for a copy or deletion;
   - every news message, by e-mail or WhatsApp, carries an option to stop receiving them, with or without an account (as the cart reminders already do).
2. **Asking for deletion ends the session at once, on every device.**
3. **Signing in again before the team deletes the account brings it back:** the deletion request is cancelled, and she must ask again if she still wants it.
4. Accepted proposals:
   - "Excluir minha conta" asks first ("Excluir minha conta?"), explains that signing in again cancels the request, and offers "Excluir" and "Cancelar" with the same size and color (like "Remover este endereço?").
   - Asking for a copy does not end the session; the copy goes only to the account's e-mail.
   - She can also **check** a channel here (not only uncheck it), with the same text as checkout, recorded with the text version and her IP.
   - A link to "Preferências de cookies" (`/cookies`) on the same page.

## Goals

- `/conta/privacidade` with three parts: news by channel (`CTA-08`), my data (`CTA-09`), and the cookie preferences link.
- Each channel shows whether she accepted and when; a tap on the box accepts or revokes that channel at once, without touching the other one or the order messages.
- "Pedir cópia dos meus dados" and "Excluir minha conta" record a request for the team.
- Deletion: confirmation, then the request, the end of every session of the account, and `/conta` with the confirmation text.
- A sign-in that cancels a pending deletion says so on the screen she lands on.

## Non-goals

- Doing the copy or the deletion: the team does both (the admin panel comes later).
- Showing her requests and their status: the contract has no reading call; the 429 of the contract stops repeated requests.
- A screen for guests (decision 1).
- The text of the privacy policy (`/privacidade`): it is the owner's, in the pending list.

## Anti-goals (a failure even if it works)

- Any marketing box already checked, or a revocation that needs more than one tap.
- Revoking one channel changing the other one, or stopping the order messages.
- A consent recorded without the text version or the IP.
- A copy of her data sent anywhere but her account's e-mail.
- After asking for deletion, any device still signed in to the account.
- Her believing a deletion is still pending after she signed in again.
- "Excluir" more prominent than "Cancelar", or a deletion sent with a single tap.

## Constraints

- Everything in `CLAUDE.md` and plans 1 to 3: each action and the page check the session; Server Action order; nothing of the API response passed whole to a client component.
- Contract changes are additive.
- Same consent texts and text version as checkout (`CHK-07`, `CONSENT_TEXT_VERSION`), so "accepted" means the same text in both places.
- Deadline shown to her: 15 days (LGPD art. 19, II). A small store (ATPP) may take twice as long, but the screen promises the shorter one. The owner's lawyer may change it later.

## Approaches

1. **The API ends the sessions and cancels the request (chosen).** `POST /v1/account/data-requests` with `deletion` also ends every session of the account; `POST /v1/sessions` on an account with an open deletion cancels it and says so in the answer. The store only clears its own cookie and shows the texts.
2. **The store alone:** it clears its own cookie and nothing else. Dropped: other devices stay signed in, so "ends at once" would not hold, and the API would never know the account came back.
3. **Asking on sign-in whether to cancel:** dropped by the owner's decision 3; signing in cancels by itself.

## The screen (`/conta/privacidade`)

```
Privacidade

NOVIDADES
[ ] Quero receber novidades por e-mail
    Aceito em 20/11/2026            (or "Cancelado em 21/11/2026", or "Nunca aceito")
[ ] Quero receber novidades por WhatsApp
    Nunca aceito
As mensagens dos seus pedidos continuam chegando.

MEUS DADOS
Você pode pedir uma cópia dos seus dados ou a exclusão da sua conta.
Os dados das notas fiscais ficam guardados pelo prazo que a lei exige.
( Pedir cópia dos meus dados )
( Excluir minha conta )

Preferências de cookies  →  /cookies
```

- **A channel box:** a tap sends that channel at once (no "Salvar"); the line under it then shows the new state, and a status line says "Preferência salva". Unchecked → `accepted: false`; checked → `accepted: true`, with `CONSENT_TEXT_VERSION`. The store forwards her IP (`X-Forwarded-For`), as checkout does.
- **"Pedir cópia dos meus dados":** status line "Pedido registrado. Enviaremos a cópia para {e-mail da conta} em até 15 dias."; she stays signed in.
- **"Excluir minha conta":** the box opens in place:
  ```
  Excluir minha conta?
  Nossa equipe exclui sua conta em até 15 dias. Você sai da conta agora, em todos os aparelhos.
  Se entrar de novo antes disso, o pedido é cancelado.
  Os dados das notas fiscais ficam guardados pelo prazo que a lei exige.
  ( Excluir )  ( Cancelar )        ← same size and color
  ```
  "Excluir" → the request, the session cookie cleared, and `/conta` (signed out) with the status line "Pedido de exclusão registrado. Você saiu da conta em todos os aparelhos."
- **After a sign-in that cancelled a deletion** (at `/conta` or at the checkout identification): the screen she lands on says "Seu pedido de exclusão foi cancelado porque você entrou de novo." once.
- Errors: the API's `title` with the alert icon (429: "Muitas tentativas..."); a `401` signs her out and goes to `/conta`, as in plan 2.
- Signed out, or without "Seus dados": `/conta/privacidade` → `/conta`, as the other account pages.

## Contract and database (additive)

- `PUT /v1/account/consents/{channel}`: the description says the store forwards the customer's IP in `X-Forwarded-For` and the API records each change as a new row (channel, accepted, text version, IP, time); revoking one channel never touches the other or the order messages.
- `POST /v1/account/data-requests`: description: `copy` is sent to the account's e-mail within 15 days; `deletion` also ends **every** session of the account (their tokens answer `401` from then on); a request of the same type already open answers `201` again without a duplicate.
- `Session.deletionCancelled` (optional boolean): `true` when this sign-in cancelled an open deletion request. `POST /v1/sessions` description: signing in (code or password) cancels an open deletion. Confirming a bag's e-mail for a guest purchase (`/v1/carts/{cartId}/email-verification`) is not a sign-in and cancels nothing.
- `database/schema.sql`: `dbo.data_request.status` also allows `cancelled`; new `cancelled_at DATETIME2(3) NULL`. The `consent` table already has `ip` and `text_version`.

## Spec changes (`docs/SPEC-CLIENT.md`)

- `CTA-08` rewritten with the texts above: the date line, a tap accepts or revokes, "Preferência salva", "As mensagens dos seus pedidos continuam chegando.", and a new line: every news message, with or without an account, carries an option to stop receiving them.
- `CTA-09` rewritten: the copy (account e-mail, 15 days), the deletion confirmation, every session ended, "Pedido de exclusão registrado...", and signing in again cancels it with its message.
- New decision row 30 (owner's decisions 1 to 3 of 2026-11-24).
- Pending note of `/privacidade`: it must name the contact channel for a guest's data requests.

## Glossary

- pedido de dados cancelado → `cancelled` (beside `open`, `completed`)
- `/conta/privacidade` → `AccountPrivacyPage`
- exclusão cancelada no login → `deletionCancelled`

## Where the code goes (builder's call within these lines)

- `privacy` domain: the consents query and actions, the data request action, the `AccountPrivacy` client component. `account` keeps the session and the sign-in actions; the sign-in actions read `deletionCancelled` and pass the message on to the screen she lands on (how, e.g. a Portuguese query parameter on `/conta` and `/checkout`, is the builder's call).
- The fake API: consents per account (with the IP), data requests per account, deletion ending every session of the account, sign-in cancelling it.

## Tests (by scenario)

- `CTA-08`: the date lines; uncheck e-mail → "Preferência salva", e-mail revoked, WhatsApp unchanged, the IP and text version recorded (fake API); check WhatsApp → accepted; every box and button 48px.
- `CTA-09` copy: the status line with her e-mail; still signed in.
- `CTA-09` deletion: "Cancelar" in the confirmation keeps everything; "Excluir" → `/conta` signed out with the text; a second session (another browser context) is signed out too; signing in again → the cancel message, and the request is `cancelled` in the fake API.
- Signed out → `/conta`.
- `GER-08` for `/conta/privacidade` signed in.

## Calls I made (for the owner to check)

- Deadline on screen: 15 days.
- The date line texts: "Aceito em", "Cancelado em", "Nunca aceito".
- A repeated request of the same type is not an error (the API answers as recorded).
- Confirming the e-mail for a guest purchase does not cancel a pending deletion; only a sign-in does.
