# SPEC-CLIENT — customer screens

Behavior spec of the 8 customer screens of the Helena store, as Given/When/Then scenarios. It is the source of truth for behavior: if behavior changes, this file changes first, then the test, then the code.

- **Sources:** `Levantamento de Requisitos Helena Ecommerce` (stories E1 to E19), customer screen flowcharts, LGPD guide, UX/UI handbook, `CLAUDE.md` and `docs/DESIGN.md`.
- **Not here:** look and feel (in `docs/DESIGN.md`), API call format (in the OpenAPI contract), admin panel screens.
- **How to read:** each scenario has a code (`SAC-04`) that becomes a test name. In parentheses, the source story. Amounts in reais are examples the tests use literally. Text in quotes is what the customer sees, in Portuguese, exactly as on screen.
- **Status:** approved by the owner on 2026-11-14. Section 12 records the decisions made and what still depends on the API contract.

## 1. Screens and routes

| # | Screen | Route | Prefix |
|---|---|---|---|
| 1 | Home (vitrine) | `/` | `VIT` |
| 2 | Catalog and filters | `/catalogo` | `CAT` |
| 3 | Product | `/produto/[slug]` | `PRO` |
| 4 | Bag (panel and page) | `/sacola` | `SAC` |
| 5 | Checkout (details, delivery, payment) | `/checkout` | `CHK` |
| 5a | Identification before checkout | `/checkout/identificacao` | `IDT` |
| 6 | Confirmation and tracking | `/pedido/[numero]` | `PED` |
| 7 | Returns | `/devolucao` | `DEV` |
| 8 | My account | `/conta` | `CTA` |
| — | Behavior shared by all | — | `GER` |

Routes are in Portuguese because the customer sees them in the browser. The prefixes are kept as they are because the tests already use them.

## 2. Rules and values used in the scenarios

| Rule | Value |
|---|---|
| Item reservation | 15 minutes from the start of payment |
| Installments | up to 6 interest-free, minimum installment R$ 50,00 |
| Free shipping | R$ 300,00 or more in items, after the coupon discount; any CEP in Brazil; only on the cheapest option |
| Benefit | coupon and free shipping can stack |
| Coupon | one per purchase; code up to 20 characters, active, discount from 0 to 70% on the items amount |
| Low stock | notice when the size has 15 units or fewer in sale stock |
| CEP | 8 numeric digits |
| CPF | 11 numeric digits |
| Returns | up to 7 calendar days after delivery, one request per order |
| Shipping options | Courier (same day, metro area only), PAC, Sedex |
| Categories | Camisetas, Calças, Jaquetas, Acessórios |

**Maximum number of installments** = the smaller of 6 and the whole part of (total ÷ 50), never less than 1.

| Total | Installments offered |
|---|---|
| R$ 49,90 | 1x |
| R$ 99,99 | 1x |
| R$ 100,00 | up to 2x of R$ 50,00 |
| R$ 149,99 | up to 2x |
| R$ 150,00 | up to 3x |
| R$ 299,99 | up to 5x |
| R$ 300,00 | up to 6x of R$ 50,00 |
| R$ 1.000,00 | up to 6x |

**Benefit**, with R$ 20,00 shipping on the cheapest option:

| Items | Coupon | Discount | Shipping | Total |
|---|---|---|---|---|
| R$ 320,00 | — | — | free | R$ 320,00 |
| R$ 320,00 | MARIA10 (10%) | R$ 32,00 | R$ 20,00 | R$ 308,00 |
| R$ 400,00 | MARIA10 (10%) | R$ 40,00 | free | R$ 360,00 |
| R$ 250,00 | — | — | R$ 20,00 | R$ 270,00 |
| R$ 250,00 | MARIA10 (10%) | R$ 25,00 | R$ 20,00 | R$ 245,00 |

## 3. Shared behavior (GER)

**GER-01 — Bottom tabs on the phone**
- **Given** the customer is on the home, catalog or account screen, on the phone
- **Then** she sees the tabs Início, Buscar, Sacola and Conta fixed at the bottom of the screen
- **And** the Sacola tab shows the number of items when the bag is not empty

**GER-02 — Purchase screens without tabs and without announcement bar**
- **Given** the customer is on the product, bag or checkout screen
- **Then** the bottom tabs give way to the screen's main button, fixed at the bottom
- **And** on the bag and checkout the top announcement bar does not show

**GER-03 — Cookie notice on the first visit** (LGPD)
- **Given** the customer has not chosen her cookie preferences yet
- **When** she opens any page
- **Then** she sees the notice with "Rejeitar" and "Aceitar" of the same size and color, and "Gerenciar preferências"
- **And** no cookie that depends on consent has been stored yet

**GER-04 — Rejecting cookies doesn't break the store** (LGPD)
- **Given** the customer tapped "Rejeitar"
- **When** she browses, adds items to the bag and completes a purchase
- **Then** everything works, and only the necessary cookies (bag and session) are used

**GER-05 — Manage preferences** (LGPD)
- **When** the customer taps "Gerenciar preferências"
- **Then** she sees each cookie category described, all optional ones unchecked
- **And** she can change the choice later, at any time, through a link in the footer, without signing in
- **And** the optional categories are "Análise", "Marketing" and "Funcionais" ("Lembram os CEPs que você pesquisou para calcular o frete, só neste aparelho.", `PRO-15`); "Aceitar" accepts all of them and "Rejeitar" refuses all of them (added on 2026-11-23)

**GER-06 — API failure** (RFC 9457)
- **Given** an API call failed or took too long
- **Then** the screen shows a message in Portuguese with an icon, no technical code, and the action "Tentar de novo"
- **And** nothing the customer typed is lost

**GER-07 — Touch, focus and signal** (E17)
- **Then** every control is at least 48×48px, 8px away from its neighbor
- **And** keyboard focus is always visible and never covered by the fixed bars
- **And** no information depends on color alone: a badge has text, an error has an icon and a message

**GER-08 — Performance on mobile network** (E16)
- **Given** a simulated slow 4G connection, on a mid-range phone
- **When** the customer opens the home, the catalog or the product screen
- **Then** the main content of the screen is visible within 3 seconds

