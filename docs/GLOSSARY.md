# Glossary: business term → name in the code

The business is talked about in Portuguese (by the owner, the customer and the store text); code and docs are in English. This table fixes the name of each term, so everyone uses the same one. A new term goes here before it goes into the code.

**Rule:** plain English, with words a beginner dev already knows. When torn between the technical word and the common one, pick the common one (`preparing`, not `fulfillment`).

**Name format:**
- TypeScript and API contract: `camelCase` for fields and functions, `PascalCase` for types and components.
- Database: `snake_case`, singular table names, keys like `customer_id`. SQL Server reserved words don't become table names: `customer_order`, `admin_user`, `return_request`.
- Enum values: lowercase `snake_case` (`wrong_size`).
- API routes: plural, lowercase, hyphenated (`/v1/restock-alerts`).

**Kept as they are**, since they have no English equivalent: `cpf`, `cep`, `pix`, `pac`, `sedex`, `whatsapp`.

**What the customer sees stays in Portuguese:** screen text, store routes in the browser (`/sacola`, `/produto/[slug]`) and their query parameters (table below). Everything else is in English.

## Store URLs (customer sees them, so Portuguese)

| Store URL | Code |
|---|---|
| `/` (vitrine) | `HomePage` |
| `/catalogo` | `CatalogPage` |
| `/buscar` | `SearchPage` |
| `/produto/[slug]` | `ProductPage` |
| `/sacola` | cart page |
| `/cookies` | `CookiesPage` |
| `/checkout` (dados e entrega) | `CheckoutPage` |
| `/checkout/identificacao` | `IdentificationPage` |
| `/checkout/pagamento` | `PaymentPage` |
| `/privacidade` (política de privacidade; page still to build) | `PrivacyPage` |
| `/conta` | `AccountPage` |
| `/conta/pedidos` (meus pedidos) | `MyOrdersPage` |
| `/conta/dados` (dados pessoais) | `PersonalDetailsPage` |
| `/conta/enderecos` (meus endereços) | `MyAddressesPage` |
| `/conta/privacidade` (privacidade da conta) | `AccountPrivacyPage` |
| `/pedido` (consultar pedido sem conta) | `OrderLookupPage` |
| `/pedido/[numero]` (confirmação e acompanhamento) | `OrderPage` |
| `?confirmado=1` (confirmação logo após o pagamento) | `confirmed` |
| `?categoria=` | `category` |
| `?tamanho=` | `size` |
| `?cor=` | `color` |
| `?precoMin=`, `?precoMax=` | `minPrice`, `maxPrice` |
| `?busca=` | `search` |
| `?ordem=` | `sort` |
| `?pagina=` (catálogo, busca, meus pedidos) | `page` |
| `?sessao=encerrada` (identificação depois de a sessão terminar na API) | `sessionEnded` |
| `?exclusao=pedida`, `?exclusao=cancelada` (`/conta` depois de pedir a exclusão; `/conta` ou `/checkout` depois de um login que a cancelou) | `deletion`: `requested`, `cancelled` |
| `ordem`: `novidades`, `menor-preco`, `maior-preco`, `maior-desconto`, `mais-vendidos` | `newest`, `lowest_price`, `highest_price`, `biggest_discount`, `best_sellers` |
| `categoria`: `camisetas`, `calcas`, `jaquetas`, `acessorios` | `tshirts`, `pants`, `jackets`, `accessories` |

## Store and catalog

| Portuguese | Code |
|---|---|
| vitrine (home page) | `home` |
| campanha | `campaign` |
| barra de anúncio | `announcement` |
| destaques | `featured` |
| catálogo | `catalog` |
| produto | `product` |
| tamanho do produto (variant) | `productSize` / `product_size` |
| foto | `photo` |
| guia de medidas | `sizeGuide` / `size_guide` |
| categoria: camisetas, calças, jaquetas, acessórios | `category`: `tshirts`, `pants`, `jackets`, `accessories` |
| cor, tecido, coleção | `color`, `fabric`, `collection` |
| preço, preço original | `price`, `originalPrice` |
| selo de desconto | `discountBadge` |
| esgotado | `soldOut` |
| últimas peças | `lowStock` |
| avise-me quando chegar | `restockAlert` / `restock_alert` |
| filtros, ordem | `filters`, `sort` |
| ordem: novidades, menor preço, maior preço, maior desconto, mais vendidos | `newest`, `lowest_price`, `highest_price`, `biggest_discount`, `best_sellers` |
| busca | `search` |

## Stock

