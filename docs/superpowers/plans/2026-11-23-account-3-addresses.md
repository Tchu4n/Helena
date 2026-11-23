# Account, plan 3: saved addresses, the favorite and the CEP history — implementation plan

> **Status:** written on 2026-11-23, waiting for the owner's review. Same way of working as plans 1 and 2: tasks run inline, one at a time; finish a task, report, stop and wait for the go-ahead. The owner makes every commit; "Commit" steps mean "leave the changes in the working tree and suggest the message in Portuguese". Tests (owner's rule of 2026-11-23): at the end of each task only the tests that task touches, plus lint and tsc; the whole suite at the end of Task 4, which closes the block.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A signed-in customer keeps up to 10 addresses with one favorite, picks one of them in checkout (nothing filled in by itself) and saves a new one with a box already checked; any visitor who accepts "Funcionais" gets her recent shipping CEPs back as suggestions.

**Architecture:** Meus endereços is a server page under `/conta` with one client component and four Server Actions in `account`, through the existing `/v1/account/addresses` calls plus a new favorite call. Signed-in checkout reads the addresses next to the account and passes them to `DetailsForm` as choices; `goToPayment` sends `saveAddress`. The CEP history is a small `localStorage` module in `cart`, read and written only by the two CEP forms when the page says the "Funcionais" consent is on.

**Tech Stack:** Next.js 16.4.6 (App Router, `cacheComponents`), React 19, Tailwind 4, Zod 4, `server-only`, `openapi-typescript`, `node:test`, Playwright. No new dependency.

**Spec:** `docs/superpowers/specs/2026-11-23-account-3-addresses-design.md` (approved 2026-11-23); `docs/SPEC-CLIENT.md` as changed in Task 1; `contract/openapi.yaml`; `docs/GLOSSARY.md`.

## Global Constraints

- Everything in `CLAUDE.md` and in plans 1 and 2 still applies: every action, query and page checks the session itself; Server Action order (authorization, Zod, call, cache); no business rules in `app/`; imports across domains only through `index.ts` or `client.ts`.
- **Nothing is filled in by itself:** no address and no CEP goes into a field without her tap; the favorite is not chosen in checkout.
- **Limits:** 10 addresses per account; 5 CEPs in the history.
- **"Funcionais":** unchecked by default; without it the history is never written, read or shown, and is deleted; it never leaves the device (no cookie, no URL, no API call).
- **"Salvar este endereço na minha conta":** signed in only, checked by default, sent only by "Ir para pagamento" (never by the lead save), never blocks the purchase.
- **Exact screen texts (owner reviews them all at the end):** "Meus endereços", "Você ainda não tem endereços salvos", "Adicionar endereço", "Editar", "Remover", "Remover este endereço?", "Cancelar", "Salvar endereço", "Endereço salvo", "Endereço removido", "Endereço não encontrado", "Tornar favorito", "Favorito", "Endereço favorito atualizado", "Você chegou ao limite de 10 endereços. Remova um para adicionar outro.", "Seus endereços", "Salvar este endereço na minha conta", "Pesquisados recentemente", "Limpar histórico", "Funcionais", "Lembram os CEPs que você pesquisou para calcular o frete, só neste aparelho." Address fields and messages are the checkout's (`CHK-02`, `CHK-03`).
- **Design:** tokens only, pills for controls, 48px targets with 8px gaps, focus visible, "Favorito" with an icon and text (never color alone), the confirmation's "Remover" and "Cancelar" the same size and color.

## Review Focus

1. **She removes the favorite** (or the last address): the newest remaining one becomes the favorite; with none left, the empty text. Tested in Task 2.
2. **A saved address with a CEP other than the bag's:** shipping is recalculated and the `CHK-10` note shows only after her tap, never on opening checkout. Tested in Task 3.
3. **She picks a saved address and then edits a field:** the choice is cleared, and what is sent (and saved, box checked) is the edited address, without a duplicate of the old one. Tested in Task 3.
4. **She withdraws "Funcionais" (or has a consent cookie from before this plan):** the history is gone at once and no suggestion shows. Tested in Task 4.
5. **Keyboard and screen reader on the suggestions:** reachable with Tab, each a 48px button with the CEP in its name, Escape closes the list. Tested in Task 4.