**GER-09 — Prices**
- **Then** every amount shows in the format `R$ 1.234,56`

## 4. Home (VIT)

**VIT-01 — Home page content**
- **When** the customer opens the store
- **Then** she sees, in this order: announcement bar, header (search, logo, bag), featured collection or campaign block, benefits strip, the four categories and the "Em destaque" grid

**VIT-02 — Go to a category**
- **When** the customer taps "Calças"
- **Then** she goes to the catalog already filtered by that category

**VIT-03 — Open a product**
- **When** the customer taps a product card
- **Then** she goes to that product's screen

**VIT-04 — Product on sale in the card**
- **Given** a product from R$ 199,00 for R$ 159,00
- **Then** the card shows the old price struck through, the current price and the badge with the discount text

**VIT-05 — Sold-out product in the grid** (E13)
- **Given** a product with no size in sale stock
- **Then** it shows after all available ones, marked "Esgotado" in text

**VIT-06 — Arriving from Instagram**
- **Given** an ad link that points to a product or a category
- **When** the customer opens the link
- **Then** she lands right on that screen, without going through the home page or a sign-up screen

## 5. Catalog and filters (CAT)

**CAT-01 — Available filters** (E13)
- **When** the customer taps "Filtrar"
- **Then** she can filter by category, size, color and price range (minimum and maximum)

**CAT-02 — The grid follows the filters** (E13)
- **When** the customer applies or removes a filter
- **Then** the grid updates without reloading the whole page and shows how many products were found
- **And** the active filters show as removable chips above the grid

**CAT-03 — Filters stay in the page address**
- **Given** the catalog filtered by "Jaquetas", size M
- **When** the customer copies the address, goes back with the browser button or reloads
- **Then** the same filters stay applied

**CAT-04 — Invalid price range** (E13)
- **When** the customer enters a minimum of R$ 200,00 and a maximum of R$ 100,00
- **Then** the filter is not applied and the error "O preço mínimo não pode ser maior que o máximo" shows

**CAT-05 — Filter by size and stock** (E13)
- **Given** the size M filter applied
- **Then** products with M available come first
- **And** products without M in sale stock come last, marked "Esgotado no M"

**CAT-06 — No results**
- **Given** a filter combination with no products
- **Then** the screen says nothing was found and offers "Limpar filtros"

**CAT-07 — Text search**
- **When** the customer searches "jaqueta jeans" from the Buscar tab or the header
- **Then** she sees the products whose name or category match the text, in the same catalog grid, with the same filters available

**CAT-08 — Quick buy from the card**
- **When** the customer taps a card's quick-buy button
- **Then** she picks the size right there (sold-out ones struck through) and the item goes into the bag, as in `PRO-07`
- **And** after adding, the panel of `SAC-01` takes the place of the size choice
- **When** she closes the size choice while the item is still going into the bag
- **Then** the item still goes into the bag (the counter goes up), but no panel opens afterwards, not even when she opens the size choice again (added on 2026-11-20)

**CAT-09 — Sort the grid**
- **When** the customer taps "Ordenar"
- **Then** she can choose between Novidades (default), Menor preço, Maior preço, Maior desconto and Mais vendidos
- **And** the grid reorders as in `CAT-02`, keeping the applied filters
- **And** in any order, sold-out products stay last (`VIT-05`, `CAT-05`)
- **And** the chosen order stays in the page address, like the filters (`CAT-03`)

## 6. Product (PRO)

**PRO-01 — Screen content**
- **When** the customer opens a product
- **Then** she sees the photos, name, price, installments, color, sizes, size guide, fabric, collection, description, shipping calculation by CEP and the "Adicionar à sacola" button fixed at the bottom

**PRO-02 — Product installments** (E5)
- **Given** a product of R$ 199,00
- **Then** the screen shows "até 3x de R$ 66,33 sem juros"
- **Given** a product of R$ 79,00
- **Then** the screen shows no installments

**PRO-03 — Sold-out size** (E3, E13)
- **Given** size P has no sale stock
- **Then** the P chip shows struck through, can't be chosen for purchase and is announced as "esgotado"
- **When** the customer taps the P chip
- **Then** the main button is disabled with the text "Esgotado" and the screen offers the `PRO-12` alert; tapping an available size turns the button back to "Adicionar à sacola"

**PRO-04 — Selected size**
- **When** the customer picks size M
- **Then** the M chip gets a double border and the screen says, in text, "Tamanho: M"

**PRO-05 — Adding without picking a size**
- **Given** no size was picked
- **When** the customer taps "Adicionar à sacola"
- **Then** nothing goes into the bag and the screen asks "Escolha um tamanho", moving focus to the sizes

**PRO-06 — Size guide**
- **When** the customer taps "Guia de medidas"
- **Then** she sees the category's size table without leaving the product screen

**PRO-07 — Add to bag**
- **Given** size M picked and available
- **When** the customer taps "Adicionar à sacola"
- **Then** the item goes into the bag, the bag counter goes up and the bag panel slides up (`SAC-01`)
- **Until the panel exists**, the screen says "Peça adicionada à sacola" (decision of 2026-11-18; the panel replaces this message)
- **And** a double tap on the button adds a single item
- **And** if the item can't go into the bag, the items already there stay

**PRO-08 — Shipping on the product screen** (E7)
- **When** the customer types an 8-digit CEP and taps "Calcular"
- **Then** she sees the options available for the CEP, each with cost and delivery time
- **And** the CEP is kept for the bag and checkout
- **And** if our API fails, the `GER-06` message shows, the CEP stays in the field and "Adicionar à sacola" keeps working

**PRO-09 — Invalid CEP** (E7)
- **When** the customer enters a CEP with fewer than 8 digits or with letters
- **Then** nothing is calculated and the error "Digite um CEP com 8 números" shows
- **And** hyphen, dot and space are ignored: `01310-100` counts as `01310100`

