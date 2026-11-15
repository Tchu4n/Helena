# SPEC-CLIENT — telas do cliente

Especificação de comportamento das 8 telas do cliente da loja Helena, em cenários Dado/Quando/Então. É a fonte da verdade do comportamento: mudou o comportamento, muda primeiro este arquivo, depois o teste, depois o código.

- **Origem:** `Levantamento de Requisitos Helena Ecommerce` (estórias E1 a E19), fluxogramas de telas do cliente, guia de LGPD, manual de UX/UI, `CLAUDE.md` e `docs/DESIGN.md`.
- **O que não está aqui:** aparência (está em `docs/DESIGN.md`), formato das chamadas à API (virá no contrato OpenAPI), telas do painel administrativo.
- **Como ler:** cada cenário tem um código (`SAC-04`) que vira nome de teste. Entre parênteses, a estória de origem. Valores em reais são exemplos que os testes usam literalmente.
- **Estado:** aprovada pelo dono em 14/11/2026. A seção 12 registra as decisões tomadas e o que ainda depende do contrato da API.

## 1. Telas e rotas

| # | Tela | Rota proposta | Prefixo |
|---|---|---|---|
| 1 | Vitrine (página inicial) | `/` | `VIT` |
| 2 | Catálogo e filtros | `/catalogo` | `CAT` |
| 3 | Produto | `/produto/[slug]` | `PRO` |
| 4 | Sacola (painel e página) | `/sacola` | `SAC` |
| 5 | Checkout (dados, entrega, pagamento) | `/checkout` | `CHK` |
| 6 | Confirmação e rastreio | `/pedido/[numero]` | `PED` |
| 7 | Devolução | `/devolucao` | `DEV` |
| 8 | Minha conta | `/conta` | `CTA` |
| — | Comportamento comum a todas | — | `GER` |

## 2. Regras e valores usados nos cenários

| Regra | Valor |
|---|---|
| Reserva da peça | 15 minutos a partir do início do pagamento |
| Parcelamento | até 6x sem juros, parcela mínima de R$ 50,00 |
| Frete grátis | R$ 300,00 ou mais em peças, já com o desconto do cupom; qualquer CEP do Brasil; só na modalidade mais barata |
| Benefício | cupom e frete grátis podem se acumular |
| Cupom | um por compra; código de até 20 caracteres, ativo, desconto de 0 a 70% sobre o valor das peças |
| Últimas peças | aviso quando o tamanho tem 15 unidades ou menos no estoque de vitrine |
| CEP | 8 dígitos numéricos |
| CPF | 11 dígitos numéricos |
| Devolução | até 7 dias corridos após a entrega, uma solicitação por pedido |
| Modalidades de frete | Motoboy (mesmo dia, só região metropolitana), PAC, Sedex |
| Categorias | Camisetas, Calças, Jaquetas, Acessórios |

**Número máximo de parcelas** = o menor entre 6 e a parte inteira de (total ÷ 50), nunca menos que 1.

| Total | Parcelas oferecidas |
|---|---|
| R$ 49,90 | 1x |
| R$ 99,99 | 1x |
| R$ 100,00 | até 2x de R$ 50,00 |
| R$ 149,99 | até 2x |
| R$ 150,00 | até 3x |
| R$ 299,99 | até 5x |
| R$ 300,00 | até 6x de R$ 50,00 |
| R$ 1.000,00 | até 6x |

**Benefício**, com frete de R$ 20,00 na modalidade mais barata:

| Produtos | Cupom | Desconto | Frete | Total |
|---|---|---|---|---|
| R$ 320,00 | — | — | grátis | R$ 320,00 |
| R$ 320,00 | MARIA10 (10%) | R$ 32,00 | R$ 20,00 | R$ 308,00 |
| R$ 400,00 | MARIA10 (10%) | R$ 40,00 | grátis | R$ 360,00 |
| R$ 250,00 | — | — | R$ 20,00 | R$ 270,00 |
| R$ 250,00 | MARIA10 (10%) | R$ 25,00 | R$ 20,00 | R$ 245,00 |

## 3. Comportamento comum (GER)

**GER-01 — Abas inferiores no celular**
- **Dado** que a cliente está na vitrine, no catálogo ou na conta, pelo celular
- **Então** vê as abas Início, Buscar, Sacola e Conta fixas na base da tela
- **E** a aba Sacola mostra a quantidade de peças quando a sacola não está vazia

