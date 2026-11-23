# Account, plan 2: sign-up details, signed-in checkout, my orders and personal details — implementation plan

> **Status:** approved by the owner on 2026-11-23. Task 1 done and committed (`f22542c`); Task 2 done and committed (`ec04a80`); Task 3 done on 2026-11-23, waiting for the owner's commit; Tasks 4 and 5 to do. Same way of working as before: tasks run inline, one at a time; finish a task, report, stop and wait for the go-ahead. The owner makes every commit; "Commit" steps mean "leave the changes in the working tree and suggest the message in Portuguese".

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An account is a complete customer record (name, CPF, phone) before it buys; signed-in checkout comes filled in from it; the account shows her orders and lets her fix her details.

**Architecture:** A new step "Seus dados" joins the identification form (one more step of the same client component, one more Server Action in `account`). The session cookie learns `detailsComplete` and `expiresAt`, so pages gate on it without an extra call. Signed-in checkout reads `GET /v1/account` and sends the customer step without name, CPF and phone; the API copies the account's. Meus pedidos and Dados pessoais are server pages under `/conta`, each checking the session itself.

**Tech Stack:** Next.js 16.4.6 (App Router, `cacheComponents`), React 19, Tailwind 4, Zod 4, `server-only`, `openapi-typescript`, `node:test`, Playwright. No new dependency.

**Spec:** `docs/superpowers/specs/2026-11-23-account-2-design.md` (approved 2026-11-23), on top of `docs/superpowers/specs/2026-11-23-account-design.md`; `docs/SPEC-CLIENT.md` as changed in Task 1; `contract/openapi.yaml`; `docs/GLOSSARY.md`.

## Global Constraints

- Everything in `CLAUDE.md` and in plan 1's global constraints still applies (cookies only from Server Actions; `httpOnly`, `secure` in production, `sameSite: "lax"`, `path: "/"`; every action, query and page checks the session itself; no code, password, token or full CPF in a client prop, the URL or browser storage).
- **Contract:** only the design's table. Nothing removed. `CustomerDetails.required` loses `name`, `cpf`, `phone` (the one relaxing change the owner approved with the design).
- **Session cookie** `helena_session` = `JSON.stringify({ token, email, detailsComplete, expiresAt })`; a value without `detailsComplete` parses as `false`; `maxAge` from `expiresAt` (at least 60 s).
- **Signed-in purchase:** the front end never sends name, CPF or phone with a session; the screen shows `maskedCpf` only.
- **A new identification ends any old session:** `requestCode` and `signInWithPassword` call `clearSession()` first, so a stale session can never send a guest back and forth.
- **Exact screen texts (new):** "Seus dados", "Nome completo", "CPF", "Celular", "Continuar", "Não foi possível usar este CPF.", "Fale com a loja no WhatsApp", "Voltar", "Meus pedidos", "Você ainda não tem pedidos", "Ver novidades", "Anterior", "Próxima", "Dados pessoais", "E-mail", "O CPF não pode ser alterado", "Salvar", "Dados salvos", "Trocar e-mail", "Novo e-mail", "Receber código", "Enviamos um código para {e-mail}", "Código", "Confirmar", "Este e-mail já está em outra conta", "E-mail trocado", "Criar senha", "Trocar senha", "Nova senha", "Senha salva". Field messages are the checkout's (`CHK-03`) and plan 1's.
- **Order states on screen:** "Aguardando pagamento", "Pagamento confirmado", "Em separação", "Enviado", "Entregue", "Cancelado": reuse the labels the `orders` domain already has for `PED-03`.
- **Design:** tokens only, pills for controls, 48px targets with 8px gaps, focus visible, errors with border + icon + text, focus to the first wrong field.

## Review Focus

1. **The Instagram browser reloads on "Seus dados"** (she went to look for her CPF): she comes back to "Seus dados", still signed in. Tested in Task 2.
2. **She finished "Seus dados" on another phone** (this cookie still says `detailsComplete: false`): saving again gets `details_already_set`, the cookie is fixed and she goes on with no error. Tested in Task 2.
3. **The session ended on the API while she was in checkout** (`GET /v1/account` answers `401`): she lands on identification's first step, can buy as a guest, and is never bounced between pages. Tested in Task 3.
4. **Signed in, she opens an order she follows by the order-lookup cookie but that isn't hers**: the session read says `404`, the lookup access still shows it as before (reduced data). Tested in Task 4.
5. **She changes her e-mail to one that has another account:** "Este e-mail já está em outra conta", the session keeps the old e-mail, nothing else changes. Tested in Task 5.

