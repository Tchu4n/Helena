# Helena

Fashion e-commerce built as the college **Capstone Project** (Projeto Integrador). The final goal is a working online store from end to end, with a **Next.js** front end, a **Java** back end and a **SQL Server** database.

Helena is a fictional store selling t-shirts, pants, jackets and accessories to people aged 18 to 30, who find the products on Instagram and buy on their phones. The project starts from a requirements survey with a simulated client: today stock and orders are tracked in spreadsheets, and the store needs a system that is simple, cheap and fast on the phone.

## What the store does

- **Catalog:** filters by category, size, color and price; sorting; low-stock and sold-out size notices.
- **Checkout without an account:** the customer confirms her e-mail with a 6-digit code and buys with no password, or creates an account. Designed for the phone.
- **Payment:** PIX with instant confirmation, or card in up to 6 interest-free installments.
- **No double selling:** the item is reserved for 15 minutes during payment, and the purchase is blocked if stock hits zero.
- **Shipping:** by CEP, with same-day courier, PAC or Sedex. If the shipping API goes down, a fixed fee applies and checkout keeps going.
- **Coupon and free shipping:** one coupon per purchase and free shipping from R$ 300.00.
- **After sale:** order confirmation, order tracking (also without an account, by order number + e-mail) and returns requested by the customer herself.
- **Privacy:** minimal data collection and separate consents, following the LGPD.
- **Admin panel** (next stage): batch stock intake, stock, labels, leads and metrics.

## Architecture

```
Browser ──> Front end (Next.js) ──> REST API (Java) ──> SQL Server
              this repository        another repository
```

- The front end never touches the database: it only talks to the API, always on the server side.
- The API is defined first, in an OpenAPI contract (`contract/openapi.yaml`). While the back end does not exist, the front end runs against a mock API generated from that contract.
- Payment gateway, shipping and invoices come in through integrations, mocked until there is test access.

## Tech

| Layer | Tech |
|---|---|
| Front end | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Back end | Java (another repository) |
| Database | SQL Server |
| API contract | OpenAPI 3.0.3, mock server with Prism |
| Tests | `node:test` (unit) and Playwright (screens, against a fake API) |

## How to run

Requires Node.js 20.9 or newer.

```bash
npm install
npm run dev        # store at http://localhost:3000
npm run mock       # mock API at http://localhost:4010
```

| Command | What it does |
|---|---|
| `npm test` | Runs the unit tests |
| `npx playwright test` | Runs the screen tests (builds the store and starts a fake API) |
| `npm run lint` | Checks the code |
| `npm run build` | Builds for production |
| `npm run types` | Generates the API types from the contract |

## How the project is built

Behavior comes before code. Every change follows this order:

1. **Spec:** Given/When/Then scenarios in `docs/SPEC-CLIENT.md`.
2. **Test:** written from the spec.
3. **Code:** only what the test needs to pass.

Code and docs are written in plain English, so any dev, beginners included, can read them. Only what the customer sees (screen text, store URLs) stays in Portuguese, and commit messages are written in Portuguese. `docs/GLOSSARY.md` maps each business term to the name used in the code.

## Docs

| File | Content |
|---|---|
| `docs/SPEC-CLIENT.md` | The 8 customer screens plus the identification step, in 119 scenarios |
| `docs/DESIGN.md` | Colors, type and interface components |
| `contract/openapi.yaml` | Contract of the API used by the customer screens |
| `database/schema.sql` | Database schema (draft) |
| `docs/GLOSSARY.md` | Business term → name used in the code |
| `CLAUDE.md` | Project rules and constraints |

## Progress

- [x] Requirements survey
- [x] Design system
- [x] Customer screens spec
- [x] API contract
- [x] Database schema draft
- [ ] Customer screens: home, catalog, search, product, bag, checkout, order confirmation and tracking done; identification, sign-in, the account home, sign-up details, signed-in checkout, my orders and personal details done; addresses, account privacy, returns and privacy page to do
- [ ] Java back end
- [ ] Schema run on SQL Server
- [ ] Integrations (payment, shipping, invoice)
- [ ] Admin panel