**GER-02 — Telas de compra sem abas e sem barra de anúncio**
- **Dado** que a cliente está na tela de produto, na sacola ou no checkout
- **Então** as abas inferiores dão lugar ao botão principal da tela, fixo na base
- **E** na sacola e no checkout a barra de anúncio do topo não aparece

**GER-03 — Aviso de cookies na primeira visita** (LGPD)
- **Dado** que a cliente ainda não escolheu suas preferências de cookies
- **Quando** abre qualquer página
- **Então** vê o aviso com "Rejeitar" e "Aceitar" do mesmo tamanho e cor, e "Gerenciar preferências"
- **E** nenhum cookie que dependa de consentimento foi gravado ainda

**GER-04 — Rejeitar cookies não quebra a loja** (LGPD)
- **Dado** que a cliente tocou em "Rejeitar"
- **Quando** navega, adiciona peças à sacola e conclui uma compra
- **Então** tudo funciona, e só os cookies necessários (sacola e sessão) são usados

**GER-05 — Gerenciar preferências** (LGPD)
- **Quando** a cliente toca em "Gerenciar preferências"
- **Então** vê cada categoria de cookie descrita, todas as opcionais desmarcadas
- **E** pode mudar a escolha depois, a qualquer momento, por um link no rodapé, sem precisar entrar na conta

**GER-06 — Falha da API** (RFC 9457)
- **Dado** que uma chamada à API falhou ou demorou demais
- **Então** a tela mostra uma mensagem em português com ícone, sem código técnico, e a ação "Tentar de novo"
- **E** nada que a cliente digitou é perdido

**GER-07 — Toque, foco e sinal** (E17)
- **Então** todo controle tem pelo menos 48×48px, com 8px de distância do vizinho
- **E** o foco do teclado é sempre visível e nunca fica coberto pelas barras fixas
- **E** nenhuma informação depende só de cor: selo tem texto, erro tem ícone e mensagem

**GER-08 — Desempenho em rede móvel** (E16)
- **Dado** uma conexão 4G lenta simulada, em celular intermediário
- **Quando** a cliente abre a vitrine, o catálogo ou a tela de produto
- **Então** o conteúdo principal da tela está visível em até 3 segundos

**GER-09 — Preços**
- **Então** todo valor aparece no formato `R$ 1.234,56`

## 4. Vitrine (VIT)

**VIT-01 — Conteúdo da página inicial**
- **Quando** a cliente abre a loja
- **Então** vê, nesta ordem: barra de anúncio, cabeçalho (busca, logo, sacola), bloco da coleção ou campanha em destaque, faixa de benefícios, as quatro categorias e a grade "Em destaque"

**VIT-02 — Ir para uma categoria**
- **Quando** a cliente toca em "Calças"
- **Então** vai para o catálogo já filtrado por essa categoria

**VIT-03 — Abrir um produto**
- **Quando** a cliente toca em um card de produto
- **Então** vai para a tela desse produto

**VIT-04 — Produto em promoção no card**
- **Dado** um produto de R$ 199,00 por R$ 159,00
- **Então** o card mostra o preço antigo riscado, o preço atual e o selo com o texto do desconto

**VIT-05 — Produto esgotado na grade** (E13)
- **Dado** um produto sem nenhum tamanho no estoque de vitrine
- **Então** ele aparece depois de todos os disponíveis, com a marcação "Esgotado" em texto

**VIT-06 — Chegada pelo Instagram**
- **Dado** um link de anúncio que aponta para um produto ou uma categoria
- **Quando** a cliente abre o link
- **Então** cai direto nessa tela, sem passar pela página inicial nem por tela de cadastro

## 5. Catálogo e filtros (CAT)

**CAT-01 — Filtros disponíveis** (E13)
- **Quando** a cliente toca em "Filtrar"
- **Então** pode filtrar por categoria, tamanho, cor e faixa de preço (mínimo e máximo)

**CAT-02 — A grade acompanha os filtros** (E13)
- **Quando** a cliente aplica ou remove um filtro
- **Então** a grade se atualiza sem recarregar a página inteira e mostra quantos produtos foram encontrados
- **E** os filtros ativos aparecem como chips removíveis acima da grade

**CAT-03 — Filtros ficam no endereço da página**
- **Dado** o catálogo filtrado por "Jaquetas", tamanho M
- **Quando** a cliente copia o endereço, volta com o botão do navegador ou recarrega
- **Então** os mesmos filtros continuam aplicados