---

## File structure

```
docs/SPEC-CLIENT.md, docs/GLOSSARY.md, contract/openapi.yaml, src/lib/api-types.ts (generated), database/schema.sql
src/features/checkout/schemas/customerDetails.ts   + addressInput (address only), ADDRESS_FIELDS
src/features/checkout/address-fields.ts            ADDRESS_FIELD_SPECS (labels, limits), moved out of DetailsForm
src/features/checkout/{index.ts,client.ts}         export the two above
src/features/checkout/components/DetailsForm.tsx   savedAddresses choices + the save box (Task 3)
src/features/checkout/actions/goToPayment.ts       saveAddress (Task 3)
src/features/account/
  queries/listMyAddresses.ts                       AddressView[] (server-only)
  actions/{saveAddress,removeAddress,makeFavorite}.ts
  components/MyAddresses.tsx                       list, form, confirm (client)
  views.ts                                         toAddressView (pure, unit-tested)
src/features/cart/
  cep-history.ts                                   addCep (pure), readCepHistory, rememberCep, clearCepHistory
  components/CepSuggestions.tsx                    the list under the CEP field (client)
  components/{ShippingCalculator,CartShipping}.tsx remembersCeps prop
  components/ForgetCepHistory.tsx                  clears the history on /cookies when "Funcionais" is off
src/features/privacy/{consent.ts,actions/saveConsent.ts,components/CookiePreferences.tsx}   functional
app/(browse)/conta/enderecos/page.tsx              new
app/(buy)/checkout/page.tsx, app/(buy)/produto/[slug]/page.tsx, app/(buy)/sacola/page.tsx, app/(browse)/cookies/page.tsx
tests/address-view.test.mjs, tests/cep-history.test.mjs, tests/consent.test.mjs
tests/e2e/addresses.spec.ts (new), tests/e2e/cep-history.spec.ts (new), tests/e2e/cookies.spec.ts, tests/e2e/fake-api.mjs, tests/e2e/performance.spec.ts
```

---

### Task 1: Spec, glossary, contract, database draft and the address input

**Files:**
- Modify: `docs/SPEC-CLIENT.md`, `docs/GLOSSARY.md`, `contract/openapi.yaml`, `src/lib/api-types.ts` (`npm run types`), `database/schema.sql`, `src/features/checkout/schemas/customerDetails.ts`, `src/features/checkout/{index.ts,client.ts}`, `src/features/checkout/components/DetailsForm.tsx`
- Create: `src/features/checkout/address-fields.ts`
- Test: `tests/customer-details.test.mjs`

**Interfaces:**
- Produces:
  - `addressInput`: Zod object over `cep, street, number, complement, neighborhood, city, state` with exactly the field schemas `addressDetailsInput` uses (same messages); output the contract's `Address` (`complement: null` when empty). `addressDetailsInput` is rebuilt from it, unchanged in behavior.
  - `ADDRESS_FIELDS = ["cep", "street", "number", "complement", "neighborhood", "city", "state"] as const`; `type AddressField`.
  - `ADDRESS_FIELD_SPECS`: the `ADDRESS` array that today lives in `DetailsForm.tsx` (name, label, autoComplete, maxLength, inputMode, span), moved unchanged; `DetailsForm` imports it.
  - All exported from `checkout/index.ts` and `checkout/client.ts`.
  - Contract (additive), as the design's "Contract and database": `CustomerDetails.saveAddress` (optional boolean, session only); `SavedAddress.favorite` (boolean, in `required`); list order favorite first, then newest; `POST /v1/account/addresses` `409` `address_limit` (new `Problem.code`) at 10; `PUT /v1/account/addresses/{addressId}/favorite` (`operationId: makeFavoriteAddress`, no body, `200` array of `SavedAddress`, `401`, `404`); first address becomes the favorite; removing the favorite passes it to the newest one; dedupe and the 10 skip described in `saveCustomerDetails`.

