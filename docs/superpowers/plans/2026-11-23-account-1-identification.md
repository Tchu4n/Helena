# Account, plan 1: identification, session, sign-in and sign-out — implementation plan

> **Status:** written 2026-11-23 for the owner's review. Same way of working as before: tasks run inline, one at a time; finish a task, report, stop and wait for the go-ahead. The owner makes every commit; "Commit" steps mean "leave the changes in the working tree and suggest the message in Portuguese".

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nobody pays without a confirmed e-mail: a new checkout step `/checkout/identificacao` with a 6-digit code, the choice "Comprar só com e-mail" / "Criar conta", sign-in with code or password, the session cookie, the `/conta` home and "Sair".

**Architecture:** A new `account` domain owns the identification form (one client component with four steps), its Server Actions and two cookies' helpers. The guest way confirms the e-mail on the bag (`POST /v1/carts/{id}/email-verification`); the account way starts a session (`POST /v1/sessions` with the code) kept in the `httpOnly` cookie `helena_session`. Checkout reads `verifiedEmail` from the bag to gate "Dados e entrega" and to fill its read-only e-mail field; the API refuses customer data or an order without it.

**Tech Stack:** Next.js 16.4.6 (App Router, `cacheComponents`), React 19, Tailwind 4, Zod 4, `server-only`, `openapi-typescript`, `node:test`, Playwright. No new dependency.

**Spec:** `docs/superpowers/specs/2026-11-23-account-design.md` (design, approved 2026-11-23); `docs/SPEC-CLIENT.md` sections 8 and 11 as changed in Task 1; `contract/openapi.yaml`; `docs/GLOSSARY.md`.

## Global Constraints

- Everything in `CLAUDE.md` and in the earlier plans' global constraints still applies.
- **Contract:** only the additions in the design's table, plus `Cart.verifiedEmail`. Nothing removed, nothing made required. `/v1/sessions/links` stays, unused.
- **Cookies** (written only from Server Actions; `httpOnly`, `secure` in production, `sameSite: "lax"`, `path: "/"`):
  - `helena_session`: `JSON.stringify({ token, email })` (the e-mail she signed in with, so pages know it without an extra call); `maxAge` = seconds until `Session.expiresAt` (at least 60). Read by `src/lib/session-cookie.ts`; the token is sent as `Authorization: Bearer`.
  - `helena_identification`: `JSON.stringify({ email, way, sentAt })` while a code is pending; `maxAge` 600.
- **Authorization:** every action, query and page of this plan checks the session itself. Any `401` from a call that carried the session (account calls, the customer `PUT`, `POST /v1/orders`) deletes `helena_session` inside that action before it redirects, so a session revoked on the API can never bounce her between `/checkout` and identification. A code, a password or a token never goes into a client prop, the URL or browser storage.
- **Normalizing:** e-mails trimmed and lowercased before every call; the code accepts spaces and keeps the 6 digits.
- **Code timing:** "Reenviar código" enabled 30 s after `sentAt`; WhatsApp help shown 120 s after `sentAt`.
- **Store WhatsApp:** server-only env `STORE_WHATSAPP` (12 or 13 digits), validated in `src/lib/env.ts`, required in production, default `5511900000000` outside it; Playwright's web server gets the same. **The owner supplies the real number before launch.**
- **Exact screen texts:** "Identificação", "E-mail", "Como você quer comprar?", "Comprar só com e-mail", "Você confirma o e-mail a cada compra.", "Criar conta", "Sua conta guarda pedidos e endereços.", "Usaremos este e-mail para o pedido e para lembrar você de uma compra não concluída.", "Receber código", "Já tem senha? Entrar com senha", "Senha", "Entrar", "Enviamos um código para {e-mail}", "Código", "Confirmar", "Reenviar código", "Código reenviado", "Trocar e-mail", "Não recebeu? Fale com a loja no WhatsApp", "Crie sua senha", "Mínimo de 8 caracteres", "Continuar", "Este e-mail já tem uma conta. Você entrou nela e sua senha não mudou.", "Campo obrigatório", "Digite um e-mail válido", "Escolha como quer comprar", "Digite os 6 números do código", "A senha precisa ter pelo menos 8 caracteres", "A senha pode ter no máximo 72 caracteres", "Código inválido ou vencido", "E-mail ou senha não conferem", "Minha conta", "Meus pedidos", "Meus endereços", "Dados pessoais", "Privacidade", "Sair".
- **Purchase steps:** Sacola, Identificação, Dados e entrega, Pagamento.
- **Design:** tokens only, pills for controls, 48px targets with 8px gaps, focus visible, no pre-checked choice, errors with border + icon + text, focus to the first wrong field.