**CAT-04 — Faixa de preço inválida** (E13)
- **Quando** a cliente informa mínimo de R$ 200,00 e máximo de R$ 100,00
- **Então** o filtro não é aplicado e aparece o erro "O preço mínimo não pode ser maior que o máximo"

**CAT-05 — Filtro por tamanho e estoque** (E13)
- **Dado** o filtro de tamanho M aplicado
- **Então** os produtos com M disponível vêm primeiro
- **E** os produtos sem M no estoque de vitrine vêm por último, marcados como "Esgotado no M"

**CAT-06 — Nenhum resultado**
- **Dado** uma combinação de filtros sem produtos
- **Então** a tela diz que nada foi encontrado e oferece "Limpar filtros"

**CAT-07 — Busca por texto**
- **Quando** a cliente busca "jaqueta jeans" pela aba Buscar ou pelo cabeçalho
- **Então** vê os produtos cujo nome ou categoria combinam com o texto, na mesma grade do catálogo, com os mesmos filtros disponíveis

**CAT-08 — Compra rápida pelo card**
- **Quando** a cliente toca no botão de compra rápida de um card
- **Então** escolhe o tamanho ali mesmo (esgotados riscados) e a peça entra na sacola, como em `PRO-07`

**CAT-09 — Ordenar a grade**
- **Quando** a cliente toca em "Ordenar"
- **Então** pode escolher entre Novidades (padrão), Menor preço, Maior preço, Maior desconto e Mais vendidos
- **E** a grade se reordena como em `CAT-02`, mantendo os filtros aplicados
- **E** em qualquer ordem os produtos esgotados continuam por último (`VIT-05`, `CAT-05`)
- **E** a ordem escolhida fica no endereço da página, como os filtros (`CAT-03`)

## 6. Produto (PRO)

**PRO-01 — Conteúdo da tela**
- **Quando** a cliente abre um produto
- **Então** vê as fotos, nome, preço, parcelas, cor, tamanhos, guia de medidas, tecido, coleção, descrição, cálculo de frete por CEP e o botão "Adicionar à sacola" fixo na base

**PRO-02 — Parcelas do produto** (E5)
- **Dado** um produto de R$ 199,00
- **Então** a tela mostra "até 3x de R$ 66,33 sem juros"
- **Dado** um produto de R$ 79,00
- **Então** a tela não mostra parcelamento

**PRO-03 — Tamanho esgotado** (E3, E13)
- **Dado** que o tamanho P está sem estoque de vitrine
- **Então** o chip P aparece riscado, não pode ser escolhido para compra e é anunciado como "esgotado"

**PRO-04 — Tamanho selecionado**
- **Quando** a cliente escolhe o tamanho M
- **Então** o chip M fica com borda dupla e a tela diz, em texto, "Tamanho: M"

**PRO-05 — Adicionar sem escolher tamanho**
- **Dado** que nenhum tamanho foi escolhido
- **Quando** a cliente toca em "Adicionar à sacola"
- **Então** nada entra na sacola e a tela pede "Escolha um tamanho", levando o foco aos tamanhos

**PRO-06 — Guia de medidas**
- **Quando** a cliente toca em "Guia de medidas"
- **Então** vê a tabela de medidas da categoria sem sair da tela do produto

**PRO-07 — Adicionar à sacola**
- **Dado** o tamanho M escolhido e disponível
- **Quando** a cliente toca em "Adicionar à sacola"
- **Então** a peça entra na sacola, o contador da sacola aumenta e o painel de sacola sobe (`SAC-01`)

**PRO-08 — Frete na tela do produto** (E7)
- **Quando** a cliente digita um CEP de 8 dígitos e toca em "Calcular"
- **Então** vê as modalidades disponíveis para o CEP, cada uma com valor e prazo
- **E** o CEP fica guardado para a sacola e o checkout

**PRO-09 — CEP inválido** (E7)
- **Quando** a cliente informa um CEP com menos de 8 dígitos ou com letras
- **Então** o cálculo não é feito e aparece o erro "Digite um CEP com 8 números"

**PRO-10 — Motoboy só na região metropolitana** (E7)
- **Dado** um CEP fora da região metropolitana
- **Então** a opção Motoboy não aparece; só PAC e Sedex

**PRO-11 — API de frete fora do ar** (E7)
- **Dado** que a API de frete não respondeu
- **Quando** a cliente calcula o frete
- **Então** vê valor e prazo da taxa fixa da região do CEP, e segue comprando normalmente

