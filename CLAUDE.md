@AGENTS.md

# Helena — project guidelines

Online fashion store (t-shirts, pants, jackets, accessories) for ages 18 to 30, who buy on the phone from Instagram. MVP on a tight budget. This repository is the Next.js front end; the back end will be Java with Spring Boot + SQL Server, in its own repository, and does not exist yet. Work order: customer screens first, admin panel later.

## Constraints (above everything)

These rules have no exceptions. If a task can only be done by breaking one, the agent stops and asks the owner. The reason and details of each are in the sections below.

**Process**
- NEVER commit or create a branch; that is the owner's job. This holds even where `AGENTS.md` (written by `next dev`) says to commit it.
- NEVER write behavior code that is not in the spec. Spec first, then test, then code.
- NEVER change a test's assertion to make it pass.
- NEVER commit anything from `docs/referencias/`.
- NEVER add a dependency without a clear need and without telling the owner.
- NEVER use a Next API from memory; first read its guide in `node_modules/next/dist/docs/`.

**Code**
- NEVER a Portuguese name in the code (variable, function, component, folder, file, test, contract field, database table or column), nor a fancy English word. The name of each business term is in `docs/GLOSSARY.md`.
- NEVER access SQL Server from the front end; only the API, on the server side.
- NEVER hand-write the API types or change the contract in a non-additive way.
- NEVER import from inside another domain; only through its `index.ts` (or its `client.ts`, from a client component).
- NEVER put business rules, validation or long styling in `app/`.
- NEVER pass the whole API response to a client component.

**Security and privacy**
- NEVER rely on `proxy.ts` alone: every Server Action, `route.ts` and protected query checks authorization.
- NEVER a token in `localStorage` nor a secret in a `NEXT_PUBLIC_` variable.
- NEVER card data going through our server or stored anywhere.
- NEVER a pre-checked marketing or cookie box, nor "Aceitar" more prominent than "Rejeitar".
- NEVER ask the customer for data that the sale and the invoice don't require.
- NEVER show or fill in data from an existing record for someone who is not identified.

**Business**
- NEVER charge without a valid stock reservation; if the item hit zero, block before payment.
- NEVER require an account, password or CAPTCHA to buy.
- NEVER accept more than one coupon per purchase.
- NEVER block checkout because the shipping API went down.

**Design**
- NEVER a color outside the tokens, nor `sale` on a button or link, nor shadows, nor `dark:` classes.
- NEVER use color as the only signal, nor a touch target smaller than 48px.

## Language

Owner's decision on 2026-11-19, extending the one from 2026-11-15:

- **Plain English:** code (variables, functions, components, folders, files, tests, tokens, contract fields and routes, database tables and columns, comments) and docs (`docs/`, `README.md`, this file, plans). Prefer the common word over the technical one (`preparing`, not `fulfillment`), so beginner devs can read without trouble.
- **Portuguese:** only what the customer sees — screen text, store routes in the browser (`/sacola`, `/produto/[slug]`) and their query parameters (`?categoria=`, `?ordem=menor-preco`) — plus commit messages.
- **Glossary required:** `docs/GLOSSARY.md` maps each business term to its name in the code, and each store URL to its code name. A new term goes there before it goes into the code. Kept as they are: `cpf`, `cep`, `pix`, `pac`, `sedex`, `whatsapp`.
- **Spec scenarios** are in English, but the text the customer sees inside them is quoted in Portuguese, exactly as it shows on screen.

## Docs