## Review Focus

1. **Someone types another person's e-mail:** nothing saved of that person shows at any step, and "Receber código" answers the same for any e-mail. Tested in Tasks 2 and 3.
2. **She leaves for the e-mail app and the Instagram browser reloads the page:** she comes back to "Enviamos um código para …" with the same way chosen. Tested in Task 2 (`page.reload()` on the code step).
3. **She pastes the code with spaces (" 482 917 "):** accepted. Tested in Task 1 (unit) and Task 2.
4. **She reaches `/checkout` or taps "Ir para pagamento" without a confirmed e-mail** (old tab, expired step, tampered request): sent to identification; the API's `email_not_verified` lands there too. Tested in Task 2.
5. **Signed in, she starts a new bag another day:** identification is skipped, the e-mail comes from the session, and "Ir para pagamento" works. Tested in Task 3.

---

## File structure

```
CLAUDE.md, docs/SPEC-CLIENT.md, docs/GLOSSARY.md, contract/openapi.yaml, src/lib/api-types.ts (generated)
src/lib/env.ts                         + STORE_WHATSAPP
src/lib/session-cookie.ts              readSession, saveSession, clearSession
src/components/ui/Field.tsx            + readOnly
src/components/layout/PurchaseSteps.tsx  4 steps
src/features/account/
  schemas/identification.ts            pure: emailInput, codeInput, passwordInput, wayInput
  identification-cookie.ts             server-only: readIdentification, saveIdentification, clearIdentification
  types.ts                             IdentificationState
  actions/requestCode.ts, confirmCode.ts, createPassword.ts, signInWithPassword.ts, signOut.ts
  components/IdentificationForm.tsx    client: email → code → password | existing
  components/AccountHome.tsx           server: sections + Sair
  index.ts
src/features/cart/views.ts             CartView + verifiedEmail
src/features/checkout/                 DetailsForm (read-only e-mail, reminder notice text), saveLead/goToPayment (session header, email_not_verified)
app/(buy)/checkout/identificacao/page.tsx, app/(buy)/checkout/page.tsx
app/(browse)/conta/page.tsx
tests/identification.test.mjs, tests/cart-view.test.mjs
tests/e2e/identification.spec.ts, tests/e2e/account.spec.ts, tests/e2e/checkout.spec.ts, tests/e2e/order-helpers.ts, tests/e2e/fake-api.mjs, tests/e2e/performance.spec.ts, playwright.config.ts
```

Out of this plan: prefilling name, phone and CPF for a signed-in customer and the account sections' own pages (plan 2; note for it: `Customer.name`, `phone` and `maskedCpf` are required in the contract but a brand-new code account has none, so plan 2 opens with that contract question; and changing the e-mail in Dados pessoais must rewrite `helena_session`'s `email`), saved addresses (plan 3), privacy (plan 4). Until then the four section links lead to the 404 page.

---

### Task 1: Spec, glossary, contract and the identification inputs

**Files:**
- Modify: `CLAUDE.md` (Business rules: "**E-mail:** confirmed with a 6-digit code before paying (owner's decision of 2026-11-23); if the e-mail service is down, the store doesn't sell"), `docs/SPEC-CLIENT.md`, `docs/GLOSSARY.md`, `contract/openapi.yaml`
- Create: `src/features/account/schemas/identification.ts`
- Test: `tests/identification.test.mjs`

