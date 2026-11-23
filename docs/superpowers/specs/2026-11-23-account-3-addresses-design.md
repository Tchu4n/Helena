# Account, part 3: saved addresses and the CEP history — design

> **Status:** approved by the owner on 2026-11-23, with two additions: a favorite address and a limit of 10 addresses. The owner reviews every screen text once all the screens are done; until then the texts below stand.
> Builds on `2026-11-23-account-design.md` and `2026-11-23-account-2-design.md`. Scenarios: `CTA-05` in `docs/SPEC-CLIENT.md`.

## Why

The identification screen promises "Sua conta guarda pedidos e endereços", and the account design says a signed-in checkout comes filled in with her saved address. Today "Meus endereços" leads to the 404 page and a signed-in customer types her address at every purchase. The owner also wants the CEPs a customer tried in the shipping calculator to come back as suggestions, like a search history, so she doesn't type them again (and WCAG 3.3.7, "Redundant Entry", in the owner's UX guide, asks for the same).

## What the owner decided (2026-11-23)

1. **Nothing is filled in by itself.** Neither a saved address nor an earlier CEP goes into a field until she taps it. So shipping never changes by surprise (no `CHK-10` note on opening checkout).
2. **CEP history:** the CEPs she calculated in the shipping calculator come back as suggestions when she taps the CEP field, like a search history.
3. **The history needs consent** (option B of the conversation): a new optional cookie category, "Funcionais", unchecked by default. Without it, no history is kept or shown.
4. **Saving an address:** a mix of "save automatically" and "a box": signed-in checkout shows a box **already checked**, "Salvar este endereço na minha conta". Unchecked, the address stays only in the order.
5. Meus endereços: add, edit and remove, with the checkout's validation (`CTA-05`).
6. **A favorite address** ("Favorito"), chosen by her, and **at most 10 addresses** (added at the review).

Why the box may come checked: `CLAUDE.md` forbids pre-checked **marketing or cookie** boxes. Saving her address in her own account is neither; it serves the account she chose to create ("Sua conta guarda pedidos e endereços") and the purchase (LGPD art. 7, V). The consent boxes of `CHK-07` stay unchecked.

## Goals

- `/conta/enderecos`: her saved addresses, add, edit, remove, choose the favorite, at most 10.
- Signed-in checkout: the saved addresses as choices to tap, each filling the whole address part of the form; the pre-checked "Salvar este endereço na minha conta" box.
- CEP history in the shipping calculator (product page and bag, the same component), only with the "Funcionais" consent.
- "Funcionais" in "Gerenciar preferências" (`GER-05`), unchecked, with the same weight as the other categories.

## Non-goals

- A favorite chosen in checkout for her: the favorite comes first in the list, never already chosen (decision 1).
- CEP history on the server or across devices.
- CEP history inside checkout's CEP field: there, saved addresses do that job for a signed-in customer; a guest types it (as today) or comes with the bag's CEP.
- Addresses for guests. Without an account, nothing about the address is kept beyond the bag, the lead and the order (decisions 26, 27).

## Anti-goals (a failure even if it works)

- Any field filled in without her tap, or a shipping total that changes because of a suggestion she didn't pick.
- A CEP history written or shown without the "Funcionais" consent, or kept after she withdraws it.
- The history leaving her device (sent to our server, in a cookie, in the URL).
- Someone seeing or editing another account's address (`CTA-11`: the same 404 as a missing one).
- A suggestion list that only works with a mouse, or targets under 48px.

## Approaches considered

**How an address gets into the account**
- A. Saved automatically at every purchase with a new address. Useful from the first purchase; the list grows without her say.
- B. A box "Salvar este endereço" in checkout. Her choice each time; one more control on a phone screen.
- C. Only in Meus endereços. Simplest; the first purchase leaves the account empty.
- **Picked by the owner: A + B** — the box, already checked.

**Where the CEP history lives**
- A. On her device (`localStorage`), as part of the feature, without a consent category. Simplest, works for every visitor; rests on a reading of the LGPD (functional, her own data, never leaves the device).
- B. On her device, only with a new optional "Funcionais" consent, unchecked. The strict reading; most visitors refuse cookies, so few will see it.
- C. On the server, in the account. Follows her across devices; needs contract and table; leaves guests out.
- **Picked by the owner: B.**

## Design

### 1. Meus endereços (`/conta/enderecos`, `CTA-05`, `CTA-11`)