**PRO-10 — Courier only in the metro area** (E7)
- **Given** a CEP outside the metro area
- **Then** the "Entrega Helena" option (the store's own same-day courier) doesn't show; only PAC and Sedex

**PRO-11 — Shipping API down** (E7)
- **Given** the shipping API did not answer
- **When** the customer calculates shipping
- **Then** she sees cost and delivery time of the fixed fee for the CEP's region, and keeps buying normally

**PRO-12 — Notify me when it's back** (E9)
- **Given** the customer tapped a sold-out size
- **Then** the screen shows a card with the title "Tamanho P esgotado", the sentence "Garanta sua unidade assim que o estoque voltar." and the button "Avise-me quando estiver disponível" (owner's reference, 2026-11-19)
- **When** she taps the button
- **Then** the card asks for email or WhatsApp (email selected at first; it is the channel for the alert, not marketing consent)
- **When** she enters the contact and confirms
- **Then** the screen says "Pronto! Vamos avisar quando o tamanho P estiver disponível. Usaremos seu contato só para esse aviso."
- **When** the contact is invalid
- **Then** "Digite um e-mail válido" or "Digite o WhatsApp com DDD, só números" shows, and what she typed stays in the field
- **And** a WhatsApp number with the country code, as the phone's autofill gives it (`+55 11 98765-4321`), is accepted as `11987654321`

**PRO-13 — Low stock**
- **Given** the chosen size has 15 units or fewer in sale stock
- **Then** the screen shows the notice "Últimas peças" in text, without telling the exact amount
- **Given** the chosen size has 16 units or more
- **Then** the notice doesn't show

**PRO-14 — Whole product sold out**
- **Given** a product with no size available
- **Then** the main button is disabled with the text "Esgotado" and the screen shows the `PRO-12` card with the title "Produto esgotado"
- **When** she taps "Avise-me quando estiver disponível" without having picked a size
- **Then** focus goes to the sizes and the card says "Escolha o tamanho para receber o aviso."; on tapping a size, the card already asks for the contact

**PRO-15 — CEPs searched before** (owner's decision of 2026-11-23)
- **Given** the customer accepted the "Funcionais" cookies (`GER-05`)
- **When** she taps the CEP field with fewer than 8 digits typed
- **Then** she sees "Pesquisados recentemente" with the last 5 CEPs whose shipping she calculated, newest first, each with its city/UF when known ("01310-100 · São Paulo/SP"), and "Limpar histórico"
- **And** tapping one puts it in the field and calculates the shipping right away; a CEP calculated again moves to the top instead of repeating; a CEP whose calculation failed is not kept
- **And** the list hides with 8 digits typed, with Escape, or when focus leaves the field and the list; each suggestion is a 48px button
- **And** the history stays only on her device and is deleted by "Limpar histórico" or when she withdraws "Funcionais"
- **Given** she didn't accept "Funcionais" (or chose before it existed)
- **Then** nothing is kept or shown, and the calculator works as before

## 7. Bag (SAC)

**SAC-01 — Panel on add**
- **Given** the customer just added an item
- **Then** a panel opens with the added item, the amount left for free shipping, the subtotal and the buttons "Finalizar compra" and "Ver sacola"
- **And** closing the panel takes the customer back to the screen she was on
- **And** the panel closes only when she taps to close it (the close button, outside the panel, or Esc on a keyboard); it never closes by itself
- **And** on the phone it slides up from the bottom; on a computer it opens from the right side, full height

**SAC-02 — Bag page**
- **When** the customer opens the bag
- **Then** she sees the 4-step progress (Sacola, Identificação, Dados e entrega, Pagamento), each item with photo, name, color, size, price and quantity, the shipping calculation, the coupon field, the total with installments and "Finalizar compra"
- **And** the coupon field is always open, not hidden behind a link

**SAC-03 — Empty bag**
- **Given** a bag with no items
- **Then** the screen says the bag is empty and offers "Ver novidades"; there is no checkout button

**SAC-04 — Change quantity** (E4)
- **When** the customer increases or decreases an item's quantity with the "−" and "+" buttons
- **Then** subtotal, shipping, benefit and installments are recalculated
- **And** the quantity doesn't go past the sale stock of that size; on reaching the limit, the "+" is disabled and the screen warns "Apenas N unidades restantes" ("Apenas 1 unidade restante" when it is one)

**SAC-05 — Remove item**
- **When** the customer removes an item
- **Then** it leaves the list, the amounts are recalculated and the screen offers "Desfazer" for 10 seconds
- **And** the message fades out before it leaves, to show it is about to go

**SAC-06 — Bag persists**
- **Given** a bag with items, no account
- **When** the customer closes the browser and comes back on the same device
- **Then** the items are still in the bag

**SAC-07 — Item that sold out while in the bag** (E4)
- **Given** a bag item whose size hit zero in sale stock
- **When** the customer opens the bag
- **Then** the item shows marked "Esgotada", left out of the total
- **And** "Finalizar compra" stays enabled
- **When** she taps "Finalizar compra" with that item still in the bag
- **Then** she stays on the bag and an error names the piece: "A peça Camiseta listrada (Azul · P) esgotou. Remova da sacola para finalizar a compra."
- **And** the screen scrolls to the item, which offers "Remover"
- **And** once she removes it, "Finalizar compra" moves on to checkout

**SAC-08 — Shipping in the bag** (E7)
- **Given** the customer already entered the CEP on the product screen
- **Then** the bag already shows the options with cost and delivery time, and lets her change the CEP
- **And** she chooses the option on the bag page, with the cheapest one chosen at first; the panel of `SAC-01` shows no option
- **And** the same rules of `PRO-09`, `PRO-10` and `PRO-11` apply
- **And** if choosing an option fails, the error shows next to the options; once she changes the CEP, an error about the previous CEP no longer shows (added on 2026-11-20)

**SAC-09 — Amount left for free shipping** (E6)
- **Given** R$ 250,00 in items, no coupon
- **Then** the screen shows "Faltam R$ 50,00 para o frete grátis"
- **Given** R$ 320,00 in items with the coupon MARIA10 applied (R$ 288,00)
- **Then** the screen shows "Com o cupom, faltam R$ 12,00 para o frete grátis" (the same text as `SAC-14`; aligned on 2026-11-20)

**SAC-10 — Free shipping applied** (E6)
- **Given** R$ 320,00 in items, no coupon, and any valid CEP in Brazil
- **Then** the cheapest option shows as "Grátis" and the total with it is R$ 320,00
- **And** the other options keep their normal cost

**SAC-11 — Apply a valid coupon** (E6)
- **Given** R$ 250,00 in items and R$ 20,00 shipping
- **When** the customer applies the coupon MARIA10
- **Then** she sees the R$ 25,00 discount line, the R$ 245,00 total and the coupon with the "Remover" option

**SAC-12 — Invalid or inactive coupon** (E6)
- **When** the customer applies a code that doesn't exist or is inactive
- **Then** no amount changes and the error "Cupom inválido ou expirado" shows

**SAC-13 — Coupon and free shipping together** (E6)
- **Given** R$ 400,00 in items with free shipping applied
- **When** the customer applies the coupon MARIA10
- **Then** the discount is R$ 40,00, shipping stays "Grátis" and the total is R$ 360,00

**SAC-14 — Coupon drops the amount below free shipping** (E6)
- **Given** R$ 320,00 in items with free shipping applied
- **When** the customer applies the coupon MARIA10
- **Then** shipping is charged again (R$ 20,00) and the total becomes R$ 308,00
- **And** the screen explains: "Com o cupom, faltam R$ 12,00 para o frete grátis"
- **When** the customer removes the coupon
- **Then** shipping goes back to "Grátis" and the total to R$ 320,00

**SAC-15 — One coupon per purchase** (E6)
- **Given** a coupon already applied
- **When** the customer applies another valid code
- **Then** the new coupon replaces the previous one

**SAC-16 — Installments follow the total** (E5)
- **Then** the bag shows the maximum number of installments according to the table in section 2, recalculated on every change of the total

**SAC-17 — Reservation in progress** (E4) — built with checkout, since the reservation only starts at payment (decided on 2026-11-19)
- **Given** the customer started payment and came back to the bag before the 15 minutes
- **Then** the bag and the panel show the reservation time left
- **Given** no payment was started
- **Then** there is no timer in the bag

**SAC-18 — CEPs searched before, in the bag** (owner's decision of 2026-11-23)
- **Then** the bag's CEP field follows `PRO-15`; a CEP calculated in the bag also goes into the history (without city/UF unless already known)

## 8. Checkout (CHK)

Step 2 (details and delivery) and step 3 (payment) of the bag progress.

### Details and delivery

**CHK-01 — Buying without an account** (E18)
- **When** the customer taps "Finalizar compra"
- **Then** she goes to identification (`IDT-01`), where "Comprar só com e-mail" asks only for the e-mail and its code: no account, no password and no CAPTCHA (owner's decision of 2026-11-23)

**CHK-02 — Required fields** (E1)
- **Then** the form asks only for: name, CPF, email, phone and delivery address
- **And** each field has a visible label above and the matching `autocomplete` attribute
- **And** the CEP field starts empty; delivery options show once she types a valid CEP (owner's decision of 2026-11-20)

**CHK-03 — Field validation** (E1)

| Field | Input | Result |
|---|---|---|
| CPF | `123.456.789-0` (10 digits) | error "CPF deve ter 11 números" |
| CPF | `1234567890a` | error "CPF deve ter 11 números" |
| Phone | `(11) 9abc-0000` | error "Digite só números" |
| CEP | `0131010` | error "Digite um CEP com 8 números" |
| CPF | `111.444.777-00` (wrong check digits) | error "CPF inválido" |
| Phone | `(11) 9876-543` (fewer than 10 numbers) | error "Digite o celular com DDD" |
| State | `S` | error "Digite a sigla do estado, como SP" |
| Name, address | empty | error "Campo obrigatório" |

- **And** dots, dashes and parentheses typed by the customer are accepted and dropped before validating
- **And** each error shows next to the field, with border, icon and text, and focus goes to the first field with an error
- **And** the email comes filled in with the confirmed one (`IDT-03`) and can't be edited here; it is checked at identification (owner's decision of 2026-11-23)

**CHK-04 — Data kept after an error**
- **Given** a form with an invalid field
- **When** the customer tries to move on
- **Then** no field already filled in is cleared

**CHK-05 — Lead saved before payment** (E1, E10)
- **Given** the customer filled in all required fields with valid values
- **When** she leaves the last field, even without moving on to payment
- **Then** the data is saved as a lead
- **And** every purchase keeps its own full details (name, CPF, email, phone, address), with or without an account; a signed-in purchase gets a copy of the account's name, CPF and phone (owner's decision of 2026-11-23)

**CHK-06 — Reminder notice** (LGPD)
- **Then** next to the phone field the screen warns that the phone may be used to remind about the unfinished purchase, with a link to the privacy policy (the email part of the notice moved to `IDT-01` on 2026-11-23, where the email is given)

**CHK-07 — Marketing consents** (LGPD)
- **Then** there are two separate unchecked boxes: "Quero receber novidades por e-mail" and "Quero receber novidades por WhatsApp"
- **And** the purchase completes normally with both unchecked
- **And** an unchecked box never revokes a consent given before; revoking is done only in Privacidade (`CTA-08`)
- **When** the customer checks one of them and completes the step
- **Then** the consent is recorded only for that channel

**CHK-08 — CPF or email already on record** (E18)
- **Given** a CPF or email that has bought from the store before
- **When** the customer fills in the form
- **Then** the purchase goes on with no duplicate error and no login request
- **And** the screen neither shows nor fills in any old data tied to that CPF or email
- **And** a signed-in customer's details come from her own account (`IDT-11`), never from earlier purchases

**CHK-09 — Choose delivery** (E7)
- **Given** the address filled in
- **Then** the customer picks one of the options available for the CEP, with cost and delivery time, and the total is updated
- **And** `PRO-10` (courier) and `PRO-11` (fixed fee if the API goes down) apply

**CHK-10 — Changing the CEP recalculates shipping** (E7)
- **Given** a bag with shipping calculated for a CEP
- **When** the customer enters an address with another CEP at checkout
- **Then** options, costs and delivery times are recalculated, and the screen highlights the change in the total before payment

**CHK-11 — Summary always visible**
- **Then** throughout checkout the customer can see items, discount, shipping, delivery time and total without leaving the step

### Payment

**CHK-12 — Starting payment creates the reservation** (E4)
- **Given** valid details and delivery
- **When** the customer moves on to payment
- **Then** the items are reserved for 15 minutes and the screen shows the time left as a countdown, with text ("Sua reserva termina em 14:59")

**CHK-13 — Stock hit zero before reserving** (E4)
- **Given** a bag item hit zero in stock while the customer was filling in her details
- **When** she moves on to payment
- **Then** nothing is charged, the screen says which item sold out and takes her back to the bag (`SAC-07`)

**CHK-14 — Payment methods** (E5)
- **Then** the customer chooses between PIX and credit card; neither comes with sensitive data filled in

**CHK-15 — Pay with PIX** (E5)
- **When** the customer picks PIX and confirms
- **Then** she sees the QR code, the "Copiar código PIX" button, the amount and the reservation time left

**CHK-16 — PIX confirmed instantly** (E5)
- **Given** the PIX screen open
- **When** the payment is confirmed
- **Then** the customer is taken, without reloading the page, to the order confirmation (`PED-01`) (owner's decision of 2026-11-22)

**CHK-17 — Reservation expired** (E4)
- **Given** the 15 minutes ran out with no payment
- **Then** the screen warns that the reservation expired and the items went back to stock, and the PIX code is no longer shown
- **And** it offers "Tentar de novo", which redoes the reservation if there is still stock (otherwise, `CHK-13`)

**CHK-18 — Pay by card** (E5)
- **When** the customer picks card
- **Then** she enters the card details in the payment gateway's fields and picks the number of installments
- **And** the card details don't go through the store's server

**CHK-19 — Card installments** (E5)
- **Given** a total of R$ 150,00
- **Then** the options are 1x of R$ 150,00, 2x of R$ 75,00 and 3x of R$ 50,00, and no other
- **And** all show as "sem juros"

**CHK-20 — Card approved** (E5)
- **When** the payment is approved
- **Then** the customer is taken to the order confirmation (`PED-01`) (owner's decision of 2026-11-22)

**CHK-21 — Card declined** (E5)
- **When** the payment is declined
- **Then** the screen shows the error with icon and text, without blaming the customer, and offers trying another card or paying with PIX
- **And** personal and delivery details stay filled in
- **And** a new attempt only goes on if there is still stock (otherwise, `CHK-13`)

**CHK-22 — Double tap on pay**
- **When** the customer taps "Pagar" twice
- **Then** only one charge is made; the button is disabled and shows "Processando" after the first tap

**CHK-23 — Going back without losing anything**
- **When** the customer goes back from payment to details, or from details to the bag
- **Then** everything filled in and chosen is still there

## 8a. Identification (IDT)

Owner's decisions of 2026-11-23: every purchase needs an email confirmed with a code before paying; the customer chooses between buying with the email only or creating an account; if the email service is down, the store doesn't sell.

**IDT-01 — Two ways, none chosen**
- **Given** a bag with items and the customer not signed in
- **When** she taps "Finalizar compra"
- **Then** she sees "Identificação" with the email field and "Como você quer comprar?": "Comprar só com e-mail" ("Você confirma o e-mail a cada compra.") and "Criar conta" ("Sua conta guarda pedidos e endereços."), neither chosen
- **And** the screen says "Usaremos este e-mail para o pedido e para lembrar você de uma compra não concluída."
- **When** she taps "Receber código" with nothing filled in
- **Then** she sees "Campo obrigatório" and "Escolha como quer comprar", and focus goes to the email

**IDT-02 — Code sent, same answer for any email**
- **When** she enters a valid email, picks a way and taps "Receber código"
- **Then** the screen says "Enviamos um código para {e-mail}", the same for any email, and shows nothing saved about that email

**IDT-03 — Guest: right code**
- **Given** "Comprar só com e-mail" and the code sent
- **When** she enters the 6 numbers, with or without spaces, and taps "Confirmar"
- **Then** she goes to "Dados e entrega" with the email filled in, read-only, and "Trocar e-mail"

**IDT-04 — Wrong or expired code**
- **When** the code is wrong, expired or was already wrong 5 times
- **Then** the screen says "Código inválido ou vencido" and the email stays

**IDT-05 — Resend**
- **Then** "Reenviar código" works 30 seconds after the code was sent; tapping it sends a new code and says "Código reenviado"

**IDT-06 — Code doesn't arrive**
- **Given** 2 minutes since the code was sent
- **Then** the screen offers "Não recebeu? Fale com a loja no WhatsApp"
- **And** the purchase can't go on without the code

**IDT-07 — Back after a reload**
- **Given** the code was sent
- **When** the page reloads (for example after switching to the email app)
- **Then** she is back on "Enviamos um código para {e-mail}" with the same way chosen

**IDT-08 — Create an account**
- **Given** "Criar conta" and an email with no account
- **When** she confirms the code
- **Then** she is asked "Crie sua senha" (8 to 72 characters), then "Seus dados" (`IDT-14`), and goes to "Dados e entrega" signed in

**IDT-09 — Create an account on an email that has one**
- **Given** "Criar conta" and an email that already has an account
- **When** she confirms the code
- **Then** the screen says "Este e-mail já tem uma conta. Você entrou nela e sua senha não mudou.", asks for no password, and "Continuar" goes to "Dados e entrega" signed in (through "Seus dados" first if the account lacks them, `IDT-14`)

**IDT-10 — Sign in with a password**
- **When** she taps "Já tem senha? Entrar com senha" and enters email and password
- **Then** with the right password she goes to "Dados e entrega" signed in (through "Seus dados" first if the account lacks them); with a wrong one the screen says "E-mail ou senha não conferem", keeps the email and clears the password

**IDT-11 — Already signed in**
- **Given** the customer is signed in
- **Then** "Finalizar compra" skips identification and "Dados e entrega" comes with her account's email, name, CPF (partly hidden, as "***.456.789-**") and phone, all read-only, without "Trocar e-mail"; she fills in only the address, the delivery and the boxes
- **And** these details are changed only in Dados pessoais (`CTA-06`); the purchase keeps a copy of them

**IDT-12 — No confirmed email**
- **When** she opens "Dados e entrega" or taps "Ir para pagamento" without a confirmed email
- **Then** she is taken to identification

**IDT-13 — Change the email**
- **When** she taps "Trocar e-mail"
- **Then** the confirmation is dropped and she is back on the first step, with the email empty

**IDT-14 — Sign-up details** (owner's decision of 2026-11-23)
- **Given** an account without name, CPF and phone (just created, or left without them)
- **Then** before "Dados e entrega" or the account's sections she sees "Seus dados" with "Nome completo", "CPF" and "Celular", the `CHK-03` validation, and "Continuar"
- **And** a CPF already in another account shows "Não foi possível usar este CPF." with the link "Fale com a loja no WhatsApp", and says nothing about that account
- **And** after a reload she is back on "Seus dados", still signed in
- **And** the address comes at her first purchase (`CTA-05`)

**IDT-15 — Back from the password**
- **When** she is on "Já tem senha? Entrar com senha" and taps "Voltar"
- **Then** she is back on the first step, with the email she typed

## 9. Confirmation and tracking (PED)

**PED-01 — Order confirmed**
- **Given** an approved payment
- **Then** the screen shows "Pedido confirmado", the order number, the items, the total paid, the payment method, the delivery option and the delivery time
- **And** a large check icon in the success color shows above "Pedido confirmado"
- **And** it says the confirmation was sent to the given email, partly hidden (`m***@exemplo.com`)
- **And** it offers "Acompanhar pedido" and "Continuar comprando"
- **And** with no interaction, the screen goes to the home page after 8 seconds; any interaction (tap, scroll, key, focus moving) cancels it; no countdown shows (owner's decision of 2026-11-22)

**PED-02 — Bag emptied**
- **Given** a confirmed order
- **Then** when the confirmation opens, the bag is empty and there is no reservation timer anymore

**PED-03 — Order steps** (E15)
- **When** the customer opens tracking
- **Then** she sees the steps Pagamento confirmado, Em separação, Enviado and Entregue, with the current step shown in text and the date of each completed step

**PED-04 — Tracking code** (E15)
- **Given** an order shipped by PAC or Sedex
- **Then** the screen shows the tracking code with a copy option and the tracking link
- **Given** an order shipped by courier
- **Then** the screen shows the expected delivery that day, with no Correios code

**PED-05 — Look up an order without an account**
- **When** the customer enters the order number and the email used for the purchase
- **Then** she sees that order's tracking
- **And** the screen shows items, steps, delivery time and delivery city/state; it doesn't show CPF, phone or the full address

**PED-06 — Number or email doesn't match**
- **When** the number and email don't match an order
- **Then** the screen answers "Não encontramos um pedido com esses dados", without saying which of the two is wrong

**PED-07 — Order under return** (E19)
- **Given** an order with a return requested
- **Then** tracking shows the state "Suporte em andamento"

**PED-08 — Shortcut to returns** (E19)
- **Given** an order delivered 7 days ago or less, with no request
- **Then** tracking offers "Solicitar devolução"

## 10. Returns (DEV)

**DEV-01 — Open the request** (E19)
- **Given** an order delivered 7 calendar days ago or less, with no previous request
- **When** the customer reaches returns from tracking, from the account, or by entering order number and email
- **Then** she sees the order and the form with the reason: Tamanho incorreto, Defeito, Arrependimento or Outro

**DEV-02 — Reason required** (E19)
- **Given** no reason was picked
- **Then** the "Enviar solicitação" button is disabled, with the helper text "Escolha um motivo para continuar"

**DEV-03 — Request sent** (E19)
- **When** the customer picks a reason and sends
- **Then** the screen confirms it was recorded, says the team will get in touch and that she doesn't need to do anything else for now
- **And** the order now shows as "Suporte em andamento"

**DEV-04 — Deadline passed** (E19)
- **Given** an order delivered 8 days ago or more
- **Then** the request button is disabled and the screen explains "O prazo de 7 dias para devolução terminou em DD/MM"

**DEV-05 — One request per order** (E19)
- **Given** an order that already has a request
- **Then** the screen shows the state of the existing request (Solicitada, Em tratativa, Concluída or Rejeitada) and doesn't allow opening another

**DEV-06 — Order not delivered yet** (E19)
- **Given** an order not delivered yet
- **Then** returns are not available and the screen points to the order tracking

**DEV-07 — Duplicate send**
- **When** the customer taps "Enviar solicitação" twice
- **Then** only one request is created

## 11. My account (CTA)

**CTA-01 — Sign in without a password** (E18)
- **Given** the customer is not identified
- **When** she opens the Conta tab and enters her email
- **Then** the screen says "Enviamos um código para {e-mail}", whatever the email
- **And** the 6-number code she gets opens the account, works only once and expires in 10 minutes; an email with no account goes through the full sign-up: "Crie sua senha", then "Seus dados" (`IDT-14`)
- **And** she can also use "Já tem senha? Entrar com senha" (owner's decision of 2026-11-23: code instead of link)

**CTA-02 — Account sections**
- **Given** the customer is identified
- **Then** she sees Meus pedidos, Meus endereços, Dados pessoais and Privacidade

**CTA-03 — My orders**
- **Then** the customer sees "Meus pedidos" from newest to oldest, with number, date, total and state, 24 per page with "Anterior" and "Próxima"
- **And** tapping an order opens tracking (`PED-03`) with the full details

**CTA-04 — No orders**
- **Given** an account with no orders
- **Then** the screen says "Você ainda não tem pedidos" and offers "Ver novidades"

**CTA-05 — My addresses** (owner's decisions of 2026-11-23)
- **Then** "Meus endereços" lists her addresses, the favorite first with "Favorito" (icon and text), then the newest first; with none, "Você ainda não tem endereços salvos" and "Adicionar endereço"
- **And** "Adicionar endereço" and "Editar" open the checkout's address fields with the `CHK-03` validation; "Salvar endereço" says "Endereço salvo"
- **And** "Remover" asks "Remover este endereço?" with "Remover" and "Cancelar" (same size and color), then says "Endereço removido"
- **And** "Tornar favorito" makes that address the only favorite and says "Endereço favorito atualizado"; the first address saved becomes the favorite; removing the favorite passes it to the newest remaining one
- **And** at 10 addresses "Adicionar endereço" gives way to "Você chegou ao limite de 10 endereços. Remova um para adicionar outro."
- **And** removing or editing an address never changes a past order (decision 23)

**CTA-12 — Saved addresses in checkout** (owner's decisions of 2026-11-23)
- **Given** the customer is signed in and has saved addresses
- **Then** "Dados e entrega" shows "Seus endereços" as choices, the favorite first with "Favorito", **none chosen**, and the address fields empty
- **When** she taps one
- **Then** the address fields get its values as if she had typed them (`CHK-09`, `CHK-10` apply: another CEP recalculates the shipping and shows the note); editing any of them afterwards clears the choice
- **And** signed in, "Salvar este endereço na minha conta" comes checked; on "Ir para pagamento", checked, the address is also saved in the account, without a duplicate of an equal one (CEP, street, number, complement) and skipped at 10 addresses; the purchase never fails because of it, and the lead save of `CHK-05` never saves it
- **And** a guest sees neither the choices nor the box

**CTA-06 — Personal details** (E1)
- **Then** the customer sees name, email, phone and CPF (partly hidden) and can fix name, email and phone, with the `CHK-03` validation
- **And** the CPF can't be changed from the screen
- **And** a new email only takes effect after she enters the code sent to it (owner's decision of 2026-11-23)
- **Then** the screen "Dados pessoais" shows "O CPF não pode ser alterado" next to the CPF; "Salvar" saves name and phone and says "Dados salvos"
- **When** she taps "Trocar e-mail", types the "Novo e-mail", taps "Receber código" and confirms the "Código"
- **Then** the screen says "E-mail trocado"; an email that belongs to another account shows "Este e-mail já está em outra conta" and nothing changes

**CTA-07 — Optional password** (E18)
- **Then** the customer can create a password of 8 to 72 characters to sign in without the code, in the account or at identification with "Criar conta" (`IDT-08`)
- **And** in Dados pessoais the button says "Criar senha" or "Trocar senha", the field "Nova senha", and the screen confirms "Senha salva"
- **And** nothing in the account or the purchase depends on having a password

**CTA-08 — Privacy: consents** (LGPD; owner's decisions of 2026-11-24)
- **Given** the customer is signed in, in "Privacidade" (`/conta/privacidade`)
- **Then** "Novidades" shows one box per channel, with checkout's texts ("Quero receber novidades por e-mail", "Quero receber novidades por WhatsApp", `CHK-07`), each with a line under it: "Aceito em {dd/mm/aaaa}", "Cancelado em {dd/mm/aaaa}" or "Nunca aceito"; then "As mensagens dos seus pedidos continuam chegando."
- **When** she taps a box
- **Then** that channel is accepted or revoked right away (no "Salvar"), says "Preferência salva", and the line shows the new date; the other channel and the order messages don't change
- **And** each change is recorded as a new entry with the text version and her IP; a failed change shows the error and the box keeps the state the API has
- **And** the page links to "Preferências de cookies" (`/cookies`)
- **And** every news message, by email or WhatsApp, with or without an account, carries an option to stop receiving them

**CTA-09 — Privacy: my data** (LGPD; owner's decisions of 2026-11-24)
- **Then** "Meus dados" says "Você pode pedir uma cópia dos seus dados ou a exclusão da sua conta." and "Os dados das notas fiscais ficam guardados pelo prazo que a lei exige.", with "Pedir cópia dos meus dados" and "Excluir minha conta"
- **When** she taps "Pedir cópia dos meus dados"
- **Then** the screen says "Pedido registrado. Enviaremos a cópia para {e-mail da conta} em até 15 dias." and she stays signed in; the copy goes only to the account's email
- **When** she taps "Excluir minha conta"
- **Then** "Excluir minha conta?" asks first, saying "Nossa equipe exclui sua conta em até 15 dias. Você sai da conta agora, em todos os aparelhos.", "Se entrar de novo antes disso, o pedido é cancelado." and the invoice line, with "Excluir" and "Cancelar" the same size and color
- **When** she taps "Excluir"
- **Then** the request is recorded, every session of the account ends (on every device), and `/conta` says "Pedido de exclusão registrado. Você saiu da conta em todos os aparelhos."
- **When** she signs in again (code or password) before the team deletes the account
- **Then** the request is cancelled and the screen she lands on says "Seu pedido de exclusão foi cancelado porque você entrou de novo." once; to delete, she asks again
- **And** confirming the email of a guest purchase is not a sign-in and cancels nothing

**CTA-10 — Sign out**
- **When** the customer taps "Sair"
- **Then** the session ends and the account screens ask for identification again

**CTA-11 — Someone else's account**
- **Given** the customer is identified
- **When** she tries to open an order or address that isn't hers
- **Then** she gets the same "not found" answer as for an item that doesn't exist

## 12. Decisions and open points

The requirements didn't settle these points. The owner decided on 2026-11-14; the scenarios above already follow the "Decision" column.

| # | Point | Decision |
|---|---|---|
| 1 | When the reservation starts (the flowcharts showed the timer already in the bag) | On moving on to payment; timer in the bag only with a reservation in progress (`SAC-17`, `CHK-12`) |
| 2 | Coupon together with free shipping (E6 said "never both") | They can stack; one coupon per purchase (`SAC-13`, `SAC-15`). **Replaces the E6 rule** |
| 3 | Base for free shipping and coupon | Items amount, without shipping; the R$ 300,00 count after the discount (`SAC-14`) |
| 4 | Which option becomes free | The cheapest one available for the CEP (`SAC-10`) |
| 5 | Where free shipping applies (the overview said "region/neighboring states") | All CEPs in Brazil. **Replaces the region restriction** |
| 6 | Size filter with a sold-out product | Shows last, marked (`CAT-05`) |
| 7 | "Últimas peças" | 15 units or fewer of the size in sale stock (`PRO-13`) |
| 8 | Address (E1 had a single field) | CEP, street, number, complement (optional), neighborhood, city and state |
| 9 | Incomplete lead | Saved only with all required fields valid (`CHK-05`) |
| 10 | Access to account and order | No password needed: email code (`CTA-01`, replaced the link on 2026-11-23) and lookup by number + email with reduced data (`PED-05`) |
| 11 | Visible order steps | Pagamento confirmado, Em separação, Enviado, Entregue (`PED-03`) |
| 12 | New return after a rejected one | No; one request per order (`DEV-05`) |
| 13 | Return per item and comment field | Out: whole order, reason only |
| 14 | Cancellation before shipping | Not in the launch |
| 15 | Performance measure | Main content visible (LCP) within 3 s on simulated slow 4G (`GER-08`) |
| 16 | Where the `PRO-08` CEP is kept (decided on 2026-11-18) | Inside the bag, in the API (`setCartCep`); no cookie of its own. Calculating shipping creates the bag if it doesn't exist. The CEP history of `PRO-15` is apart from this: only on her device, only with "Funcionais" (row 29) |
| 17 | Panel on add (decided on 2026-11-18) | Comes with the bag; until then the `PRO-07` message applies |
| 18 | Status of a missing product page (decided on 2026-11-19, following the Next.js docs) | The page streams, so it answers `200` with the not-found screen and a `noindex` tag (a "soft 404"). A real `404` would mean looking up the product before the page starts, which slows down every product page |
| 19 | Bag controls (decided on 2026-11-19) | Quantity with "−" and "+" buttons; delivery option chosen only on the bag page; panel closes only by her tap; coupon field always open; "Desfazer" for 10 seconds, fading out; `SAC-17` built with checkout. Same day: "Finalizar compra" is never disabled by a sold-out item; tapping it shows an error naming the piece (`SAC-07`), so she knows why she can't move on; the stock limit reads "Apenas N unidades restantes" (`SAC-04`); on a computer the panel of `SAC-01` opens from the right side, like Hering's; once free shipping is reached there is no line about it, the cheapest option just shows "Grátis" (`SAC-10`) |
| 20 | Name of the same-day courier option (decided on 2026-11-20) | The customer sees "Entrega Helena", never "Motoboy", on every screen (product, bag, checkout, order). In the code it stays `courier` |
| 21 | Email before paying (decided on 2026-11-23) | Every purchase needs an email confirmed with a 6-number code; two ways: only email, or account with password (`IDT-*`). If the email service is down, the store doesn't sell |
| 22 | "Criar conta" on an email that has an account (decided on 2026-11-23) | Denied: she is signed in by the code and the old password stays (`IDT-09`) |
| 23 | Details of a purchase and of an account (decided on 2026-11-23) | Every purchase keeps its own full details, with or without an account. An account is complete (name, CPF, phone) before it buys; the address comes at the first purchase (`IDT-14`, `CHK-05`). **Replaces "a new email gets an empty account"** (`CTA-01`) |
| 24 | One CPF per account (decided on 2026-11-23) | A CPF already in another account is refused with a neutral message; guest purchases with that CPF don't count (`IDT-14`) |
| 25 | Signed-in checkout (decided on 2026-11-23) | Name, CPF (partly hidden) and phone come from the account, read-only; changed only in Dados pessoais (`IDT-11`, `CTA-06`) |
| 26 | Which lead a guest purchase belongs to (decided on 2026-11-23) | The lead is found by the email confirmed with the code, never by the CPF (anyone can type someone else's CPF). The same CPF may be on several leads; an existing lead is never overwritten; the bag and the order keep what was typed, CPF included (`CHK-05`, `CHK-08`) |
| 27 | How long an unfinished purchase is kept (decided on 2026-11-23) | The details of a bag that never became an order, and a lead that never bought, are deleted 30 days after the last interaction. Orders keep their details for the invoice (`CHK-05`) |
| 28 | Saving the checkout address in the account (decided on 2026-11-23) | A box "Salvar este endereço na minha conta", **checked by default**, signed in only. It is not a marketing or cookie box (those stay unchecked): it serves the account she chose to create ("Sua conta guarda pedidos e endereços") and the purchase (LGPD art. 7, V). At most 10 addresses, one favorite (`CTA-05`, `CTA-12`) |
| 29 | CEP history (decided on 2026-11-23) | The shipping calculator remembers the last 5 CEPs, on her device only, and only with the optional "Funcionais" cookies, unchecked by default (`PRO-15`, `SAC-18`, `GER-05`). Nothing is ever filled in without her tap |
| 30 | Privacy and the right to one's data (decided on 2026-11-24) | Only a customer with an account gets the "Privacidade" screen (`CTA-08`, `CTA-09`). A guest asks for a copy or deletion through the contact channel on `/privacidade`, and stops news through the option in every message; an unfinished purchase is deleted after 30 days anyway (row 27). Asking for deletion ends every session at once; signing in again before the team deletes the account cancels the request |

**Settled in the contract (`contract/openapi.yaml`):** the delivery time of each option, including the courier cutoff time, comes as ready-made text from the API; the catalog is paginated (24 per page, 48 max). Sorting is in the launch by the owner's decision (`CAT-09`).

**Not in the launch** (they show in flowcharts or references, but not in the requirements): product reviews, related products, wishlist (the card's heart in `DESIGN.md` has no scenario until there is a rule for where to keep it), search suggestions, social login, digital wallets (Apple Pay, Google Pay), boleto.