---

## File structure

```
CLAUDE.md, README.md, docs/SPEC-CLIENT.md, docs/GLOSSARY.md, contract/openapi.yaml, src/lib/api-types.ts (generated), database/schema.sql
src/lib/session-cookie.ts                       + detailsComplete, expiresAt; saveSession(value)
src/features/checkout/schemas/customerDetails.ts  contactInput, addressDetailsInput (signed in)
src/features/checkout/{index.ts,client.ts}        export contactInput, CONTACT_FIELDS
src/features/account/
  types.ts                                       step "details"; errors name, cpf, phone
  identification-cookie.ts                       done + "details"
  actions/saveAccountDetails.ts                  new
  actions/confirmCode.ts, createPassword.ts, signInWithPassword.ts, requestCode.ts
  queries/getAccount.ts, queries/listMyOrders.ts new (server-only)
  actions/updateContact.ts, requestEmailChange.ts, confirmEmailChange.ts, setPassword.ts   new (Task 5)
  components/IdentificationForm.tsx              details step, "Voltar"
  components/MyOrders.tsx, components/PersonalDetails.tsx   new
src/features/checkout/                           DetailsForm (signed-in contact read-only), saveLead, goToPayment
src/features/cart/actions/goToCheckout.ts        gate on detailsComplete
src/features/orders/queries/getOrder.ts          session first, then the access cookie
app/(buy)/checkout/page.tsx, app/(buy)/checkout/identificacao/page.tsx
app/(browse)/conta/page.tsx, app/(browse)/conta/pedidos/page.tsx, app/(browse)/conta/dados/page.tsx
tests/customer-details.test.mjs, tests/session-cookie.test.mjs (if the parse is unit-testable without next/headers; else e2e only)
tests/e2e/identification.spec.ts, tests/e2e/account.spec.ts, tests/e2e/checkout.spec.ts, tests/e2e/fake-api.mjs, tests/e2e/performance.spec.ts
```

---

### Task 1: Spec, glossary, contract, database draft and the contact inputs

**Files:**
- Modify: `docs/SPEC-CLIENT.md`, `docs/GLOSSARY.md`, `contract/openapi.yaml`, `src/lib/api-types.ts` (`npm run types`), `database/schema.sql`, `src/features/checkout/schemas/customerDetails.ts`, `src/features/checkout/index.ts`, `src/features/checkout/client.ts`
- Test: `tests/customer-details.test.mjs`