**PRO-12 — Avise-me quando voltar** (E9)
- **Dado** que a cliente tocou em um tamanho esgotado
- **Então** a tela oferece "Avise-me quando chegar", pedindo e-mail ou WhatsApp
- **Quando** ela informa o contato e confirma
- **Então** a tela confirma o registro e diz que o contato será usado só para esse aviso

**PRO-13 — Últimas peças**
- **Dado** que o tamanho escolhido tem 15 unidades ou menos no estoque de vitrine
- **Então** a tela mostra o aviso "Últimas peças" em texto, sem informar a quantidade exata
- **Dado** que o tamanho escolhido tem 16 unidades ou mais
- **Então** o aviso não aparece

**PRO-14 — Produto todo esgotado**
- **Dado** um produto sem nenhum tamanho disponível
- **Então** o botão principal fica desabilitado com o texto "Esgotado" e a tela oferece o aviso de `PRO-12`

## 7. Sacola (SAC)

**SAC-01 — Painel ao adicionar**
- **Dado** que a cliente acabou de adicionar uma peça
- **Então** um painel sobe da base com a peça adicionada, quanto falta para o frete grátis, o subtotal e os botões "Finalizar compra" e "Ver sacola"
- **E** fechar o painel devolve a cliente à tela em que estava

**SAC-02 — Página da sacola**
- **Quando** a cliente abre a sacola
- **Então** vê o progresso em 3 passos (Sacola, Dados e entrega, Pagamento), cada peça com foto, nome, cor, tamanho, preço e quantidade, o cálculo de frete, o campo de cupom, o total com parcelas e "Finalizar compra"

**SAC-03 — Sacola vazia**
- **Dado** uma sacola sem peças
- **Então** a tela diz que a sacola está vazia e oferece "Ver novidades"; não há botão de finalizar

**SAC-04 — Alterar quantidade** (E4)
- **Quando** a cliente aumenta ou diminui a quantidade de uma peça
- **Então** subtotal, frete, benefício e parcelas são recalculados
- **E** a quantidade não passa do estoque de vitrine daquele tamanho; ao atingir o limite, a tela avisa "Só temos N unidades"

**SAC-05 — Remover peça**
- **Quando** a cliente remove uma peça
- **Então** ela sai da lista, os valores são recalculados e a tela oferece "Desfazer" por alguns segundos

**SAC-06 — Sacola persiste**
- **Dado** uma sacola com peças, sem conta
- **Quando** a cliente fecha o navegador e volta no mesmo aparelho
- **Então** as peças continuam na sacola

**SAC-07 — Peça que esgotou enquanto estava na sacola** (E4)
- **Dado** uma peça da sacola cujo tamanho zerou no estoque de vitrine
- **Quando** a cliente abre a sacola
- **Então** a peça aparece marcada como "Esgotada", fora do total
- **E** "Finalizar compra" só é liberado depois que ela remove a peça ou troca o tamanho

**SAC-08 — Frete na sacola** (E7)
- **Dado** que a cliente já informou o CEP na tela do produto
- **Então** a sacola já mostra as modalidades com valor e prazo, e permite trocar o CEP
- **E** valem as mesmas regras de `PRO-09`, `PRO-10` e `PRO-11`

**SAC-09 — Quanto falta para o frete grátis** (E6)
- **Dado** R$ 250,00 em peças, sem cupom
- **Então** a tela mostra "Faltam R$ 50,00 para o frete grátis"
- **Dado** R$ 320,00 em peças com o cupom MARIA10 aplicado (R$ 288,00)
- **Então** a tela mostra "Faltam R$ 12,00 para o frete grátis"

**SAC-10 — Frete grátis aplicado** (E6)
- **Dado** R$ 320,00 em peças, sem cupom, e qualquer CEP válido do Brasil
- **Então** a modalidade mais barata aparece como "Grátis" e o total com ela é R$ 320,00
- **E** as outras modalidades continuam com o valor normal

**SAC-11 — Aplicar cupom válido** (E6)
- **Dado** R$ 250,00 em peças e frete de R$ 20,00
- **Quando** a cliente aplica o cupom MARIA10
- **Então** vê a linha de desconto de R$ 25,00, o total de R$ 245,00 e o cupom com a opção "Remover"

**SAC-12 — Cupom inválido ou inativo** (E6)
- **Quando** a cliente aplica um código que não existe ou está inativo
- **Então** nenhum valor muda e aparece o erro "Cupom inválido ou expirado"