- [ ] **Step 1: Spec.** As the design's "Spec changes": `CTA-05` rewritten (Meus endereços with the texts, the 10 limit, the favorite, the confirmation, `CTA-11` for another's address); new `CTA-12` (signed-in checkout: "Seus endereços" as choices, favorite first, none chosen, a tap fills the address, editing clears the choice; "Salvar este endereço na minha conta" checked, saved on "Ir para pagamento", no duplicate, skipped at 10, never blocks); new `PRO-15` (CEP history: only with "Funcionais", 5 newest, the same CEP moves to the top, shown on focus while fewer than 8 digits, a tap calculates, "Limpar histórico", deleted when "Funcionais" is withdrawn, failed CEPs never kept) and `SAC-18` ("the bag's CEP field follows `PRO-15`"); `GER-05` + "Funcionais"; decision rows 28 and 29 and the note on row 16.
- [ ] **Step 2: Glossary.** The design's "Glossary" lines, plus `/conta/enderecos` → `MyAddressesPage`, `localStorage` key `helena_ceps` → `cepHistory`.
- [ ] **Step 3: Contract** as the Interfaces block, then `npm run types`.
- [ ] **Step 4: Database draft.** `dbo.customer_address` + `created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()`, `is_favorite BIT NOT NULL DEFAULT 0`, `CREATE UNIQUE NONCLUSTERED INDEX uq_customer_address_favorite ON dbo.customer_address (customer_id) WHERE is_favorite = 1`; comment: 10 per account and the dedupe rule are checked by the API.
- [ ] **Step 5: Failing unit tests** in `tests/customer-details.test.mjs`: `addressInput` gives "Digite um CEP com 8 números" for `"1234"`, "Campo obrigatório" for an empty street, "Digite a sigla do estado, como SP" for `"S"`; a valid address with an empty complement comes out with `complement: null` and digits-only CEP; `addressDetailsInput` output for the existing valid form is unchanged (deep-equal to the current expected object).
- [ ] **Step 6:** `node --conditions=react-server --test tests/customer-details.test.mjs` → the new tests FAIL. **Step 7:** implement. **Step 8:** the same file plus `tests/api-types.test.mjs` → PASS; `npx tsc --noEmit`, `npm run lint`; `npx playwright test tests/e2e/checkout.spec.ts` → PASS (DetailsForm only moved its specs).
- [ ] **Step 9: Commit** — `docs(conta): adiciona endereços salvos, favorito e histórico de CEP na spec e no contrato`

---

### Task 2: Meus endereços with the favorite (`CTA-05`, `CTA-11`; Review focus 1)

**Files:**
- Create: `src/features/account/views.ts`, `queries/listMyAddresses.ts`, `actions/{saveAddress,removeAddress,makeFavorite}.ts`, `components/MyAddresses.tsx`, `app/(browse)/conta/enderecos/page.tsx`
- Modify: `src/features/account/{index.ts,types.ts}`, `tests/e2e/fake-api.mjs`, `tests/e2e/performance.spec.ts`
- Test: `tests/address-view.test.mjs`, `tests/e2e/addresses.spec.ts`

**Interfaces:**
- Consumes: `addressInput`, `ADDRESS_FIELD_SPECS`, `ADDRESS_FIELDS` (Task 1); `SessionValue`, `bearer`, `readSession`, `clearSession` as in plan 2.
- Produces:
  - `type AddressView = { id: string; favorite: boolean; line: string /* "Avenida Paulista, 1000, Apto 12" */; place: string /* "Bela Vista · São Paulo/SP" */; cep: string /* "01310-100" */; fields: Record<AddressField, string> /* as stored, complement "" when null */ }`; `toAddressView(saved: SavedAddress): AddressView` in `views.ts` (pure).
  - `listMyAddresses(): Promise<{ ok: true; addresses: AddressView[] } | { ok: false; reason: "signed_out" | "error"; title?: string }>` — `server-only`; no session or `detailsComplete: false` or `401` → `signed_out`; keeps the API's order.
  - `type AddressFormState = { errors: Partial<Record<AddressField, string>>; error: string | null; saved: boolean }`; `saveAddress(prev, formData)` — optional hidden `id` (uuid) → `PUT /v1/account/addresses/{id}`, else `POST`; `409 address_limit` → `error` = the limit line; `404` → "Endereço não encontrado"; success → `refresh()`, `saved: true`.
  - `type AddressNotice = { notice: string | null; error: string | null }`; `removeAddress(prev, formData)` (`DELETE`, notice "Endereço removido") and `makeFavorite(prev, formData)` (`PUT …/favorite`, notice "Endereço favorito atualizado"); `404` → "Endereço não encontrado"; both `refresh()`.
  - Every action: no session or `detailsComplete: false` → `redirect("/conta")`; `401` → `clearSession()` then `redirect("/conta")`.
  - `/conta/enderecos`: `signed_out` → `redirect("/conta")`; `error` → `ErrorMessage`; else `<MyAddresses addresses={…} limit={10} saveAddress removeAddress makeFavorite />`.