**Interfaces:**
- Produces (Zod 4 schemas, each `safeParse`d on a string; the first issue's message is the field error):
  - `emailInput`: trim, lowercase; empty "Campo obrigatório"; over 150 or not an e-mail "Digite um e-mail válido".
  - `codeInput`: remove whitespace; `/^\d{6}$/` else "Digite os 6 números do código".
  - `passwordInput`: under 8 characters "A senha precisa ter pelo menos 8 caracteres", over 72 "A senha pode ter no máximo 72 caracteres"; no trimming.
  - `wayInput`: `"guest" | "account"`, else "Escolha como quer comprar".

- [ ] **Step 1: Spec.** New section "8a. Identification (IDT)" between 8 and 9, scenarios in the design's words: `IDT-01` the two ways, none chosen, and the notice; `IDT-02` code sent, same answer for any e-mail; `IDT-03` guest: right code → "Dados e entrega" with the e-mail read-only; `IDT-04` wrong or expired code → "Código inválido ou vencido", e-mail kept; `IDT-05` "Reenviar código" after 30 s → "Código reenviado"; `IDT-06` no code after 2 minutes → the WhatsApp help, and no sale without the code; `IDT-07` coming back after a reload → the code step; `IDT-08` "Criar conta", new e-mail → "Crie sua senha" → "Dados e entrega", signed in; `IDT-09` "Criar conta", e-mail with an account → the exact message, no password asked, signed in; `IDT-10` "Entrar com senha" right → "Dados e entrega"; wrong → "E-mail ou senha não conferem"; `IDT-11` signed in → step skipped; `IDT-12` `/checkout` without a confirmed e-mail → identification; `IDT-13` "Trocar e-mail" → back to the first step. Rewrite `CHK-01` ("Finalizar compra" → Identificação; no account required: "Comprar só com e-mail" needs no password), `CHK-03` (the e-mail is no longer checked there; it is read-only), `CHK-06` (the e-mail part of the notice moves to `IDT-01`; the phone part stays), `CHK-07` (+ "an unchecked box never revokes a consent given before"), `CTA-01` (sign-in by code, same answer for any e-mail; or password), `CTA-07` (+ "or at identification, with Criar conta"), `SAC-02` (4 steps). Decisions table: row 10 updated; new rows "21 E-mail confirmed before paying, no sale while e-mail is down (2026-11-23)" and "22 Criar conta on an existing e-mail signs in and keeps the password (2026-11-23)".
- [ ] **Step 2: Glossary.** URLs: `/checkout/identificacao` → `IdentificationPage`, `/conta` → `AccountPage`. Terms: identificação `identification`; comprar só com e-mail / criar conta `way`: `guest` / `account`; código `code`; e-mail confirmado `verifiedEmail`; sessão / cookie `helena_session` (`readSession`, `saveSession`, `clearSession`); `helena_identification`; the five actions and two components above; `STORE_WHATSAPP`.
- [ ] **Step 3: Contract.** The additions in the design's table, plus `Cart.verifiedEmail: { type: string, format: email, nullable: true }` (not required); the `customerSession` security alternative on `PUT /v1/carts/{cartId}/customer`; its description gains "An unchecked consent here never revokes one given before (CTA-08)". Problems: `email_not_verified` examples with title "Confirme seu e-mail para continuar". Then `npm run types`.
- [ ] **Step 4: Failing unit tests** in `tests/identification.test.mjs`: `emailInput` `"  MARIA@Exemplo.com "` → `"maria@exemplo.com"`, `""` → "Campo obrigatório", `"maria.exemplo.com"` → "Digite um e-mail válido"; `codeInput` `" 482 917 "` → `"482917"`, `"48291"` and `"48291a"` → "Digite os 6 números do código"; `passwordInput` 7 chars → "A senha precisa ter pelo menos 8 caracteres", 8 and 72 pass, 73 → "A senha pode ter no máximo 72 caracteres", `" abcdefg"` (8 with the space) passes unchanged; `wayInput` `"guest"`, `"account"` pass, `""` → "Escolha como quer comprar".
- [ ] **Step 5:** `npm test` → FAIL (module not found). Implement. `npm test` → PASS; `npx tsc --noEmit` clean; `npm test` also confirms `api-types.ts` is fresh.
- [ ] **Step 6: Commit** — `docs(conta): adiciona a identificação na spec e no contrato e cria as regras dos campos`

---

### Task 2: Guest identification and the checkout gate (`IDT-01` to `IDT-07`, `IDT-12`, `IDT-13`, `CHK-01`, `CHK-03`, `SAC-02`)

**Files:**
- Create: `app/(buy)/checkout/identificacao/page.tsx`, `src/features/account/identification-cookie.ts`, `types.ts`, `actions/requestCode.ts`, `actions/confirmCode.ts`, `components/IdentificationForm.tsx`, `index.ts`
- Modify: `src/lib/env.ts`, `playwright.config.ts`, `src/components/ui/Field.tsx`, `src/components/layout/PurchaseSteps.tsx`, `src/features/cart/views.ts`, `app/(buy)/checkout/page.tsx`, `src/features/checkout/components/DetailsForm.tsx`, `actions/saveLead.ts`, `actions/goToPayment.ts`, `src/features/cart/components/CheckoutBar.tsx` (target of "Finalizar compra")
- Test: `tests/cart-view.test.mjs`, `tests/e2e/identification.spec.ts` (new), `tests/e2e/checkout.spec.ts`, `tests/e2e/order-helpers.ts`, `tests/e2e/fake-api.mjs`

**Interfaces:**
- Consumes: the Task 1 schemas.
- Produces:
  - `type IdentificationState = { step: "email" | "code" | "password" | "existing"; email: string; way: "guest" | "account" | null; sentAt: number | null; errors: { email?: string; way?: string; code?: string; password?: string }; error: string | null; notice: string | null }`.
  - `readIdentification(): Promise<{ email: string; way: "guest" | "account"; sentAt: number } | null>`, `saveIdentification(value)`, `clearIdentification()`.
  - `requestCode(prev: IdentificationState, formData: FormData): Promise<IdentificationState>` — fields `email`, `mode` (`"checkout" | "account"`, checked with `z.enum`) and, only in checkout mode, `way` (checked with `wayInput`); in account mode the way saved is always `"account"`; `POST /v1/email-codes` with `forwardedFor()`; on `202` saves the cookie and returns `step: "code"`; `429` → `error: problem.title`. A second call with only `resend=1` reuses the cookie's e-mail and way and sets `notice: "Código reenviado"`.
  - `confirmCode(prev, formData)` — field `code`; e-mail and way from the cookie only (no cookie → `step: "email"`); guest: bag id from the cart cookie (no cart cookie, or `404` → `redirect("/sacola")`), `POST /v1/carts/{cartId}/email-verification`, `204` → clear the cookie, `redirect("/checkout")`; `401` → `errors.code: "Código inválido ou vencido"`.
  - `changeEmail()` — no input; with the cart cookie, `DELETE /v1/carts/{cartId}/email-verification` (contract addition, `204`), then `clearIdentification()` and `redirect("/checkout/identificacao")`. "Trocar e-mail" is a button that calls it, so the old confirmation is really dropped and `/checkout` is gated again until a new one.
  - `IdentificationForm({ initial, mode, whatsapp, requestCode, confirmCode, createPassword, signInWithPassword })` — `mode: "checkout" | "account"`; `whatsapp` is the digits for `https://wa.me/{digits}`.
  - `CartView.verifiedEmail: string | null`.
  - `DetailsForm` gains `email: string` (read-only field) and `changeEmail?: () => Promise<void>` (absent when signed in: no "Trocar e-mail"). `email` leaves `DETAILS_FIELDS`, so it is neither stored in nor restored from `sessionStorage` (`CHK-23`), and `saveLead`/`goToPayment` send the confirmed e-mail they read on the server (the bag's `verifiedEmail`, or the session's), never a form value.
  - `goToPayment`: `409 email_not_verified` from `POST /v1/orders`, or `422 email_not_verified` from the customer step → `redirect("/checkout/identificacao")`.
- Fake API: `codes` by e-mail (`{ code, tries, expiresAt }`, random 6 digits, 5 tries, 10 min; replaced on each request; 6th request in an hour → `429`; `limite@exemplo.com` → `429` on the first request, as in the other fake routes); `POST /v1/email-codes`; `POST /v1/carts/{id}/email-verification`; `cart.verifiedEmail` in `cartBody`; customer `PUT` with a different e-mail → `422 email_not_verified`; `POST /v1/orders` without `verifiedEmail` → `409 email_not_verified`; `DELETE /v1/carts/{id}/email-verification`; hooks `GET /__codes?email=` (the pending code), `POST /__unverify?cartId=`, and `__carts` accepting `verifiedEmail`; `/__reset` clears codes.

- [ ] **Step 1: Unit test:** `toCartView` carries `verifiedEmail` (`"maria@exemplo.com"` and `null`).
- [ ] **Step 2: Update the existing screen tests for the spec change of Task 1.** `openCheckout` (checkout.spec) and `startPayment` (order-helpers) create the bag with `verifiedEmail: "maria@exemplo.com"`; their fill lists drop "E-mail". In `checkout.spec.ts`: `CHK-01` now expects `/checkout/identificacao` and "Comprar só com e-mail" (`IDT-01`); the `CHK-03` e-mail row moves to `IDT-*`; the "first field with an error" test skips "Celular" instead of "E-mail"; `CHK-02` expects the E-mail field read-only with `maria@exemplo.com`; the lead test that fills "E-mail" stops filling it.
- [ ] **Step 3: Failing screen tests** in `identification.spec.ts` (a bag without `verifiedEmail`, start at `/sacola` → "Finalizar compra"):
  - `IDT-01`: heading "Identificação", the step "Identificação" is `aria-current`, both ways unchecked, the notice text visible; "Receber código" with nothing → "Campo obrigatório" and "Escolha como quer comprar", focus on E-mail.
  - `IDT-02`: `"maria@exemplo.com"` and `"ninguem@exemplo.com"` give the same screen "Enviamos um código para …"; nothing about the cart's old lead shows.
  - `IDT-03`: code from `/__codes` typed as `" 482 917 "`-style with spaces → `/checkout`, E-mail read-only with the confirmed address, "Trocar e-mail" link present.
  - `IDT-04`: `"000000"` (when not the code) → "Código inválido ou vencido"; 5 wrong tries then the right code → still refused.
  - `IDT-05` / `IDT-06` with `page.clock.install()`: "Reenviar código" disabled, enabled after 30 s, tap → "Código reenviado" and `/__codes` has a new code; after 120 s the link "Não recebeu? Fale com a loja no WhatsApp" with `href` `https://wa.me/5511900000000`; `/checkout` still redirects to identification.
  - `IDT-07`: on the code step, `page.reload()` → the code step with the same e-mail.
  - `IDT-12`: `/checkout` with an unconfirmed bag → `/checkout/identificacao`; with `/checkout` open and filled, `POST /__unverify?cartId=` clears the bag's `verifiedEmail`, then "Ir para pagamento" → `/checkout/identificacao` (the API's `email_not_verified`).
  - `IDT-13`: "Trocar e-mail" → the first step, empty e-mail; then `/checkout` typed straight in → back to identification (the old confirmation is gone).
  - `CHK-23` with the read-only e-mail: details stored in the tab while the bag had `ana@exemplo.com`, then a new confirmation of `maria@exemplo.com` → the field shows `maria@exemplo.com` and "Ir para pagamento" reaches `/checkout/pagamento`.
  - `429`: `limite@exemplo.com` → the problem's title in `role="alert"`.
