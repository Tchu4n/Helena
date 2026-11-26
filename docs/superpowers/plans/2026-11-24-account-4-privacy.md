# Account, plan 4: privacy (consents and my data) — implementation plan

> **Status:** approved by the owner on 2026-11-24. Task 1 committed (`314bb79`); Tasks 2 and 3 committed (`ea1f209`). **Plan done**: full suite green (187 unit, 270 screen), lint, tsc and build clean. Same way of working as plans 1 to 3: tasks run inline, one at a time; finish a task, report, stop and wait for the go-ahead. The owner makes every commit; "Commit" steps mean "leave the changes in the working tree and suggest the message in Portuguese". Tests (owner's rule of 2026-11-23): at the end of each task only the tests that task touches, plus lint and tsc; the whole suite at the end of Task 3, which closes the block.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A signed-in customer sees and changes her news consent per channel, asks for a copy of her data, and asks for the deletion of her account, which signs her out everywhere until a new sign-in cancels it.

**Architecture:** `/conta/privacidade` is a server page with one client component in the `privacy` domain, reading `GET /v1/account/consents` and calling `PUT /v1/account/consents/{channel}` and `POST /v1/account/data-requests` through Server Actions. Ending every session and cancelling the request on a new sign-in are the API's job (contract, additive); the store clears its own cookie and shows the texts, passed to `/conta` and `/checkout` in the query parameter `exclusao`.

**Tech Stack:** Next.js 16.4.6 (App Router, `cacheComponents`), React 19, Tailwind 4, Zod 4, `server-only`, `openapi-typescript`, `node:test`, Playwright. No new dependency.

**Spec:** `docs/superpowers/specs/2026-11-24-account-4-privacy-design.md`; `docs/SPEC-CLIENT.md` as changed in Task 1; `contract/openapi.yaml`; `docs/GLOSSARY.md`.

## Global Constraints

- Everything in `CLAUDE.md` and plans 1 to 3: the page and every action check the session themselves; Server Action order (authorization, Zod, call, cache); no business rules in `app/`; imports across domains only through `index.ts` or `client.ts`; the client component gets only the fields it shows.
- The privacy domain already has a cookie `Consent` type (`src/features/privacy/consent.ts`); the API's news consent is called `MarketingConsent` in the code, never `Consent`.
- Consent text and version are checkout's: "Quero receber novidades por e-mail", "Quero receber novidades por WhatsApp", `CONSENT_TEXT_VERSION`; the store forwards her IP (`forwardedFor()`), as checkout does.
- A copy goes only to the account's e-mail. Deletion ends every session of the account. Only a sign-in (code with "Criar conta"/the account way, or password) cancels an open deletion; confirming a bag's e-mail for a guest purchase does not.
- Query parameter `exclusao` (Portuguese, the customer sees it): `pedida` on `/conta` after the request, `cancelada` on `/conta` or `/checkout` after a sign-in that cancelled it.
- **Exact screen texts (the owner reviews them all at the end):** "Privacidade", "Novidades", "Quero receber novidades por e-mail", "Quero receber novidades por WhatsApp", "Aceito em {dd/mm/aaaa}", "Cancelado em {dd/mm/aaaa}", "Nunca aceito", "As mensagens dos seus pedidos continuam chegando.", "Preferência salva", "Meus dados", "Você pode pedir uma cópia dos seus dados ou a exclusão da sua conta.", "Os dados das notas fiscais ficam guardados pelo prazo que a lei exige.", "Pedir cópia dos meus dados", "Pedido registrado. Enviaremos a cópia para {e-mail} em até 15 dias.", "Excluir minha conta", "Excluir minha conta?", "Nossa equipe exclui sua conta em até 15 dias. Você sai da conta agora, em todos os aparelhos.", "Se entrar de novo antes disso, o pedido é cancelado.", "Excluir", "Cancelar", "Pedido de exclusão registrado. Você saiu da conta em todos os aparelhos.", "Seu pedido de exclusão foi cancelado porque você entrou de novo.", "Preferências de cookies".
- **Design:** tokens only, pills for controls, 48px targets with 8px gaps, focus visible, the confirmation's "Excluir" and "Cancelar" the same size and color, status lines with `role="status"`, errors with the alert icon.

## Review Focus

1. **She unchecks one channel:** only that channel changes; the other keeps its state and date. Tested in Task 2.
2. **The date line follows the API, not the box:** after a tap the line shows the date the API recorded ("Cancelado em" today), and a failed call puts the box back as it was with the error. Tested in Task 2.
3. **Deletion with two devices signed in:** the other device is signed out on its next page (its token answers `401`). Tested in Task 3.
4. **Signing in again by password and by code:** both cancel the request and show the message once; a reload doesn't show it again. Tested in Task 3.
5. **"Cancelar" in the confirmation, and a double tap on "Excluir":** nothing is sent / one request only. Tested in Task 3.

---

### Task 1: Spec, glossary, contract and database draft

**Files:**
- Modify: `docs/SPEC-CLIENT.md`, `docs/GLOSSARY.md`, `contract/openapi.yaml`, `src/lib/api-types.ts` (`npm run types`), `database/schema.sql`

**Interfaces:**
- Produces (contract, additive): `Session.deletionCancelled` (optional boolean, "`true` when this sign-in cancelled an open deletion request"); descriptions on `PUT /v1/account/consents/{channel}` (the store forwards `X-Forwarded-For`; every change is a new row with channel, accepted, text version, IP, time; never touches the other channel or the order messages), `POST /v1/account/data-requests` (`copy` goes to the account's e-mail within 15 days; `deletion` ends every session of the account, whose tokens answer `401` from then on; a request of a type already open answers `201` without a duplicate) and `POST /v1/sessions` (a sign-in cancels an open deletion; the bag's e-mail verification does not).

- [ ] **Step 1: Spec.** As the design's "Spec changes": `CTA-08` and `CTA-09` rewritten with the texts of the Global Constraints, the line "every news message, with or without an account, carries an option to stop receiving them" under `CTA-08`, decision row 30 (the owner's decisions 1 to 3 of 2026-11-24).
- [ ] **Step 2: Glossary.** `cancelled` beside `open`, `completed`; `/conta/privacidade` → `AccountPrivacyPage`; `deletionCancelled`; query parameter `exclusao` (`pedida`, `cancelada`) → `deletion` (`requested`, `cancelled`); news consent from the API → `MarketingConsent`.
- [ ] **Step 3: Contract** as the Interfaces block, then `npm run types`.
- [ ] **Step 4: Database draft.** `dbo.data_request`: `status` also allows `cancelled`; `cancelled_at DATETIME2(3) NULL`; comment: a sign-in cancels an open deletion (API).
- [ ] **Step 5:** `node --conditions=react-server --test tests/api-types.test.mjs` → PASS; `npx tsc --noEmit` → clean.
- [ ] **Step 6: Commit** — `docs(conta): define a privacidade da conta na spec e no contrato`