| Doc | Role |
|---|---|
| `docs/GLOSSARY.md` | Business term and store URL → name in the code |
| `docs/DESIGN.md` | Single source of the design: tokens, type, components, where each color may appear |
| `docs/SPEC-CLIENT.md` | Given/When/Then scenarios for the 8 customer screens (approved on 2026-11-14; decisions in section 12) |
| `contract/openapi.yaml` | OpenAPI 3.0.3 contract of the API for the customer screens (approved on 2026-11-14; names moved to English on 2026-11-15, by the owner's decision, before any consumer existed) |
| `database/schema.sql` | SQL Server DDL (draft, not run yet; moves to the back-end repository once it exists) |
| `docs/referencias/` | Owner's research material (requirements, guides, screenshots, flowcharts). Local only, outside Git. Read it, never commit it |
| `docs/superpowers/specs/` | Design docs written before each plan: checkout (2026-11-20), order confirmation and tracking (2026-11-22), account and identification before buying (2026-11-23), account part 2: sign-up details, orders and personal details (2026-11-23), account part 3: saved addresses, favorite and CEP history (2026-11-23), account part 4: privacy, consents and my data (2026-11-24) |
| `docs/superpowers/plans/` | Implementation plans, each with its status at the top: base design system and shared layout + catalog (done), product page (done, minor review items pending), bag (done), checkout (done), order confirmation and tracking (done), account plan 1, identification, session and /conta (done), account plan 2, sign-up details, signed-in checkout, my orders and personal details (done), account plan 3, saved addresses, favorite and CEP history with the "Funcionais" cookies (done), account plan 4, privacy: consents per channel, copy and deletion of her data (done). Returns and the privacy policy page come next |

Still missing: running and approving the DDL on a SQL Server, sandbox credentials (payment, shipping, invoice), and the store's WhatsApp number (`STORE_WHATSAPP`; a placeholder is used until then). The mock server came up and answered according to the contract on 2026-11-15.

The guides in `docs/referencias/` were written for Next.js 15 and Tailwind 3. Where they differ from this file or from the docs in `node_modules/next/dist/docs/`, they lose.

## How to work (spec first)

- The versioned spec is the source of truth. If behavior changes: first the spec, then the test, then the code.
- Test before code, derived from the spec. Never change a test's assertion to make it pass.
- The owner makes the commits. The agent leaves the changes in the working tree, lists the changed files and may suggest the commit message, in Portuguese.
- No branch is created without telling the owner first and getting the ok.
- No new dependency for a few lines. Already installed with the owner's ok (2026-11-15): `zod`, `server-only` and `openapi-typescript`.
- A visual decision is shown to the owner on a page, not described in text. Reference material is read in full before concluding.
- Plans run one task at a time (owner's decision of 2026-11-19). At the end of each task the agent reports what changed and which tests ran, then stops and waits for the owner's go-ahead. It never starts the next task on its own.
- Tests (owner's decision of 2026-11-23): during a task, run the new tests once to see them fail. At the end of a task, run only the tests that task touches (its screen tests and unit tests), plus lint and tsc. The whole suite (`npm test` and all screen tests) runs only at the last task of a plan, which closes the block.
- At the end of each block or feature, update the owner's Obsidian vault (`~/Documents/Obsidian Vault/Helena Ecommerce/`; owner's decision of 2026-11-26): the full copies of `docs/SPEC-CLIENT.md`, `CLAUDE.md` and `docs/DESIGN.md`, the "Estado Atual" note and the block's line in "Planos e Designs".

## Commands

```bash
npm run dev      # local server
npm test         # node:test, files in tests/**/*.test.mjs
npm run lint     # eslint (the `next lint` command no longer exists)
npm run build    # production build
npm run mock     # mock API (Prism) at http://localhost:4010, from the contract
npm run types    # generates src/lib/api-types.ts from the contract (a test fails if it gets stale)
```

Long output: filter before reading (`npm run build 2>&1 | tail -20`).

## Next.js 16: what changes from the guides

- `cookies()`, `headers()`, `params` and `searchParams` are async; always `await`.
- `middleware.ts` became `proxy.ts`, with a `proxy` function, and runs only on Node.
- `revalidateTag(tag, profile)` requires the second argument. Inside a Server Action, when the customer needs to see her own change right away (bag, stock), use `updateTag` for data cached with a tag, and `refresh()` for data read without cache (the bag, read from her cookie).
- Partial prerendering is turned on with `cacheComponents` in `next.config.ts`; the `experimental.ppr` flags were removed.
- Tailwind 4: tokens in `app/globals.css` inside `@theme`; there is no `tailwind.config.ts`.
- Before using a Next API, read its guide in `node_modules/next/dist/docs/`.

## Front-end architecture

- `app/` is a thin layer: only routes, layouts and convention files. A `page.tsx` fetches data and composes; it doesn't validate, has no business rules and no long styling.
- Logic lives in `src/`, by domain:

```
src/
  features/<domain>/   catalog, cart, checkout, orders, account, returns, privacy
    components/  actions/  queries/  schemas/  index.ts
  components/ui/       primitives (Button, Field, Badge...)
  lib/                 API client, environment validation
```

- Each domain exposes only what is public in `index.ts`. Importing from inside another domain is forbidden.
- A domain whose `index.ts` exports server code (queries, actions, `server-only` modules) may also have a `client.ts` with only what runs in the browser (client components, types); client components of other domains import from it. Owner's decision of 2026-11-20 (cart domain).
- Server component by default. `"use client"` only on the leaves that need events, state or a browser API.
- A client component does not import a server component; it receives it through `children` or props.
- Files in `queries/` and `lib/` that talk to the API start with `import "server-only"`.
- A client component gets only the object with the fields the screen uses, never the whole API response: whatever becomes a prop goes into the public HTML.
- Server Action, always in this order: check authorization, validate the input with Zod, run, invalidate the cache.
- `route.ts` only for external calls (PIX confirmation, webhooks). Interaction on the store's own screens uses a Server Action.

## Front and back

- The front end never accesses SQL Server. The `queries/` layer calls the Java (Spring Boot) API, on the server side.
- Contract first: the OpenAPI 3.x is written and approved before the screens. While the back end doesn't exist, the front end runs against a mock server (Prism).
- Every API error comes in RFC 9457 format (`application/problem+json`); the screen handles that format in one place.
- Contract changes are additive. Client TypeScript types are generated from the contract (`npm run types`), not hand-written.

## Security

- Authorization is checked inside each Server Action, `route.ts` and protected query. `proxy.ts` only redirects and sets headers; it is never the only barrier.
- Session in an `httpOnly`, `Secure`, `SameSite=Lax` cookie. No token in `localStorage`.
- No secret in a `NEXT_PUBLIC_` variable. Environment variables validated at build time.
- Card payments need the gateway's anti-fraud barrier; card data does not go through our server.

## Business rules the interface must respect

- **Reservation:** the item stays reserved for 15 minutes from the start of payment (PIX validity). When it expires, stock comes back and the screen says so.
- **Stock:** the site shows only the sale stock. A sold-out size shows struck through; a sold-out product goes to the end of the grid with a mark. If it hits zero during checkout, block before charging.
- **Payment:** PIX with instant confirmation, or card in up to 6 interest-free installments with a minimum installment of R$ 50.00 (the number of installments adjusts to the total).
- **Benefit:** coupon and free shipping can stack; one coupon per purchase. Free shipping applies to R$ 300.00 or more in items, after the coupon discount, to any CEP in Brazil, only on the cheapest option; if the coupon drops the amount below that, shipping is recalculated.
- **Low stock:** notice when the size has 15 units or fewer in sale stock.
- **Shipping:** by CEP (8 digits), with same-day courier in the metro area, PAC or Sedex. If the shipping API goes down, a fixed fee per region applies and checkout doesn't block. Shipping cost and time show on the product page and in the bag, before checkout.
- **Customer details:** purchase without account and without password. Required fields: name, CPF (11 digits), email, phone, address. The data is saved as a lead as soon as it is filled in, before payment.
- **E-mail:** confirmed with a 6-digit code before paying, at the identification step (owner's decision of 2026-11-23). The customer chooses "Comprar só com e-mail" (no account, no password) or "Criar conta". If the e-mail service is down, the store doesn't sell.
- **Returns:** requested by the customer herself, with a required reason, up to 7 calendar days after delivery; one request per order.
- **Performance:** page loaded in 2 to 3 seconds on 3G/4G. Mobile first.

## Privacy (LGPD) in the interface

- Collect only what the sale and the invoice require.
- Marketing boxes unchecked by default, one per channel (email and WhatsApp are separate consents). Store date, time, IP and the version of the accepted text.
- Checkout warns that the contact given may be used to remind about the unfinished purchase. Every reminder message includes an option to stop receiving them.
- An abandoned-bag reminder only talks about the order that was started. Offering another product is marketing and needs consent.
- Cookie notice: "Rejeitar" and "Aceitar" with the same size and color, plus "Gerenciar preferências"; nothing pre-checked; the store works fully even after a refusal.
- The catalog is for adults. Before creating a kids category or a campaign aimed at minors, review the ECA Digital requirements.

## Design (summary; details in `docs/DESIGN.md`)

- Use only the tokens: `background`, `surface`, `card`, `primary`, `muted`, `control`, `line`, `sale`, `success`, `error`. No loose color in the code.
- Main button always `primary`. `sale` only on discount badge, sale price, timer and low-stock notice; never on a button or link.
- Controls as pills (`rounded-control`); photos, tiles and cards with square corners; no shadows.
- Headings in `font-serif` weight 400; body and prices in `font-sans`; uppercase labels in `font-mono`.
- 48px touch target with 8px between targets; focus always visible; color is never the only signal.
- No dark theme and no high-contrast theme at launch. Don't use `dark:` classes.
- Touched a color: `npm test` checks the contrast.