**SAC-13 — Cupom e frete grátis juntos** (E6)
- **Dado** R$ 400,00 em peças com frete grátis aplicado
- **Quando** a cliente aplica o cupom MARIA10
- **Então** o desconto é de R$ 40,00, o frete continua "Grátis" e o total é R$ 360,00

**SAC-14 — Cupom derruba o valor abaixo do frete grátis** (E6)
- **Dado** R$ 320,00 em peças com frete grátis aplicado
- **Quando** a cliente aplica o cupom MARIA10
- **Então** o frete volta a ser cobrado (R$ 20,00) e o total passa a R$ 308,00
- **E** a tela explica: "Com o cupom, faltam R$ 12,00 para o frete grátis"
- **Quando** a cliente remove o cupom
- **Então** o frete volta a "Grátis" e o total a R$ 320,00

**SAC-15 — Um cupom por compra** (E6)
- **Dado** um cupom já aplicado
- **Quando** a cliente aplica outro código válido
- **Então** o novo cupom substitui o anterior

**SAC-16 — Parcelas acompanham o total** (E5)
- **Então** a sacola mostra o número máximo de parcelas conforme a tabela da seção 2, recalculado a cada mudança do total

**SAC-17 — Reserva em andamento** (E4)
- **Dado** que a cliente iniciou o pagamento e voltou para a sacola antes dos 15 minutos
- **Então** a sacola e o painel mostram o tempo restante da reserva
- **Dado** que nenhum pagamento foi iniciado
- **Então** não há timer na sacola

## 8. Checkout (CHK)

Passo 2 (dados e entrega) e passo 3 (pagamento) do progresso da sacola.

### Dados e entrega

**CHK-01 — Compra sem conta** (E18)
- **Quando** a cliente toca em "Finalizar compra"
- **Então** vai direto para o formulário de dados, sem tela de login, sem pedir senha e sem CAPTCHA

**CHK-02 — Campos obrigatórios** (E1)
- **Então** o formulário pede só: nome, CPF, e-mail, telefone e endereço de entrega
- **E** cada campo tem rótulo visível acima e o atributo `autocomplete` correspondente
- **E** o CEP informado antes já vem preenchido

**CHK-03 — Validação dos campos** (E1)

| Campo | Entrada | Resultado |
|---|---|---|
| CPF | `123.456.789-0` (10 dígitos) | erro "CPF deve ter 11 números" |
| CPF | `1234567890a` | erro "CPF deve ter 11 números" |
| E-mail | `maria.exemplo.com` | erro "Digite um e-mail válido" |
| Telefone | `(11) 9abc-0000` | erro "Digite só números" |
| CEP | `0131010` | erro "Digite um CEP com 8 números" |
| Nome, endereço | vazio | erro "Campo obrigatório" |

- **E** pontos, traços e parênteses digitados pela cliente são aceitos e descartados antes de validar
- **E** cada erro aparece junto do campo, com borda, ícone e texto, e o foco vai para o primeiro campo com erro

**CHK-04 — Dados preservados após erro**
- **Dado** um formulário com um campo inválido
- **Quando** a cliente tenta avançar
- **Então** nenhum campo já preenchido é apagado

**CHK-05 — Lead salvo antes do pagamento** (E1, E10)
- **Dado** que a cliente preencheu todos os campos obrigatórios com valores válidos
- **Quando** sai do último campo, mesmo sem avançar para o pagamento
- **Então** os dados são salvos como lead

**CHK-06 — Aviso de lembrete** (LGPD)
- **Então** junto dos campos de contato a tela avisa que e-mail e telefone podem ser usados para lembrar da compra não concluída, com link para a política de privacidade

**CHK-07 — Aceites de marketing** (LGPD)
- **Então** há duas caixas separadas e desmarcadas: "Quero receber novidades por e-mail" e "Quero receber novidades por WhatsApp"
- **E** a compra é concluída normalmente com as duas desmarcadas
- **Quando** a cliente marca uma delas e conclui a etapa
- **Então** o aceite é registrado só para aquele canal

**CHK-08 — CPF ou e-mail já cadastrado** (E18)
- **Dado** um CPF ou e-mail que já comprou na loja
- **Quando** a cliente preenche o formulário
- **Então** a compra segue sem erro de duplicidade e sem pedir login
- **E** a tela não mostra nem preenche nenhum dado antigo associado a esse CPF ou e-mail