**Interfaces:**
- Produces:
  - `contactInput`: Zod object `{ name, cpf, phone }` with exactly the field schemas `customerDetailsInput` uses today (same messages); `customerDetailsInput` is rebuilt from it, unchanged in behavior.
  - `addressDetailsInput`: `customerDetailsInput` without `name`, `cpf`, `phone`; output `Omit<CustomerDetails, "email" | "name" | "cpf" | "phone">`.
  - `CONTACT_FIELDS = ["name", "cpf", "phone"] as const`.
  - All three exported from `checkout/index.ts` and `checkout/client.ts`.
  - Contract (design's table): `PUT /v1/account/details` (`operationId: saveAccountDetails`, body `AccountDetails { name, cpf, phone }` all required with the `CustomerDetails` rules; `200` `Customer`; `401`; `409` `cpf_in_use` / `details_already_set`; `422`); `Session.detailsComplete` (optional boolean); `CustomerDetails.required` = `[email, address, consents]` with the description of the session copy; `Problem.code` + `cpf_in_use`, `details_already_set`, `details_missing`; `409` `details_missing` on `PUT …/customer` and `POST /v1/orders`.

- [ ] **Step 1: Spec.** As the design's "Spec changes" section: `IDT-08` to `IDT-11` amended; new `IDT-14` (Seus dados: the three fields with `CHK-03` messages; "Não foi possível usar este CPF." + "Fale com a loja no WhatsApp"; survives a reload; an account without details is sent there from `/checkout` and `/conta`) and `IDT-15` ("Voltar" back to the e-mail step, e-mail kept); `CTA-01`, `CTA-04` rewritten; `CTA-06` + the texts of the Global Constraints; `CHK-05`/`CHK-08` wording; decision rows 23, 24, 25.
- [ ] **Step 2: Glossary.** "Seus dados" → `details` step, `saveAccountDetails`; "Meus pedidos" `/conta/pedidos` → `MyOrdersPage`; "Dados pessoais" `/conta/dados` → `PersonalDetailsPage`; `?pagina=` on `/conta/pedidos` → `page` (as in the catalog, if it already uses it); "sessão encerrada" `?sessao=encerrada` on `/checkout/identificacao` → `sessionEnded` (Task 3).
- [ ] **Step 3: Contract** as the Interfaces block, then `npm run types`.
- [ ] **Step 4: Database draft.** `dbo.customer` gets `is_account BIT NOT NULL DEFAULT 0`; `name`, `cpf`, `phone` become `NULL` with `CHECK (is_account = 1 OR (name IS NOT NULL AND cpf IS NOT NULL AND phone IS NOT NULL))`; `uq_customer_cpf` and `uq_customer_email` become filtered unique indexes, one pair `WHERE is_account = 1` and one pair `WHERE is_account = 0`; comment: a guest's lead and an account are different rows; a signed-in order points to the account row and keeps its own copy of the details (rows 23, 24).
- [ ] **Step 5: Failing unit tests** in `tests/customer-details.test.mjs`: `contactInput` gives the same messages as `customerDetailsInput` for an empty name, `"123"` as CPF ("CPF deve ter 11 números"), `"52998224724"` ("CPF inválido"), `"1199"` as phone ("Digite o celular com DDD"); `addressDetailsInput` accepts the address part of `VALID` without name/CPF/phone and its output has no `name`, `cpf`, `phone` keys; `customerDetailsInput` output for a full valid form is unchanged (deep-equal to today's expected object in the existing test).
- [ ] **Step 6:** `npm test` → the new tests FAIL. **Step 7:** implement. **Step 8:** `npm test`, `npx tsc --noEmit`, `npm run lint` → PASS (the "types are fresh" test included).
- [ ] **Step 9: Commit** — `docs(conta): adiciona cadastro da conta, pedidos e dados pessoais na spec e no contrato`

---

### Task 2: "Seus dados", the gate and "Voltar" (`IDT-08` to `IDT-10`, `IDT-14`, `IDT-15`, `CTA-01`; Review focus 1, 2)

**Files:**
- Create: `src/features/account/actions/saveAccountDetails.ts`
- Modify: `src/lib/session-cookie.ts`, `src/features/account/{types.ts,identification-cookie.ts,index.ts}`, `actions/{confirmCode,createPassword,signInWithPassword,finishIdentification}.ts`, `components/IdentificationForm.tsx`, `app/(buy)/checkout/identificacao/page.tsx`, `app/(buy)/checkout/page.tsx`, `app/(browse)/conta/page.tsx`, `src/features/cart/actions/goToCheckout.ts`, `src/features/checkout/actions/goToPayment.ts`, `tests/e2e/fake-api.mjs`
- Test: `tests/e2e/identification.spec.ts`, `tests/e2e/account.spec.ts`

**Interfaces:**
- Consumes: `contactInput`, `CONTACT_FIELDS` (Task 1).
- Produces:
  - `type SessionValue = { token: string; email: string; detailsComplete: boolean; expiresAt: string }`; `saveSession(value: SessionValue): Promise<void>` (the second parameter goes; update plan 1's callers).
  - `IdentificationState.step` + `"details"`; `errors` + `name`, `cpf`, `phone`; `PendingIdentification.done` + `"details"`.
  - After a session starts (code, password; checkout or `/conta`): `newAccount` → `"password"`; else `detailsComplete` → `redirect(next)` (checkout way: `IDT-09`'s message first, as now); else `"details"`. `createPassword` success → `"details"` (no redirect). Each sets `done` in `helena_identification`.
  - `saveAccountDetails(prev, formData)`: session required (none → `START`); `contactInput`; `PUT /v1/account/details` with `bearer`; `200` or `409 details_already_set` → `saveSession({ ...session, detailsComplete: true })`, `clearIdentification()`, `redirect(nextPath(formData))`; `409 cpf_in_use` → `errors.cpf = "Não foi possível usar este CPF."` and the form shows the link "Fale com a loja no WhatsApp" under that field; `401` → `clearSession()`, `START`.
  - Gate: signed in with `detailsComplete: false` → `/checkout`, `goToCheckout` and `/checkout/identificacao` show/route to the details step; `/conta` shows the form at the details step. `details_missing` from `goToPayment`'s customer step → `saveSession({ ...session, detailsComplete: false })`, `redirect("/checkout/identificacao")`.
  - `/conta` new e-mail: code → "Crie sua senha" → "Seus dados" → home (no `cartId` sent, as in plan 1).
  - "Voltar" on the password sign-in form: client-only, back to the e-mail step with the typed e-mail.
- Fake API: accounts gain `details: { name, cpf, phone } | null`; `POST /v1/sessions` answers `detailsComplete: Boolean(account.details)`; `PUT /v1/account/details` (bearer; `422` on missing fields; `409 cpf_in_use` when another account has the CPF; `409 details_already_set`); `/__accounts` accepts `details`; customer `PUT` with a session whose account has no details → `409 details_missing`.

- [ ] **Step 1: Failing screen tests:**
  - `IDT-08` (amended): after "Crie sua senha" → heading "Seus dados"; empty "Continuar" → "Campo obrigatório" on Nome completo (focused); valid `VALID` name/CPF/phone → `/checkout`; the cookie's JSON has `detailsComplete: true`.
  - `IDT-09` (amended): an account without details → the message, "Continuar" → "Seus dados"; with details (via `/__accounts`) → `/checkout` as now.
  - `IDT-10` (amended): password sign-in into an account without details → "Seus dados".
  - `IDT-14`: CPF `52998224725` already in another account (`/__accounts` with details) → "Não foi possível usar este CPF." and the WhatsApp link to `https://wa.me/5511900000000`; Review focus 1: `page.reload()` on "Seus dados" → still "Seus dados"; Review focus 2: the fake gets the details behind the screen's back (`/__accounts` again for the same e-mail with details), "Continuar" → `/checkout` with no message.
  - Gate: signed in without details (sign up, stop at "Seus dados"), `page.goto("/checkout")` → `/checkout/identificacao` showing "Seus dados"; `page.goto("/conta")` → "Seus dados".
  - `IDT-15`: "Já tem senha? Entrar com senha", type an e-mail, "Voltar" → "Receber código" visible and the e-mail kept.
  - `CTA-01` (amended, `account.spec.ts`): new e-mail at `/conta` → "Crie sua senha" → "Seus dados" → "Sair" visible. Update `signIn` in `account.spec.ts` to create the account with details through `/__accounts` first, so the other account tests keep going straight home.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** `npx playwright test tests/e2e/identification.spec.ts tests/e2e/account.spec.ts` → PASS; then the whole suite, `npm test`, lint, tsc.
- [ ] **Step 5: Commit** — `feat(conta): adiciona o cadastro Seus dados depois da senha e o botão Voltar`

---

### Task 3: Signed-in checkout filled in from the account (`IDT-11`, `CHK-05`, `CHK-08`; Review focus 3)

**Files:**
- Create: `src/features/account/queries/getAccount.ts`
- Modify: `src/features/account/index.ts`, `actions/requestCode.ts`, `actions/signInWithPassword.ts`, `app/(buy)/checkout/page.tsx`, `app/(buy)/checkout/identificacao/page.tsx`, `src/features/checkout/components/DetailsForm.tsx`, `src/features/checkout/actions/{saveLead,goToPayment}.ts`, `tests/e2e/fake-api.mjs`
- Test: `tests/e2e/identification.spec.ts`, `tests/e2e/checkout.spec.ts`

**Interfaces:**
- Consumes: `addressDetailsInput`, `CONTACT_FIELDS` (Task 1); `SessionValue` (Task 2).
- Produces:
  - `getAccount(): Promise<{ ok: true; account: AccountView } | { ok: false; reason: "signed_out" | "error"; title?: string }>` (`server-only`, session required, `GET /v1/account` with `bearer`; `401` → `signed_out`); `type AccountView = { name: string; email: string; phone: string; maskedCpf: string; hasPassword: boolean }`.
  - `DetailsForm` prop `account?: { name: string; maskedCpf: string; phone: string }`: when present the three contact fields are read-only (`Field` with `id`, no `name`), left out of the form data, the client validation and the tab storage (`CHK-23`); the phone shown formatted "(11) 98765-4321".
  - `saveLead`, `goToPayment`: with a session they parse `addressDetailsInput` and send the body without `name`, `cpf`, `phone`; without one, as today.
  - `/checkout` signed in: `getAccount()`; `signed_out` → `redirect("/checkout/identificacao?sessao=encerrada")`; `error` → `ErrorMessage`. `/checkout/identificacao?sessao=encerrada` never skips the step and shows the first one.
  - `requestCode`, `signInWithPassword`: `clearSession()` before anything else.
- Fake API: `GET /v1/account` (bearer; `401`; `200` `{ name, email, phone, maskedCpf, hasPassword }`, `maskedCpf` as `***.456.789-**` from the stored CPF); customer `PUT` with a session whose account has details copies `name`, `cpf`, `phone` from the account before `validCustomer`.

- [ ] **Step 1: Failing screen tests:**
  - `IDT-11` (amended): signed in with details (`/__accounts` with `{ name: "Maria Souza", cpf: "52998224725", phone: "11987654321" }`), new bag → `/checkout` shows Nome completo "Maria Souza", CPF "***.982.247-**", Celular "(11) 98765-4321", all `readonly`; fill only the address → "Ir para pagamento" → `/checkout/pagamento`; `/__customer?cartId=` shows `cpf: "52998224725"` (copied by the API); no request body the store sent contains `"cpf"` (check `/__requests` bodies if the fake logs them; else add `customerBodies` to the fake as `paymentBodies` does).
  - `CHK-23` signed in: `sessionStorage.helena_checkout` holds no name, CPF or phone after filling the address.
  - Review focus 3: signed in, the fake ends the session, `page.goto("/checkout")` → `/checkout/identificacao?sessao=encerrada` showing "Receber código"; ask a code as a guest and confirm → `/checkout` with the guest form (Nome completo editable); no more than one redirect in between.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** whole e2e suite, `npm test`, lint, tsc → PASS.
- [ ] **Step 5: Commit** — `feat(checkout): preenche nome, CPF e celular da conta na compra logada`

---

### Task 4: Meus pedidos and the order page with the session (`CTA-03`, `CTA-04`, `CTA-11`; Review focus 4)

**Files:**
- Create: `src/features/account/queries/listMyOrders.ts`, `components/MyOrders.tsx`, `app/(browse)/conta/pedidos/page.tsx`
- Modify: `src/features/account/index.ts`, `src/features/orders/queries/getOrder.ts`, `tests/e2e/fake-api.mjs`
- Test: `tests/e2e/account.spec.ts`

**Interfaces:**
- Produces:
  - `listMyOrders(page: number): Promise<{ ok: true; orders: MyOrderView[]; total: number; perPage: number } | { ok: false; reason: "signed_out" | "error"; title?: string }>`, 24 per page; `type MyOrderView = { number: string; date: string /* "23/11/2026" */; total: string /* formatPrice */; status: string /* the PED-03 label */ }`.
  - `/conta/pedidos?pagina=N`: signed out or `signed_out` → the sign-in form (as `/conta`); none → "Você ainda não tem pedidos" + `Button` "Ver novidades" to `/`; each order a 48px link to `/pedido/{number}`; "Anterior" / "Próxima" like the catalog's pagination.
  - `getOrder(number)`: with a session, first `GET /v1/orders/{number}` with `bearer`; `200` → shown; `401`/`404` → the access-cookie path as today (which may still say `no_access`).
- Fake API: an order created from a cart whose customer step went with a session stores `accountEmail`; `GET /v1/account/orders` (bearer, newest first, `page`/`perPage`); `GET /v1/orders/{number}` with a bearer: `accountEmail` equal → `200` with `delivery.address`, else `404`.

- [ ] **Step 1: Failing screen tests:**
  - `CTA-03`: signed in, two orders bought through the screens (reuse `startPayment` from `order-helpers.ts`), `/conta/pedidos` lists the newer first with "HL-…", the date, "R$ …" and "Aguardando pagamento"; tapping one opens `/pedido/HL-…` with the delivery address visible.
  - `CTA-04`: signed in with no orders → "Você ainda não tem pedidos"; "Ver novidades" → `/`.
  - `CTA-11`: signed in as Ana, `page.goto` Maria's order number → the lookup form (the same as for a number that doesn't exist).
  - Review focus 4: with Maria's tracking cookie (lookup first), signed in as Ana → Maria's order still shows through the lookup access, without the address.
  - Signed out: `/conta/pedidos` → "Receber código".
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** whole e2e suite, `npm test`, lint, tsc → PASS.
- [ ] **Step 5: Commit** — `feat(conta): adiciona Meus pedidos e a leitura do pedido com a sessão`

---

### Task 5: Dados pessoais and final checks (`CTA-06`, `CTA-07`; Review focus 5)

**Files:**
- Create: `src/features/account/actions/{updateContact,requestEmailChange,confirmEmailChange,setPassword}.ts`, `components/PersonalDetails.tsx`, `app/(browse)/conta/dados/page.tsx`
- Modify: `src/features/account/index.ts`, `src/features/account/types.ts`, `tests/e2e/fake-api.mjs`, `tests/e2e/performance.spec.ts`, `CLAUDE.md`, `README.md`, this plan's status
- Test: `tests/e2e/account.spec.ts`

**Interfaces:**
- Consumes: `getAccount` (Task 3), `contactInput` (Task 1), `emailInput`, `codeInput`, `passwordInput` (plan 1).
- Produces (each action: session required, else `{ ...START-like signed-out state }` that makes the page show the sign-in; `401` → `clearSession()`):
  - `updateContact(prev: ContactState, formData) → ContactState` — `contactInput.pick({ name, phone })`; `PATCH /v1/account` `{ name, phone }`; success notice "Dados salvos".
  - `requestEmailChange(prev: EmailChangeState, formData)` — `emailInput`; `POST /v1/email-codes` with `forwardedFor()`; keeps the new e-mail in `helena_identification` (`way: "account"`, `done` unset); state `step: "code"`.
  - `confirmEmailChange(prev, formData)` — `codeInput`; `PATCH /v1/account` `{ email, code }`; `409` → "Este e-mail já está em outra conta" (session unchanged); `401` from a wrong code → "Código inválido ou vencido"; success → `saveSession({ ...session, email })`, `clearIdentification()`, notice "E-mail trocado".
  - `setPassword(prev, formData)` — `passwordInput`; `PUT /v1/account/password`; notice "Senha salva".
  - `/conta/dados`: signed out → sign-in form; shows name, phone (editable, "Salvar"), the masked CPF read-only with "O CPF não pode ser alterado", the e-mail with "Trocar e-mail" (opens "Novo e-mail" + "Receber código", then "Código" + "Confirmar"), and "Criar senha" or "Trocar senha" by `hasPassword` (field "Nova senha").
- Fake API: `PATCH /v1/account` (bearer; `name`/`phone` update details; `email` + `code` via `takeCode(newEmail, code)`, `409` when the e-mail has another account, moves the account and its sessions' e-mail); `GET /v1/account` reflects it.

- [ ] **Step 1: Failing screen tests:**
  - `CTA-06`: signed in with details → name, "(11) 98765-4321", "***.982.247-**" read-only and "O CPF não pode ser alterado"; change the phone to "(21) 99999-8888", "Salvar" → "Dados salvos", reload shows it; empty name → "Campo obrigatório".
  - `CTA-06` e-mail: "Trocar e-mail", "nova@exemplo.com", code → "E-mail trocado", `/conta` shows the new e-mail, the cookie's JSON has it.
  - Review focus 5: "Trocar e-mail" to an e-mail with another account → "Este e-mail já está em outra conta"; `/conta` still shows the old e-mail.
  - `CTA-07`: account without a password → "Criar senha", "curta" → "A senha precisa ter pelo menos 8 caracteres", "senha-nova-1" → "Senha salva"; after `context.clearCookies({ name: "helena_session" })`, "Entrar com senha" with it works; then the page offers "Trocar senha".
  - Signed out: `/conta/dados` → "Receber código".
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5: Final checks:** `npm test`, `npx playwright test`, `npm run lint`, `npx tsc --noEmit`, `API_URL=http://localhost:4010 STORE_WHATSAPP=5511900000000 npm run build 2>&1 | tail -20`, and `GER-08` for `/conta/pedidos` and `/conta/dados` signed in, in `performance.spec.ts`. Expected: all clean. Update `CLAUDE.md` (plans line), `README.md` (progress line) and this plan's status.
- [ ] **Step 6: Commit** — `feat(conta): adiciona Dados pessoais com troca de e-mail e senha`