```
Meus endereços
┌──────────────────────────────────────┐
│ ★ Favorito                           │
│ Avenida Paulista, 1000, Apto 12      │
│ Bela Vista · São Paulo/SP            │
│ CEP 01310-100                        │
│ [ Editar ]  [ Remover ]              │
├──────────────────────────────────────┤
│ Rua Augusta, 50 · …                  │
│ [ Tornar favorito ] [ Editar ] [ Remover ] │
├──────────────────────────────────────┤
│ …                                    │
└──────────────────────────────────────┘
[ Adicionar endereço ]
```

- Reads `GET /v1/account/addresses` with the session. Signed out, without "Seus dados", or the session ended on the API → `/conta` (as Meus pedidos).
- None saved: "Você ainda não tem endereços salvos" and "Adicionar endereço" (my wording; see "Builder's calls").
- "Adicionar endereço" and "Editar" open the same form: CEP, Rua, Número, Complemento (opcional), Bairro, Cidade, UF — the checkout's fields, labels, limits and `CHK-03` messages (the `address` part of the checkout schema). "Salvar endereço" saves (`POST` or `PUT`), "Cancelar" closes. Success: back to the list with "Endereço salvo".
- "Remover" asks once ("Remover este endereço?" with "Remover" and "Cancelar", the same size and color) and then `DELETE`; the list says "Endereço removido".
- At 10 addresses, "Adicionar endereço" is replaced by the line "Você chegou ao limite de 10 endereços. Remova um para adicionar outro."
- **Favorite:** one at most. The list shows the favorite first, marked "Favorito" (icon + text, never color alone), then the others newest first. Every other address has "Tornar favorito"; the screen says "Endereço favorito atualizado". The first address she saves becomes the favorite; removing the favorite makes the newest remaining one the favorite (none when the list is empty).
- An address id that isn't hers: the API answers `404`; the screen says "Endereço não encontrado" and shows the list again (`CTA-11`: same answer as a missing one).
- The form opens on the same page (client state, no new route); a reload goes back to the list, since the form is short.
- Removing or editing an address never changes a past order: every order keeps its own copy (decision 23).

### 2. Signed-in checkout (`CTA-05`, `IDT-11`)

```
Endereço de entrega
Seus endereços
( ) ★ Favorito · Avenida Paulista, 1000 · Bela Vista · São Paulo/SP
( ) Rua Augusta, 50 · Consolação · São Paulo/SP
CEP [          ]  Rua [            ] …            ← empty until she picks or types
[x] Salvar este endereço na minha conta
```