- Fake API: accounts gain `addresses: { id, cep, street, number, complement, neighborhood, city, state, favorite, createdAt }[]`; `GET /v1/account/addresses` (favorite first, then newest); `POST` (`422` on missing fields, `409` `address_limit` at 10, the first becomes favorite); `PUT /{id}`, `DELETE /{id}` (removing the favorite passes it to the newest), `PUT /{id}/favorite`; another account's id → `404`; `/__accounts` accepts `addresses`.

- [ ] **Step 1: Failing unit tests** in `tests/address-view.test.mjs`: `toAddressView` gives `line` "Avenida Paulista, 1000, Apto 12" (and without the complement "Avenida Paulista, 1000"), `place` "Bela Vista · São Paulo/SP", `cep` "01310-100", `fields.complement` `""` for `null`, and keeps `id` and `favorite`.
- [ ] **Step 2: Failing screen tests** in `tests/e2e/addresses.spec.ts` (sign in as `account.spec.ts` does, account with details):
  - `CTA-05` empty: "Você ainda não tem endereços salvos" and "Adicionar endereço".
  - `CTA-05` add: the form with the checkout's labels; empty "Salvar endereço" → "Campo obrigatório" on CEP (focused); valid → "Endereço salvo", the list shows "Avenida Paulista, 1000" with "Favorito" (first address).
  - `CTA-05` edit: "Editar" opens the form filled in; change the number to "2000" → "Endereço salvo", the line shows "Avenida Paulista, 2000".
  - Favorite: a second address (via the screen), "Tornar favorito" on it → "Endereço favorito atualizado", it is now first with "Favorito"; the other shows "Tornar favorito".
  - Review focus 1: "Remover" on the favorite → "Remover este endereço?" → "Remover" → "Endereço removido", the remaining one is "Favorito"; remove it too → the empty text. "Cancelar" in the confirmation keeps the address.
  - Limit: an account with 10 addresses (`/__accounts`) → the limit line, no "Adicionar endereço".
  - `CTA-11`: `removeAddress` with another account's id (post the form with a tampered hidden `id` via `page.evaluate`) → "Endereço não encontrado", her own list unchanged.
  - Every button in the list at least 48px tall.
  - Signed out: `/conta/enderecos` → "Receber código".
- [ ] **Step 3:** Run both → FAIL. **Step 4:** Implement. **Step 5:** `node --conditions=react-server --test tests/address-view.test.mjs`, `npx playwright test tests/e2e/addresses.spec.ts tests/e2e/account.spec.ts`, `GER-08` for `/conta/enderecos` signed in (the loop in `performance.spec.ts` gains it), lint, tsc → PASS.
- [ ] **Step 6: Commit** — `feat(conta): adiciona Meus endereços com favorito e limite de 10`

---

### Task 3: Saved addresses in signed-in checkout and the save box (`CTA-12`; Review focus 2, 3)

**Files:**
- Modify: `app/(buy)/checkout/page.tsx`, `src/features/checkout/components/DetailsForm.tsx`, `src/features/checkout/actions/goToPayment.ts`, `tests/e2e/fake-api.mjs`
- Test: `tests/e2e/addresses.spec.ts`