| Portuguese | Code |
|---|---|
| estoque financeiro (invoice total) | `totalStock` / `total_stock` |
| estoque de vitrine (released for sale) | `saleStock` / `sale_stock` |
| quantidade reservada | `reservedStock` / `reserved_stock` |
| quantidade com defeito | `damagedStock` / `damaged_stock` |
| estoque mínimo | `minStock` / `min_stock` |
| reserva (status: reservada, confirmada, expirada) | `reservation` (`reserved`, `confirmed`, `expired`) |

## Bag, shipping and checkout

| Portuguese | Code |
|---|---|
| sacola, item da sacola | `cart`, `cartItem` / `cart_item` |
| quantidade | `quantity` |
| cupom, desconto | `coupon`, `discount` |
| frete, cotação de frete, valor do frete | `shipping`, `shippingQuote`, `shippingAmount` |
| entrega, modalidade de entrega | `delivery`, `deliveryOption` |
| modalidades: Entrega Helena (motoboy da loja, mesmo dia), PAC, Sedex | `courier`, `pac`, `sedex` |
| prazo de entrega | `deliveryTime` |
| frete grátis, quanto falta para o frete grátis | `freeShipping`, `amountToFreeShipping` |
| taxa fixa de contingência | `fallback` |
| endereço: rua, número, complemento, bairro, cidade, UF | `address`: `street`, `number`, `complement`, `neighborhood`, `city`, `state` |
| cliente, lead | `customer`, `lead` |
| dados da cliente | `customerDetails` |
| painel da sacola | `CartPanel` |
| compra rápida | `QuickBuy` |
| etapas da compra | `PurchaseSteps` |
| desfazer remoção | `restoreItem` |
| finalizar compra | `goToCheckout` |
| dados e entrega (formulário) | `DetailsForm` |
| pagamento (tela) | `PaymentPanel` |
| resumo do pedido | `OrderSummary` |
| ir para pagamento | `goToPayment` |
| salvar lead | `saveLead` |
| cronômetro da reserva | `ReservationTimer` |
| forma de pagamento (escolha), reserva encerrada | `PaymentMethods`, `expired` |
| fim da reserva (sacola e pagamento) | `reservationExpiresAt` |
| campos do cartão (gateway simulado), token do cartão | `SimulatedCardFields` (its handle: `CardGateway`), `cardToken` (field and the function that makes the fake token) |
| conferir os campos do cartão | `checkCard` |
| pagar com cartão | `payWithCard` |
| gerar código PIX | `payWithPix` |
| conferir pagamento (PIX) | `checkPayment` |
| encerrar a compra (apagar sacola e cookie do pedido) | `finishPurchase`, `forgetCart` |
| pedido em pagamento (leitura) | `getPaymentOrder` |
| cookie do pedido | `helena_order` |

## Order and payment

| Portuguese | Code |
|---|---|
| pedido, item do pedido, número do pedido | `order`, `orderItem`, `orderNumber` (table `customer_order`, because `order` is a SQL reserved word) |
| etapas: pagamento confirmado, em separação, enviado, entregue | `payment_confirmed`, `preparing`, `shipped`, `delivered` |
| aguardando pagamento, suporte em andamento | `awaiting_payment`, `support_in_progress` |
| pagamento: PIX, cartão | `payment`: `pix`, `card` |
| status do pagamento: pendente, aprovado, recusado | `pending`, `approved`, `declined` |
| parcelas, valor da parcela | `installments`, `installmentAmount` |
| código do PIX (copia e cola) | `pixCode` |
| código de rastreio | `trackingCode` |
| pedido na tela (textos prontos), montar a partir da API | `OrderView`, `toOrderView` |
| ler o pedido (com o acesso do cookie) | `getOrder` |
| consultar pedido (número + e-mail) | `lookUpOrder`, `OrderLookupForm` |
| confirmação do pedido (tela) | `OrderConfirmation` |
| acompanhamento do pedido (tela) | `OrderTracking` |
| copiar código de rastreio | `CopyTrackingCode` |
| cookie de acompanhamento | `helena_tracking`, `readTrackingAccess`, `saveTrackingAccess` |
| nota fiscal (status: emitida, erro) | `invoice` (`issued`, `error`) |
| etiqueta (thermal format) | `shippingLabel` / `shipping_label` (`thermal`) |

## Returns

| Portuguese | Code |
|---|---|
| devolução | `return` (table `return_request`, because `return` is a reserved word in SQL and TypeScript) |
| motivo: tamanho incorreto, defeito, arrependimento, outro | `reason`: `wrong_size`, `defect`, `changed_mind`, `other` |
| status: solicitada, em tratativa, concluída, rejeitada | `requested`, `in_progress`, `completed`, `rejected` |
| prazo final | `deadline` |