- Signed in, `/checkout` also reads her saved addresses (with the account details). Each is a choice (radio-like, 48px; the favorite first with "Favorito", then newest first; at most 10). **None is chosen when the page opens**, not even the favorite.
- Tapping one fills CEP, Rua, Número, Complemento, Bairro, Cidade and UF, as if she had typed them: the `CHK-09`/`CHK-10` CEP rules run as today (a CEP other than the bag's recalculates shipping and shows the note), the tab storage (`CHK-23`) keeps the address as today, and she can still edit any field.
- Editing a field after picking leaves the choice marked as not matching (the radio is cleared), so the screen never claims a saved address it isn't sending.
- "Salvar este endereço na minha conta": signed in only, checked by default, its own choice each time (not stored in the tab). On "Ir para pagamento", checked, the customer step asks the API to also save the address in the account. The API doesn't create a duplicate when the same address (CEP, street, number, complement) is already saved, and skips it quietly when the account has 10; the purchase never fails because of it. A first address saved this way becomes the favorite.
- Saving happens only at "Ir para pagamento", never in the lead save of `CHK-05` (the lead runs while she types).
- Guest checkout: no list and no box; nothing changes.

### 3. CEP history (shipping calculator, product page and bag)

```
CEP [ 01310-100        ] [ Calcular ]
Pesquisados recentemente
[ 01310-100 · São Paulo/SP ]
[ 69900-000 · Rio Branco/AC ]
[ Limpar histórico ]
```

- Only with the "Funcionais" consent. Without it nothing is written, read or shown, and the calculator works as today.
- Written on her device only (`localStorage`, key named in the glossary), after a calculation that succeeded: the CEP and the city/state the API answered, newest first, the same CEP moved to the top instead of repeated, at most 5.
- Shown when the CEP field gets focus and it is empty or holds fewer than 8 digits; hidden once she types 8 digits, presses Escape, or the field loses focus to something outside the list.
- Each suggestion is a button (48px, 8px apart, visible focus) labelled with the CEP and the place. Tapping one puts the CEP in the field and calculates right away, as if she had tapped "Calcular".
- "Limpar histórico" deletes the history at once.
- Withdrawing the "Funcionais" consent in "Gerenciar preferências" deletes the history at once.
- No suggestion is shown or kept for a CEP whose calculation failed.

### 4. "Funcionais" consent (`GER-03` to `GER-05`)

- New optional category in "Gerenciar preferências": **"Funcionais"** — "Lembram os CEPs que você pesquisou para calcular o frete, só neste aparelho." Unchecked by default, like "Análise" and "Marketing".
- "Aceitar" in the banner accepts it with the others; "Rejeitar" refuses it. The banner text doesn't change.
- The consent cookie gains `functional`; a cookie saved before this change reads as `functional: false` (no history until she accepts).
- The privacy page (`/privacidade`, still the owner's text) must mention the history; added to the pending note of that page.

## Spec changes (to make before the tests)

- `CTA-05`: amended with Meus endereços' texts, the 10 limit, the favorite, and the checkout choices (favorite first, none chosen at first; a tap fills the address; editing clears the choice).
- New `CTA-12` — "Salvar este endereço na minha conta": signed in, checked by default, saved on "Ir para pagamento", no duplicate, never blocks the purchase.
- New `PRO-15` / `SAC-18` (or one shared `GER-` scenario, builder's call) — the CEP history: only with "Funcionais", 5 newest, tap calculates, "Limpar histórico", deleted when consent is withdrawn.
- `GER-05`: "Funcionais" among the described categories, unchecked.
- Decision rows: 28 (address box checked by default, and why it is not a marketing box), 29 (CEP history on the device with the "Funcionais" consent); row 16 gets a note that the history is apart from the bag's CEP.

## Contract and database

- Contract (additive): `CustomerDetails.saveAddress` (optional boolean; only with a customer session, ignored without one; the API copies the address into the account unless an equal one exists or the account has 10). Describe the dedupe rule and the 10 skip in `saveCustomerDetails`. The address endpoints already exist; document that `POST /v1/account/addresses` at 10 answers `409` with a new `Problem.code` `address_limit`, so the screen can say the limit line. `SavedAddress` gains `favorite` (boolean, required in responses); the list comes favorite first, then newest first. New `PUT /v1/account/addresses/{addressId}/favorite` (no body; `200` with the list; `404` for an address that isn't hers). The first saved address becomes the favorite; removing the favorite passes it to the newest remaining one.
- Database: `dbo.customer_address` gains `created_at` (for "newest first") and `is_favorite BIT NOT NULL DEFAULT 0`, with a filtered unique index (one favorite per customer); a comment on the dedupe rule and the 10 limit (checked by the API). No table for the CEP history (it never reaches the server).

## Glossary (before the code)

- Meus endereços `/conta/enderecos` → `MyAddressesPage`; endereço salvo → `SavedAddress` (contract name); favorito → `favorite`; "Salvar este endereço na minha conta" → `saveAddress`; histórico de CEPs → `cepHistory`; cookies funcionais → `functional`.

## Builder's calls (made by me, the owner can change them)

- The empty-list text "Você ainda não tem endereços salvos", the form button "Salvar endereço", the messages "Endereço salvo", "Endereço removido", "Endereço não encontrado", "Endereço favorito atualizado", the confirmation "Remover este endereço?", "Tornar favorito", "Favorito", the limit line and the label "Pesquisados recentemente" (the owner reviews all texts at the end).
- The favorite passes to the newest remaining address when the favorite is removed; the first saved address becomes the favorite.
- The favorite is not chosen in checkout by itself (keeps decision 1; one line to change if the owner prefers).
- 5 CEPs in the history; the city/state shown with each.
- Saving the address at "Ir para pagamento" (not after payment): it is when she commits to that address.
- A reload with the address form open goes back to the list.
- "Aceitar" in the cookie banner accepts "Funcionais" with the other optional categories; "Rejeitar" refuses all of them.
- The order of work for the plan: 1) spec, glossary, contract, database; 2) Meus endereços with the favorite; 3) checkout choices and the save box; 4) "Funcionais" consent and the CEP history.