- [ ] **Step 4:** Run the three specs → new tests FAIL, updated ones FAIL only where the screen changed.
- [ ] **Step 5: Implement**, in order: env + config, cookie, actions, form, page (inside `Suspense`; empty bag → `/sacola`; session → `/checkout` (Task 3 makes it real); otherwise `initial` from the cookie), `Field.readOnly`, `PurchaseSteps`, checkout gate (`!cart.verifiedEmail && !session` → identification), `DetailsForm` (its `CHK-06` notice now names only the phone: "Podemos usar seu celular para lembrar você desta compra, se ela não for concluída.", the rest of the sentence unchanged), `goToPayment`. `/checkout/pagamento` gets no check of its own: the API creates an order only for a bag with a confirmed e-mail, and the store has no older orders (it hasn't launched). This is an agent's call recorded in the design for the owner. The way radios are real radios with `required`-style errors from the action (no `required` attribute: the store's own messages).
- [ ] **Step 6:** The three specs and `payment.spec.ts`, `order.spec.ts` → PASS; `npm test`, `npm run lint`, `npx tsc --noEmit`.
- [ ] **Step 7: Commit** — `feat(conta): adiciona a identificação com código por e-mail antes da compra`

---

### Task 3: Account way, password and session (`IDT-08` to `IDT-11`, `CTA-07`, Review focus 5)

**Files:**
- Create: `src/lib/session-cookie.ts`, `src/features/account/actions/createPassword.ts`, `actions/signInWithPassword.ts`
- Modify: `src/features/account/actions/confirmCode.ts`, `components/IdentificationForm.tsx`, `index.ts`, `app/(buy)/checkout/identificacao/page.tsx`, `app/(buy)/checkout/page.tsx`, `src/features/checkout/actions/saveLead.ts`, `goToPayment.ts`, `tests/e2e/fake-api.mjs`
- Test: `tests/e2e/identification.spec.ts`

**Interfaces:**
- Consumes: Task 2's state, cookie and form.
- Produces:
  - `type SessionValue = { token: string; email: string }`; `readSession(): Promise<SessionValue | null>` (a value that doesn't parse → `null`), `saveSession(value: SessionValue, expiresAt: string): Promise<void>`, `clearSession(): Promise<void>`.
  - `confirmCode`, way `account`: `POST /v1/sessions` `{ email, code, cartId? }` → save the session, clear the identification cookie; `newAccount` → `step: "password"`, else `step: "existing"` with `notice` the exact existing-account text.
  - `createPassword(prev, formData)` — session required (none → `step: "email"`); `passwordInput`; `PUT /v1/account/password`; then `redirect` to the hidden field `next`, accepted only if it is `"/checkout"` or `"/conta"`.
  - `signInWithPassword(prev, formData)` — `email`, `password`, `next`; `POST /v1/sessions` `{ email, password, cartId? }`; `401` → `error: "E-mail ou senha não conferem"` (e-mail kept, password cleared).
  - `saveLead`, `goToPayment`: when a session exists, the customer `PUT` carries `Authorization`.
- Fake API: `accounts` by e-mail (`{ password: string | null }`); `sessions` by token; `POST /v1/sessions` with `code` (creates the account if missing; `newAccount`), with `password` (`401` same problem for any mismatch); with `cartId` sets `cart.verifiedEmail`; `PUT /v1/account/password` (bearer, 8 to 72, `422`); hook `POST /__end-session?token=`; customer `PUT` with a bearer whose e-mail equals the body's → sets `verifiedEmail`; hook `POST /__accounts` `{ email, password }`.

- [ ] **Step 1: Failing screen tests** in `identification.spec.ts`:
  - `IDT-08`: "Criar conta", new e-mail, code → "Crie sua senha"; `"curta"` → "A senha precisa ter pelo menos 8 caracteres"; `"senha-segura"` → `/checkout`; cookies hold `helena_session` with `httpOnly: true`; no password in `sessionStorage`/`localStorage`.
  - `IDT-09`: `/__accounts` creates `maria@exemplo.com` with password `"antiga-123"`; "Criar conta", code → the exact message, no password field; "Continuar" → `/checkout`; then `context.clearCookies({ name: "helena_session" })` ("Sair" comes in Task 4) and "Entrar com senha" with `"antiga-123"` works.
  - `IDT-10`: wrong password → "E-mail ou senha não conferem", E-mail kept, password empty; right → `/checkout`.
  - `IDT-11`: signed in, `/checkout/identificacao` → `/checkout`.
  - Review focus 5: signed in, a new bag without `verifiedEmail` → `/checkout` opens (no redirect), E-mail read-only with the session's e-mail, "Trocar e-mail" absent; filling the rest and "Ir para pagamento" → `/checkout/pagamento`.
  - Review focus 1 (account): typing an e-mail that has an account shows nothing of it before the code.
  - Stale session: signed in, the fake drops the token (`POST /__end-session?token=`), a bag without `verifiedEmail`, fill and "Ir para pagamento" → `/checkout/identificacao` showing the first step (no loop), and `helena_session` gone.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement.** Signed in, `DetailsForm` gets `email` from `readSession()` (not from the bag, which may not be confirmed yet) and `canChangeEmail: false`.
- [ ] **Step 4:** Run → PASS; `npm test`, lint, tsc.
- [ ] **Step 5: Commit** — `feat(conta): adiciona criar conta com senha e entrar com senha na identificação`

---

### Task 4: `/conta`, sign-out and final checks (`CTA-01`, `CTA-02`, `CTA-10`)

**Files:**
- Create: `app/(browse)/conta/page.tsx`, `src/features/account/components/AccountHome.tsx`, `actions/signOut.ts`
- Modify: `src/features/account/index.ts`, `tests/e2e/performance.spec.ts`
- Test: `tests/e2e/account.spec.ts` (new)

**Interfaces:**
- Consumes: everything above; `IdentificationForm` with `mode: "account"` (no way choice; the code always signs in, `POST /v1/sessions` without `cartId`; no password step, a new account goes straight to the home, and the password comes with Dados pessoais in plan 2).
- Produces: `AccountHome({ email, signOut })`; `signOut()` — session required; `DELETE /v1/sessions/current` (any answer); `clearSession()`; `redirect("/conta")`.
- Fake API: `DELETE /v1/sessions/current` removes the token; a removed token gets `401`.

- [ ] **Step 1: Failing screen tests** in `account.spec.ts`:
  - `CTA-01`: the "Conta" tab → `/conta` with heading "Minha conta", E-mail, "Receber código", "Já tem senha? Entrar com senha", and no way choice; any e-mail → "Enviamos um código para …"; the code → the home.
  - `CTA-02`: signed in → links "Meus pedidos" (`/conta/pedidos`), "Meus endereços" (`/conta/enderecos`), "Dados pessoais" (`/conta/dados`), "Privacidade" (`/conta/privacidade`), the e-mail shown, and "Sair"; each target 48px tall.
  - `CTA-10`: "Sair" → `/conta` with the sign-in form; `helena_session` gone; the old token gets `401` from the fake (`/__requests` shows the `DELETE`).
  - A tampered `helena_session` value → the sign-in form, cookie deleted.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5: Final checks:** `npm test`, `npx playwright test`, `npm run lint`, `npx tsc --noEmit`, `API_URL=http://localhost:4010 npm run build 2>&1 | tail -20`, and `GER-08` for `/conta` and `/checkout/identificacao` (with a bag) in `performance.spec.ts`. Expected: all clean.
- [ ] **Step 6: Commit** — `feat(conta): adiciona a página da conta com entrar e sair`