**CHK-09 — Escolher a entrega** (E7)
- **Dado** o endereço preenchido
- **Então** a cliente escolhe uma modalidade entre as disponíveis para o CEP, com valor e prazo, e o total é atualizado
- **E** valem `PRO-10` (motoboy) e `PRO-11` (taxa fixa se a API cair)

**CHK-10 — Mudança de CEP recalcula o frete** (E7)
- **Dado** uma sacola com frete calculado para um CEP
- **Quando** a cliente informa no checkout um endereço com outro CEP
- **Então** as modalidades, os valores e os prazos são recalculados, e a tela destaca a mudança do total antes do pagamento

**CHK-11 — Resumo sempre visível**
- **Então** em todo o checkout a cliente consegue ver peças, desconto, frete, prazo e total sem sair da etapa

### Pagamento

**CHK-12 — Início do pagamento cria a reserva** (E4)
- **Dado** dados e entrega válidos
- **Quando** a cliente avança para o pagamento
- **Então** as peças ficam reservadas por 15 minutos e a tela mostra o tempo restante em contagem regressiva, com texto ("Sua reserva termina em 14:59")

**CHK-13 — Estoque zerou antes de reservar** (E4)
- **Dado** que uma peça da sacola zerou no estoque enquanto a cliente preenchia os dados
- **Quando** ela avança para o pagamento
- **Então** nenhuma cobrança é feita, a tela informa qual peça esgotou e leva de volta à sacola (`SAC-07`)

**CHK-14 — Formas de pagamento** (E5)
- **Então** a cliente escolhe entre PIX e cartão de crédito; nenhuma vem com dado sensível preenchido

**CHK-15 — Pagar com PIX** (E5)
- **Quando** a cliente escolhe PIX e confirma
- **Então** vê o QR code, o botão "Copiar código PIX", o valor e o tempo restante da reserva

**CHK-16 — PIX confirmado na hora** (E5)
- **Dado** a tela do PIX aberta
- **Quando** o pagamento é confirmado
- **Então** a cliente é levada à confirmação do pedido (`PED-01`) sem precisar recarregar a página

**CHK-17 — Reserva expirou** (E4)
- **Dado** que os 15 minutos acabaram sem pagamento
- **Então** a tela avisa que a reserva expirou e que as peças voltaram ao estoque, e o código PIX deixa de ser exibido
- **E** oferece "Tentar de novo", que refaz a reserva se ainda houver estoque (senão, `CHK-13`)

**CHK-18 — Pagar com cartão** (E5)
- **Quando** a cliente escolhe cartão
- **Então** informa os dados do cartão em campos do gateway de pagamento e escolhe o número de parcelas
- **E** os dados do cartão não passam pelo servidor da loja

**CHK-19 — Parcelas no cartão** (E5)
- **Dado** um total de R$ 150,00
- **Então** as opções são 1x de R$ 150,00, 2x de R$ 75,00 e 3x de R$ 50,00, e nenhuma outra
- **E** todas aparecem como "sem juros"

**CHK-20 — Cartão aprovado** (E5)
- **Quando** o pagamento é aprovado
- **Então** a cliente é levada à confirmação do pedido (`PED-01`)

**CHK-21 — Cartão recusado** (E5)
- **Quando** o pagamento é recusado
- **Então** a tela mostra o erro com ícone e texto, sem culpar a cliente, e oferece tentar outro cartão ou pagar com PIX
- **E** os dados pessoais e de entrega continuam preenchidos
- **E** uma nova tentativa só segue se ainda houver estoque (senão, `CHK-13`)

**CHK-22 — Toque duplo em pagar**
- **Quando** a cliente toca duas vezes em "Pagar"
- **Então** só uma cobrança é feita; o botão fica desabilitado e indica "Processando" após o primeiro toque

**CHK-23 — Voltar sem perder**
- **Quando** a cliente volta do pagamento para os dados, ou dos dados para a sacola
- **Então** tudo que foi preenchido e escolhido continua lá

## 9. Confirmação e rastreio (PED)

**PED-01 — Pedido confirmado**
- **Dado** um pagamento aprovado
- **Então** a tela mostra "Pedido confirmado", o número do pedido, as peças, o total pago, a forma de pagamento, a modalidade e o prazo de entrega
- **E** informa que a confirmação foi enviada ao e-mail informado, exibido parcialmente (`m***@exemplo.com`)
- **E** oferece "Acompanhar pedido" e "Continuar comprando"