**Interfaces:**
- Consumes: `listMyAddresses`, `AddressView` (Task 2); `getAccount` (plan 2).
- Produces:
  - `DetailsForm` prop `savedAddresses?: { id: string; favorite: boolean; line: string; place: string; fields: Record<AddressField, string> }[]` (structurally `AddressView`; declared in `checkout`, no import from `account`). Shown only with `account`, as a radio group "Seus endereços" above the address fields; none checked at first; a tap sets the seven address values through the same path as typing (so `watchCep` and the tab storage run); any later change to an address field clears the choice.
  - With `account`: a checkbox `saveAddress`, label "Salvar este endereço na minha conta", `defaultChecked`, outside the tab storage; `toFormData` adds `saveAddress=on` when checked.
  - `goToPayment`: with a session, `saveAddress: formData.get("saveAddress") === "on"` in the customer body; without a session never sent. `saveLead` never sends it.
  - `/checkout` signed in: `listMyAddresses()` next to `getAccount()`; `signed_out` → the same redirect as `getAccount`'s; `error` → no list (checkout still works, she types the address).
- Fake API: customer `PUT` with a session and `saveAddress: true` adds the body's address to the account unless an equal one (CEP, street, number, complement) exists or there are 10 (then skipped, still `200`); the first becomes the favorite.

- [ ] **Step 1: Failing screen tests** (`addresses.spec.ts`, signed in with details and two saved addresses through `/__accounts`, the favorite with CEP `69900-000`, the bag at `01310-100` with PAC chosen):
  - `CTA-12`: "Seus endereços" lists the favorite first with "Favorito"; no choice checked; the address fields are empty; no `CHK-10` note.
  - Review focus 2: tap the favorite → the fields hold its values, shipping is recalculated for Rio Branco and the `CHK-10` note shows.
  - Review focus 3: tap the other address, change "Número" to "2000" → no choice checked; "Ir para pagamento" → `/checkout/pagamento`; `/__customer` has number "2000"; the account (`GET /v1/account/addresses` with the token, via the fake) has the new address once and the old one unchanged.
  - `CTA-12` box: checked by default; unchecked → after "Ir para pagamento" the account's list is unchanged; at 10 addresses, checked → the purchase goes on and the list stays at 10.
  - The lead save never sends `saveAddress` (`/__customer-bodies`: only the last body, from "Ir para pagamento", has it).
  - Guest checkout: no "Seus endereços" and no box.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** `npx playwright test tests/e2e/addresses.spec.ts tests/e2e/identification.spec.ts tests/e2e/checkout.spec.ts`, lint, tsc → PASS.
- [ ] **Step 5: Commit** — `feat(checkout): sugere os endereços salvos e salva o novo endereço na compra logada`

---

### Task 4: "Funcionais" consent and the CEP history (`PRO-15`, `SAC-18`, `GER-05`; Review focus 4, 5) — closes the block

**Files:**
- Create: `src/features/cart/cep-history.ts`, `components/CepSuggestions.tsx`, `components/ForgetCepHistory.tsx`
- Modify: `src/features/privacy/{consent.ts,actions/saveConsent.ts,components/CookiePreferences.tsx}`, `src/features/cart/components/{ShippingCalculator,CartShipping}.tsx`, `src/features/cart/{index.ts,client.ts}`, `app/(buy)/produto/[slug]/page.tsx`, `app/(buy)/sacola/page.tsx`, `app/(browse)/cookies/page.tsx`, `tests/e2e/cookies.spec.ts`, `CLAUDE.md`, `README.md`, this plan's status
- Test: `tests/consent.test.mjs`, `tests/cep-history.test.mjs`, `tests/e2e/cep-history.spec.ts`