---

### Task 2: Privacidade with the news consents (`CTA-08`; Review focus 1, 2)

**Files:**
- Create: `src/features/privacy/views.ts`, `queries/listMyConsents.ts`, `actions/updateConsent.ts`, `components/AccountPrivacy.tsx`, `types.ts`, `app/(browse)/conta/privacidade/page.tsx`
- Modify: `src/features/privacy/index.ts`, `tests/e2e/fake-api.mjs`, `tests/e2e/performance.spec.ts`
- Test: `tests/consent-view.test.mjs`, `tests/e2e/privacy.spec.ts`

**Interfaces:**
- Consumes: `CONSENT_TEXT_VERSION` (checkout `index.ts`); `readSession`, `bearer`, `clearSession` (`src/lib/session-cookie`); `forwardedFor` (`src/lib/request-ip`).
- Produces:
  - `type ConsentView = { channel: "email" | "whatsapp"; label: string; accepted: boolean; line: string }`; `toConsentViews(consents: MarketingConsent[]): ConsentView[]` in `views.ts` (pure): always two, e-mail first; `line` "Aceito em dd/mm/aaaa" (accepted), "Cancelado em dd/mm/aaaa" (not accepted, with `recordedAt`), "Nunca aceito" (no item or no `recordedAt`); dates in `America/Sao_Paulo`.
  - `listMyConsents(): Promise<{ ok: true; consents: ConsentView[]; email: string } | { ok: false; reason: "signed_out" | "error"; title?: string }>` — `server-only`; no session, `detailsComplete: false` or `401` → `signed_out`. `email` is the session's (for Task 3's copy text).
  - `type PrivacyNotice = { notice: string | null; error: string | null; consents?: ConsentView[] }` in `types.ts`.
  - `updateConsent(prev: PrivacyNotice, formData: FormData): Promise<PrivacyNotice>` — fields `channel` (`email` | `whatsapp`, Zod) and `accepted` (`"on"` or absent); `PUT /v1/account/consents/{channel}` with `{ accepted, textVersion: CONSENT_TEXT_VERSION }` and `{ ...(await forwardedFor()), ...bearer(session) }`; success → `refresh()`, notice "Preferência salva"; `401` → `clearSession()` then `redirect("/conta")`; other errors → `error` = the API title.
  - `AccountPrivacy({ email, consents, updateConsent, requestCopy?, requestDeletion? })` (client): Task 2 renders "Privacidade", the "Novidades" section (one box per channel, a tap submits that channel's form at once, the line under it, "As mensagens dos seus pedidos continuam chegando.") and the link "Preferências de cookies" → `/cookies`; Task 3 adds "Meus dados".
  - `/conta/privacidade`: `signed_out` → `redirect("/conta")`; `error` → `ErrorMessage`; else `<AccountPrivacy … />`.
- Fake API: accounts gain `consents: { channel, accepted, textVersion, ip, recordedAt }[]` (history, insert only); `GET /v1/account/consents` → the latest per channel; `PUT /v1/account/consents/{channel}` (`422` without `accepted` boolean or `textVersion`; the IP from `x-forwarded-for`); `/__accounts` accepts `consents`; `GET /__consents?email=` → the history.

- [ ] **Step 1: Failing unit tests** in `tests/consent-view.test.mjs`: `[]` → two views, both "Nunca aceito", e-mail first, labels as the Global Constraints; e-mail accepted at `2026-11-20T15:00:00Z` → "Aceito em 20/11/2026"; WhatsApp revoked at `2026-11-21T02:30:00Z` → "Cancelado em 20/11/2026" (São Paulo time); `{ accepted: false, recordedAt: null }` → "Nunca aceito".
- [ ] **Step 2: Failing screen tests** in `tests/e2e/privacy.spec.ts` (signed in with details as `addresses.spec.ts` does, e-mail accepted on 20/11/2026 via `/__accounts`):
  - `CTA-08` lines: e-mail box checked with "Aceito em 20/11/2026"; WhatsApp unchecked with "Nunca aceito"; "As mensagens dos seus pedidos continuam chegando."; "Preferências de cookies" links to `/cookies`.
  - Review focus 1, 2: uncheck e-mail → "Preferência salva", the e-mail line "Cancelado em {today}", WhatsApp still "Nunca aceito"; `/__consents` has a new e-mail row with `accepted: false`, `textVersion` "2026-11" and an `ip`; the WhatsApp history unchanged.
  - Check WhatsApp → "Aceito em {today}".
  - A failed `PUT` (`/__fail` on that path) → the alert, and after a reload the box shows the API's state.
  - Every box row and link at least 48px tall.
  - Signed out: `/conta/privacidade` → `/conta`.
- [ ] **Step 3:** Run both → FAIL. **Step 4:** Implement. **Step 5:** `node --conditions=react-server --test tests/consent-view.test.mjs tests/consent.test.mjs`, `npx playwright test tests/e2e/privacy.spec.ts tests/e2e/account.spec.ts`, `GER-08` for `/conta/privacidade` signed in (the loop in `performance.spec.ts` gains it), lint, tsc → PASS.
- [ ] **Step 6: Commit** — `feat(conta): adiciona Privacidade com os aceites de novidades por canal`

---

### Task 3: My data: copy and deletion, signed out everywhere, cancelled by a sign-in (`CTA-09`; Review focus 3, 4, 5) — closes the block

**Files:**
- Create: `src/features/privacy/actions/requestMyData.ts`
- Modify: `src/features/privacy/{index.ts,components/AccountPrivacy.tsx}`, `app/(browse)/conta/privacidade/page.tsx`, `src/features/account/actions/{confirmCode,signInWithPassword}.ts`, `src/features/account/components/{AccountHome,IdentificationForm}.tsx` (only to show a notice), `app/(browse)/conta/page.tsx`, `app/(buy)/checkout/page.tsx`, `tests/e2e/fake-api.mjs`, `CLAUDE.md`, `README.md`, this plan's status
- Test: `tests/e2e/privacy.spec.ts`

**Interfaces:**
- Consumes: `PrivacyNotice`, `AccountPrivacy`, `listMyConsents` (Task 2); `Session.deletionCancelled` (Task 1).
- Produces:
  - `requestCopy(prev: PrivacyNotice, formData: FormData): Promise<PrivacyNotice>` — `POST /v1/account/data-requests` `{ type: "copy" }`; notice "Pedido registrado. Enviaremos a cópia para {session e-mail} em até 15 dias."; `401` → `clearSession()`, `redirect("/conta")`; `429` and others → `error` = the API title.
  - `requestDeletion(prev: PrivacyNotice, formData: FormData): Promise<PrivacyNotice>` — `POST … { type: "deletion" }`; success or `401` → `clearSession()` then `redirect("/conta?exclusao=pedida")` (success) / `redirect("/conta")` (`401`); others → `error`.
  - `AccountPrivacy`: "Meus dados" with the two texts, "Pedir cópia dos meus dados", "Excluir minha conta"; the latter opens the confirmation in place (the texts of the Global Constraints, "Excluir" submit and "Cancelar" both `variant="secondary"`); "Excluir" disabled while sending.
  - Sign-in: when `session.data.deletionCancelled`, `confirmCode` and `signInWithPassword` redirect with `?exclusao=cancelada` (`/conta` or `nextPath`), and the code step that answers `existing` adds the cancel line to its notice. `/conta` (signed in or out) shows "Seu pedido de exclusão foi cancelado porque você entrou de novo." for `cancelada` and "Pedido de exclusão registrado. Você saiu da conta em todos os aparelhos." for `pedida`, in a `role="status"` line; `/checkout` shows the `cancelada` line above the form. Only these two values are read; anything else shows nothing.
- Fake API: accounts gain `dataRequests: { type, status, createdAt }[]`; `POST /v1/account/data-requests` (`422` for another type; an open one of the same type → `201` without a new row; `deletion` deletes every token of that account from `sessions`); `POST /v1/sessions` with an open deletion → it becomes `cancelled` and the answer has `deletionCancelled: true`; `GET /__data-requests?email=`.

- [ ] **Step 1: Failing screen tests** in `tests/e2e/privacy.spec.ts`:
  - `CTA-09` copy: "Pedir cópia dos meus dados" → "Pedido registrado. Enviaremos a cópia para maria@exemplo.com em até 15 dias."; still on `/conta/privacidade` signed in; `/__data-requests` has one open `copy`.
  - Review focus 5: "Excluir minha conta" → the confirmation texts; "Excluir" and "Cancelar" have the same height, width and background; "Cancelar" → no request, the confirmation closes.
  - `CTA-09` deletion and review focus 3: a second browser context signed in to the same account; "Excluir" → `/conta?exclusao=pedida` with "Pedido de exclusão registrado…" and "Receber código"; the second context opening `/conta/privacidade` lands on `/conta` signed out.
  - Review focus 4: sign in again with the password → `/conta` with "Seu pedido de exclusão foi cancelado porque você entrou de novo."; `/__data-requests` shows `cancelled`; reload `/conta` → the line is gone. The same with the code at `/conta`.
  - `/conta?exclusao=qualquer` → no status text.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement.
- [ ] **Step 4: Final checks (end of the block):** `npm test`, `npx playwright test`, `npm run lint`, `npx tsc --noEmit`, `API_URL=http://localhost:4010 STORE_WHATSAPP=5511900000000 npm run build 2>&1 | tail -20` → all clean. Update `CLAUDE.md` (plans and specs lines), `README.md` (progress line), the pending note of `/privacidade` (the guest's contact channel for data requests) and this plan's status.
- [ ] **Step 5: Commit** — `feat(conta): permite pedir cópia e exclusão dos dados na Privacidade`