## Account, privacy and admin

| Portuguese | Code |
|---|---|
| conta, sessão, link de acesso (não usado pela loja desde 2026-11-23) | `account`, `session`, `accessLink` |
| identificação (etapa antes de "Dados e entrega") | `identification`, `IdentificationForm` |
| comprar só com e-mail, criar conta | `way`: `guest`, `account` |
| código enviado por e-mail, e-mail confirmado | `code`, `verifiedEmail` |
| pedir código, confirmar código, trocar e-mail | `requestCode`, `confirmCode`, `changeEmail` |
| criar senha, entrar com senha, sair | `createPassword`, `signInWithPassword`, `signOut` |
| conta nova (criada agora) | `newAccount` |
| cookie da sessão | `helena_session` (`readSession`, `saveSession`, `clearSession`) |
| cookie da identificação (código pendente) | `helena_identification` (`readIdentification`, `saveIdentification`, `clearIdentification`) |
| início da conta (tela) | `AccountHome` |
| seus dados (cadastro da conta: nome, CPF, celular) | `details` step, `saveAccountDetails`, `AccountDetails`, `detailsComplete` |
| dados de contato (nome, CPF, celular) | `contact` (`contactInput`, `CONTACT_FIELDS`) |
| conta (registro) e cliente de compra sem conta (lead) | `is_account` = 1 / 0 in `customer` |
| meus pedidos | `MyOrders`, `listMyOrders`, `MyOrderView` |
| meus endereços, endereço salvo, favorito | `MyAddresses`, `listMyAddresses`, `AddressView`, `SavedAddress`, `favorite` (`is_favorite`), `makeFavorite` |
| adicionar/editar endereço, remover endereço, limite de endereços | `saveAddress` (action), `removeAddress`, `address_limit` |
| salvar este endereço na minha conta (caixa do checkout) | `saveAddress` (field of the customer step) |
| campos de endereço | `addressInput`, `ADDRESS_FIELDS`, `ADDRESS_FIELD_SPECS` |
| histórico de CEPs (pesquisados recentemente) | `cepHistory` (`helena_ceps` in `localStorage`; `CepSuggestions`, `rememberCep`, `clearCepHistory`) |
| cookies funcionais | `functional` (in the consent cookie) |
| dados pessoais | `PersonalDetails`, `updateContact`, `requestEmailChange`, `confirmEmailChange`, `setPassword` |
| WhatsApp da loja | `STORE_WHATSAPP` |
| consentimento, canal, versão do texto | `consent`, `channel`, `textVersion` |
| aceite de novidades (vindo da API; não confundir com o cookie) | `MarketingConsent` |
| pedido de dados: cópia, exclusão (status: aberto, concluído, cancelado) | `dataRequest`: `copy`, `deletion` (`open`, `completed`, `cancelled`) |
| exclusão cancelada por um novo login | `deletionCancelled` |
| usuário do painel; perfis: administrador, atendimento, operacional | `adminUser` / `admin_user`; `admin`, `support`, `operations` |
| notificação: confirmação, rastreio, estoque reposto; envio: enviado, falha | `notification`: `confirmation`, `tracking`, `back_in_stock`; `sent`, `failed` |

## Front-end folders

| Meaning | Code |
|---|---|
| features, by domain | `src/features/<domain>/` |
| domains: catalog, bag, checkout, orders (confirmation and tracking), account, returns, privacy (cookies and consents) | `catalog`, `cart`, `checkout`, `orders`, `account`, `returns`, `privacy` |
| components, actions, queries, schemas | `components/`, `actions/`, `queries/`, `schemas/` |
| primitives: button, field, badge | `src/components/ui/`: `Button`, `Field`, `Badge` |
| tests | `tests/` |

## Color tokens

| Old Portuguese name | Token | Use |
|---|---|---|
| fundo | `background` | page background |
| superfície | `surface` | behind product photos, footer, notices |
| cartão | `card` | bag cards, panel, fields |
| tinta | `primary` | text, icons, main button |
| suave | `muted` | captions, struck-through price |
| controle | `control` | border of fields and chips |
| linha | `line` | decorative dividers |
| oferta | `sale` | discount badge, sale price, timer, low stock |
| benefício | `success` | free shipping, calculated delivery time, PIX and order confirmed |
| erro | `error` | errors |
| raio dos controles | `rounded-control` | pill |