**Interfaces:**
- Produces:
  - `Consent = { v: 1; analytics: boolean; marketing: boolean; functional: boolean }`; `parseConsent` reads a cookie without `functional` as `functional: false`; `serializeConsent` writes it; `saveConsent`: "accept" → `true`, "reject" → `false`, custom → the `functional` box.
  - `CookiePreferences`: a third optional category `functional`, "Funcionais", with the text from the Global Constraints, unchecked by default.
  - `cep-history.ts` (browser only, every access in `try`): `type CepEntry = { cep: string /* 8 digits */; place: string | null /* "São Paulo/SP" */ }`; `addCep(list: CepEntry[], entry: CepEntry): CepEntry[]` (pure: entry first, the same CEP removed from below, at most 5; a `null` place keeps the place of the same CEP already in the list); `readCepHistory(): CepEntry[]`; `rememberCep(entry: CepEntry): void`; `clearCepHistory(): void`; key `helena_ceps`.
  - `CepSuggestions({ entries, onPick, onClear }: { entries: CepEntry[]; onPick: (cep: string) => void; onClear: () => void })`: "Pesquisados recentemente", one button per entry named "01310-100 · São Paulo/SP" (CEP alone without a place), "Limpar histórico".
  - `ShippingCalculator` and `CartShipping` gain `remembersCeps: boolean`. True: on focus of the CEP field with fewer than 8 digits typed, the suggestions show; 8 digits, Escape, or focus leaving the field and the list hide them; a pick fills the field and submits the form; a successful calculation calls `rememberCep` (product: the quote's `city/state`; bag: `place: null`). False: never read or write, and `clearCepHistory()` once on mount.
  - Pages: `remembersCeps={(await getConsent())?.functional === true}` (product and bag; inside their Suspense parts). `/cookies` renders `<ForgetCepHistory />` (from `cart/client.ts`) when `functional` is not true; it calls `clearCepHistory()` on mount.

- [ ] **Step 1: Failing unit tests:**
  - `tests/consent.test.mjs`: a v1 cookie without `functional` parses with `functional: false`; `serializeConsent` round-trips `functional: true`.
  - `tests/cep-history.test.mjs`: `addCep` puts the new CEP first; adding a CEP already in the list moves it to the top without a repeat; a sixth CEP drops the oldest; a `null` place keeps the known place of that CEP.
- [ ] **Step 2: Failing screen tests:**
  - `tests/e2e/cookies.spec.ts` `GER-05` (amended): "Funcionais" with its text, unchecked, next to "Análise" and "Marketing".
  - `tests/e2e/cep-history.spec.ts`:
    - `PRO-15` without consent: calculate `01310-100` on the product page, reload, focus the CEP field → no "Pesquisados recentemente"; `localStorage.helena_ceps` is null.
    - `PRO-15` with "Funcionais" (via `/cookies`): calculate `01310-100` then `69900-000`; on another product, focus the empty field → "69900-000 · Rio Branco/AC" first, then "01310-100 · São Paulo/SP"; tap the second → the field holds it and the options show without tapping "Calcular".
    - Six CEPs → five suggestions; calculating one already there moves it to the top.
    - A failed calculation (`/__fail` on the quote path) → that CEP is not suggested.
    - `SAC-18`: in the bag, the CEP field shows the same suggestions; a CEP saved in the bag is suggested on the product page.
    - "Limpar histórico" → no suggestions, `localStorage.helena_ceps` empty.
    - Review focus 4: with history, uncheck "Funcionais" on `/cookies` and save → `localStorage.helena_ceps` is null at once; a consent cookie `{"v":1,"analytics":true,"marketing":true}` (from before) → no suggestions.
    - Review focus 5: Tab from the field reaches the first suggestion (a 48px button whose name includes the CEP); Escape in the field hides the list.
- [ ] **Step 3:** Run → FAIL. **Step 4:** Implement.
- [ ] **Step 5: Final checks (end of the block):** `npm test`, `npx playwright test`, `npm run lint`, `npx tsc --noEmit`, `API_URL=http://localhost:4010 STORE_WHATSAPP=5511900000000 npm run build 2>&1 | tail -20` → all clean. Update `CLAUDE.md` (plans and specs lines), `README.md` (progress line), the pending note of `/privacidade` (it must mention the CEP history) and this plan's status.
- [ ] **Step 6: Commit** — `feat(frete): lembra os CEPs pesquisados com o consentimento de cookies funcionais`