**PED-02 — Sacola esvaziada**
- **Dado** um pedido confirmado
- **Então** a sacola fica vazia e não há mais timer de reserva

**PED-03 — Etapas do pedido** (E15)
- **Quando** a cliente abre o acompanhamento
- **Então** vê as etapas Pagamento confirmado, Em separação, Enviado e Entregue, com a etapa atual indicada por texto e a data de cada etapa concluída

**PED-04 — Código de rastreio** (E15)
- **Dado** um pedido enviado por PAC ou Sedex
- **Então** a tela mostra o código de rastreio com a opção de copiar e o link de rastreamento
- **Dado** um pedido enviado por motoboy
- **Então** a tela mostra a previsão de entrega no dia, sem código dos Correios

**PED-05 — Consultar pedido sem conta**
- **Quando** a cliente informa o número do pedido e o e-mail usado na compra
- **Então** vê o acompanhamento desse pedido
- **E** a tela mostra peças, etapas, prazo e cidade/UF de entrega; não mostra CPF, telefone nem endereço completo

**PED-06 — Número ou e-mail não confere**
- **Quando** o número e o e-mail não correspondem a um pedido
- **Então** a tela responde "Não encontramos um pedido com esses dados", sem dizer qual dos dois está errado

**PED-07 — Pedido em devolução** (E19)
- **Dado** um pedido com devolução solicitada
- **Então** o acompanhamento mostra o estado "Suporte em andamento"

**PED-08 — Atalho para devolução** (E19)
- **Dado** um pedido entregue há 7 dias ou menos, sem solicitação
- **Então** o acompanhamento oferece "Solicitar devolução"

## 10. Devolução (DEV)

**DEV-01 — Abrir a solicitação** (E19)
- **Dado** um pedido entregue há 7 dias corridos ou menos, sem solicitação anterior
- **Quando** a cliente chega à devolução pelo acompanhamento, pela conta, ou informando número do pedido e e-mail
- **Então** vê o pedido e o formulário com o motivo: Tamanho incorreto, Defeito, Arrependimento ou Outro

**DEV-02 — Motivo obrigatório** (E19)
- **Dado** que nenhum motivo foi escolhido
- **Então** o botão "Enviar solicitação" fica desabilitado, com o texto de apoio "Escolha um motivo para continuar"

**DEV-03 — Solicitação enviada** (E19)
- **Quando** a cliente escolhe um motivo e envia
- **Então** a tela confirma o registro, diz que a equipe entrará em contato e que ela não precisa fazer mais nada por enquanto
- **E** o pedido passa a aparecer como "Suporte em andamento"

**DEV-04 — Prazo encerrado** (E19)
- **Dado** um pedido entregue há 8 dias ou mais
- **Então** o botão de solicitar está desabilitado e a tela explica "O prazo de 7 dias para devolução terminou em DD/MM"

**DEV-05 — Uma solicitação por pedido** (E19)
- **Dado** um pedido que já tem solicitação
- **Então** a tela mostra o estado da solicitação existente (Solicitada, Em tratativa, Concluída ou Rejeitada) e não permite abrir outra

**DEV-06 — Pedido ainda não entregue** (E19)
- **Dado** um pedido que ainda não foi entregue
- **Então** a devolução não está disponível e a tela indica o acompanhamento do pedido

**DEV-07 — Envio duplicado**
- **Quando** a cliente toca duas vezes em "Enviar solicitação"
- **Então** só uma solicitação é criada

## 11. Minha conta (CTA)

**CTA-01 — Entrar sem senha** (E18)
- **Dado** que a cliente não está identificada
- **Quando** abre a aba Conta e informa seu e-mail
- **Então** a tela diz "Se este e-mail tiver compras, enviamos um link de acesso", qualquer que seja o e-mail
- **E** o link recebido abre a conta, vale uma única vez e expira

**CTA-02 — Seções da conta**
- **Dado** a cliente identificada
- **Então** vê Meus pedidos, Meus endereços, Dados pessoais e Privacidade

**CTA-03 — Meus pedidos**
- **Então** a cliente vê seus pedidos do mais recente ao mais antigo, com número, data, total e estado
- **E** ao tocar em um pedido abre o acompanhamento (`PED-03`) com os dados completos

**CTA-04 — Sem pedidos**
- **Dado** uma conta sem pedidos
- **Então** a tela diz que ainda não há pedidos e oferece "Ver novidades"

**CTA-05 — Meus endereços**
- **Então** a cliente pode adicionar, editar e remover endereços, com as mesmas validações do checkout
- **E** em uma nova compra identificada, o endereço salvo vem como sugestão

