# Glossário: termo do negócio → nome no código

Os documentos estão em português e o código está em inglês. Esta tabela fixa a tradução de cada termo, para que todo mundo use o mesmo nome. Termo novo entra aqui antes de entrar no código.

**Critério:** inglês simples, de palavras que um dev iniciante já conhece. Na dúvida entre a palavra técnica e a comum, vale a comum (`preparing`, não `fulfillment`).

**Formato dos nomes:**
- TypeScript e contrato da API: `camelCase` para campos e funções, `PascalCase` para tipos e componentes.
- Banco de dados: `snake_case`, tabela no singular, chave como `customer_id`. Palavras reservadas do SQL Server não viram nome de tabela: `customer_order`, `admin_user`, `return_request`.
- Valores de enumeração: `snake_case` minúsculo (`wrong_size`).
- Rotas da API: plural, minúsculas, com hífen (`/v1/restock-alerts`).

**Ficam como estão**, por não terem equivalente em inglês: `cpf`, `cep`, `pix`, `pac`, `sedex`, `whatsapp`. As rotas que a cliente vê no navegador também continuam em português (`/sacola`, `/produto/[slug]`), porque fazem parte da loja e não do código.

## Loja e catálogo

| Português | Código |
|---|---|
| vitrine (página inicial) | `home` |
| campanha | `campaign` |
| barra de anúncio | `announcement` |
| destaques | `featured` |
| catálogo | `catalog` |
| produto | `product` |
| tamanho do produto (variação) | `productSize` / `product_size` |
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

## Estoque

| Português | Código |
|---|---|
| estoque financeiro (total da nota) | `totalStock` / `total_stock` |
| estoque de vitrine (liberado para venda) | `saleStock` / `sale_stock` |
| quantidade reservada | `reservedStock` / `reserved_stock` |
| quantidade com defeito | `damagedStock` / `damaged_stock` |
| estoque mínimo | `minStock` / `min_stock` |
| reserva (status: reservada, confirmada, expirada) | `reservation` (`reserved`, `confirmed`, `expired`) |

## Sacola, frete e checkout

| Português | Código |
|---|---|
| sacola, item da sacola | `cart`, `cartItem` / `cart_item` |
| quantidade | `quantity` |
| cupom, desconto | `coupon`, `discount` |
| frete, cotação de frete, valor do frete | `shipping`, `shippingQuote`, `shippingAmount` |
| entrega, modalidade de entrega | `delivery`, `deliveryOption` |
| modalidades: motoboy, PAC, Sedex | `courier`, `pac`, `sedex` |
| prazo de entrega | `deliveryTime` |
| frete grátis, quanto falta para o frete grátis | `freeShipping`, `amountToFreeShipping` |
| taxa fixa de contingência | `fallback` |
| endereço: rua, número, complemento, bairro, cidade, UF | `address`: `street`, `number`, `complement`, `neighborhood`, `city`, `state` |
| cliente, lead | `customer`, `lead` |
| dados da cliente | `customerDetails` |

## Pedido e pagamento

| Português | Código |
|---|---|
| pedido, item do pedido, número do pedido | `order`, `orderItem`, `orderNumber` (tabela `customer_order`, porque `order` é palavra reservada no SQL) |
| etapas: pagamento confirmado, em separação, enviado, entregue | `payment_confirmed`, `preparing`, `shipped`, `delivered` |
| aguardando pagamento, suporte em andamento | `awaiting_payment`, `support_in_progress` |
| pagamento: PIX, cartão | `payment`: `pix`, `card` |
| status do pagamento: pendente, aprovado, recusado | `pending`, `approved`, `declined` |
| parcelas, valor da parcela | `installments`, `installmentAmount` |
| código do PIX (copia e cola) | `pixCode` |
| código de rastreio | `trackingCode` |
| nota fiscal (status: emitida, erro) | `invoice` (`issued`, `error`) |
| etiqueta (formato térmica) | `shippingLabel` / `shipping_label` (`thermal`) |

## Devolução

| Português | Código |
|---|---|
| devolução | `return` (tabela `return_request`, porque `return` é palavra reservada no SQL e no TypeScript) |
| motivo: tamanho incorreto, defeito, arrependimento, outro | `reason`: `wrong_size`, `defect`, `changed_mind`, `other` |
| status: solicitada, em tratativa, concluída, rejeitada | `requested`, `in_progress`, `completed`, `rejected` |
| prazo final | `deadline` |

## Conta, privacidade e painel

| Português | Código |
|---|---|
| conta, sessão, link de acesso | `account`, `session`, `accessLink` |
| consentimento, canal, versão do texto | `consent`, `channel`, `textVersion` |
| pedido de dados: cópia, exclusão (status: aberto, concluído) | `dataRequest`: `copy`, `deletion` (`open`, `completed`) |
| usuário do painel; perfis: administrador, atendimento, operacional | `adminUser` / `admin_user`; `admin`, `support`, `operations` |
| notificação: confirmação, rastreio, estoque reposto; envio: enviado, falha | `notification`: `confirmation`, `tracking`, `back_in_stock`; `sent`, `failed` |

## Pastas do front

| Português | Código |
|---|---|
| funcionalidades, por domínio | `src/features/<domain>/` |
| domínios: catálogo, sacola, checkout, conta, devolução, privacidade (cookies e consentimentos) | `catalog`, `cart`, `checkout`, `account`, `returns`, `privacy` |
| componentes, ações, consultas, esquemas | `components/`, `actions/`, `queries/`, `schemas/` |
| primitivos: Botão, Campo, Selo | `src/components/ui/`: `Button`, `Field`, `Badge` |
| testes | `tests/` |

## Tokens de cor

| Português (antes) | Token | Uso |
|---|---|---|
| fundo | `background` | fundo da página |
| superfície | `surface` | atrás das fotos de produto, rodapé, avisos |
| cartão | `card` | cartões da sacola, painel, campos |
| tinta | `primary` | texto, ícones, botão principal |
| suave | `muted` | legendas, preço riscado |
| controle | `control` | borda de campos e chips |
| linha | `line` | divisores decorativos |
| oferta | `sale` | selo de desconto, preço promocional, timer, últimas peças |
| benefício | `success` | frete grátis, prazo calculado, PIX e pedido confirmados |
| erro | `error` | erros |
| raio dos controles | `rounded-control` | pílula |