**CTA-06 — Dados pessoais** (E1)
- **Então** a cliente vê nome, e-mail, telefone e CPF (parcialmente oculto) e pode corrigir nome, e-mail e telefone, com as validações de `CHK-03`
- **E** o CPF não pode ser alterado pela tela

**CTA-07 — Senha opcional** (E18)
- **Então** a cliente pode criar uma senha de no mínimo 8 caracteres para entrar sem o link
- **E** nada na conta ou na compra depende de ter senha

**CTA-08 — Privacidade: consentimentos** (LGPD)
- **Então** a cliente vê, por canal (e-mail e WhatsApp), se aceitou receber novidades e quando
- **Quando** desmarca um canal
- **Então** o aceite daquele canal é revogado na hora, sem afetar o outro nem as mensagens sobre pedidos

**CTA-09 — Privacidade: meus dados** (LGPD)
- **Então** a cliente pode pedir uma cópia dos seus dados ou a exclusão deles
- **Quando** envia o pedido
- **Então** a tela confirma o registro e informa que dados de notas fiscais são mantidos pelo prazo que a lei exige

**CTA-10 — Sair**
- **Quando** a cliente toca em "Sair"
- **Então** a sessão termina e as telas da conta voltam a pedir identificação

**CTA-11 — Conta de outra pessoa**
- **Dado** a cliente identificada
- **Quando** tenta abrir um pedido ou endereço que não é dela
- **Então** recebe a mesma resposta de "não encontrado" de um item que não existe

## 12. Decisões e pontos em aberto

Os requisitos não fechavam estes pontos. O dono decidiu em 14/11/2026; os cenários acima já seguem a coluna "Decisão".

| # | Ponto | Decisão |
|---|---|---|
| 1 | Quando começa a reserva (os fluxogramas mostravam o timer já na sacola) | Ao avançar para o pagamento; timer na sacola só com reserva em andamento (`SAC-17`, `CHK-12`) |
| 2 | Cupom junto com frete grátis (a E6 dizia "nunca os dois") | Podem se acumular; um cupom por compra (`SAC-13`, `SAC-15`). **Substitui a regra da E6** |
| 3 | Base do frete grátis e do cupom | Valor das peças, sem o frete; os R$ 300,00 contam depois do desconto (`SAC-14`) |
| 4 | Qual modalidade fica grátis | A mais barata disponível para o CEP (`SAC-10`) |
| 5 | Onde vale o frete grátis (a visão geral dizia "região/estados vizinhos") | Todos os CEPs do Brasil. **Substitui a restrição de região** |
| 6 | Filtro por tamanho com produto esgotado | Aparece por último, marcado (`CAT-05`) |
| 7 | "Últimas peças" | 15 unidades ou menos do tamanho no estoque de vitrine (`PRO-13`) |
| 8 | Endereço (a E1 tinha um campo só) | CEP, rua, número, complemento (opcional), bairro, cidade e UF |
| 9 | Lead incompleto | Salva só com todos os obrigatórios válidos (`CHK-05`) |
| 10 | Acesso à conta e ao pedido | Sem senha: link por e-mail (`CTA-01`) e consulta por número + e-mail com dados reduzidos (`PED-05`) |
| 11 | Etapas visíveis do pedido | Pagamento confirmado, Em separação, Enviado, Entregue (`PED-03`) |
| 12 | Nova devolução após uma rejeitada | Não; uma solicitação por pedido (`DEV-05`) |
| 13 | Devolução por peça e campo de comentário | Fora: pedido inteiro, só com motivo |
| 14 | Cancelamento antes do envio | Fora do lançamento |
| 15 | Medida de desempenho | Conteúdo principal visível (LCP) em até 3 s em 4G lento simulado (`GER-08`) |

**Fechado no contrato (`contrato/openapi.yaml`):** o prazo de cada modalidade, inclusive o horário limite do motoboy, vem como texto pronto da API; o catálogo é paginado (24 por página, máximo 48). A ordenação entra no lançamento por decisão do dono (`CAT-09`).

**Fora do lançamento** (aparecem em fluxogramas ou referências, mas não nos requisitos): avaliações de produto, produtos relacionados, lista de favoritos (o coração do card em `DESIGN.md` fica sem cenário até haver regra de onde guardar), sugestões automáticas na busca, login social, carteiras digitais (Apple Pay, Google Pay), boleto.
