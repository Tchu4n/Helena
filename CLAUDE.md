@AGENTS.md

# Helena — diretrizes do projeto

Loja virtual de moda (camisetas, calças, jaquetas, acessórios) para 18 a 30 anos, que compram pelo celular a partir do Instagram. MVP com orçamento enxuto. Este repositório é o front-end em Next.js; o back-end será Java + SQL Server, em repositório próprio, e ainda não existe. Ordem de trabalho: telas do cliente primeiro, painel administrativo depois.

## Restrições (valem acima de tudo)

Estas regras não têm exceção. Se uma tarefa só fecha quebrando uma delas, o agente para e pergunta ao dono. O motivo e o detalhe de cada uma estão nas seções abaixo.

**Processo**
- NUNCA fazer commit nem criar ramo; isso é do dono.
- NUNCA escrever código de comportamento que não esteja na spec. Primeiro a spec, depois o teste, depois o código.
- NUNCA alterar a asserção de um teste para ele passar.
- NUNCA commitar nada de `docs/referencias/`.
- NUNCA adicionar dependência sem necessidade clara e sem avisar o dono.
- NUNCA usar uma API do Next de memória; ler antes o guia em `node_modules/next/dist/docs/`.

**Código**
- NUNCA nome em português no código (variável, função, componente, pasta, arquivo, teste, campo do contrato, tabela ou coluna do banco), nem palavra inglesa rebuscada. O nome de cada termo do negócio está em `docs/GLOSSARIO.md`.
- NUNCA acessar o SQL Server pelo front; só a API, pelo lado do servidor.
- NUNCA escrever à mão os tipos da API nem mudar o contrato de forma não aditiva.
- NUNCA importar de dentro de outro domínio; só pelo `index.ts` dele.
- NUNCA colocar regra de negócio, validação ou estilo extenso em `app/`.
- NUNCA passar a resposta inteira da API para componente de cliente.

**Segurança e privacidade**
- NUNCA confiar só no `proxy.ts`: toda Server Action, `route.ts` e consulta protegida confere a autorização.
- NUNCA token em `localStorage` nem segredo em variável `NEXT_PUBLIC_`.
- NUNCA dado de cartão passando pelo nosso servidor ou gravado em qualquer lugar.
- NUNCA caixa de marketing ou de cookie pré-marcada, nem "Aceitar" com mais destaque que "Rejeitar".
- NUNCA pedir à cliente um dado que a venda e a nota fiscal não exigem.
- NUNCA mostrar ou preencher dados de um cadastro existente para quem não está identificada.

**Negócio**
- NUNCA cobrar sem reserva de estoque válida; se a peça zerou, bloquear antes do pagamento.
- NUNCA exigir conta, senha ou CAPTCHA para comprar.
- NUNCA aceitar mais de um cupom por compra.
- NUNCA travar o checkout porque a API de frete caiu.

**Design**
- NUNCA cor fora dos tokens, nem `sale` em botão ou link, nem sombra, nem classe `dark:`.
- NUNCA usar cor como único sinal, nem alvo de toque menor que 48px.

## Idioma

Decisão do dono em 15/11/2026, substituindo a regra anterior de código em português:

- **Código em inglês simples:** variáveis, funções, componentes, pastas, arquivos, testes, tokens, campos e rotas do contrato, tabelas e colunas do banco, e os comentários. Preferir a palavra comum à técnica (`preparing`, não `fulfillment`), para que devs iniciantes leiam sem dificuldade.
- **Glossário obrigatório:** `docs/GLOSSARIO.md` liga cada termo do negócio ao nome no código. Termo novo entra lá antes de entrar no código. Ficam como estão: `cpf`, `cep`, `pix`, `pac`, `sedex`, `whatsapp`.
- **Em português:** o texto que a cliente vê, as rotas da loja no navegador (`/sacola`, `/produto/[slug]`), os documentos (`docs/`, `README.md`, este arquivo) e as mensagens de commit.

## Documentos

| Documento | Papel |
|---|---|
| `docs/GLOSSARIO.md` | Termo do negócio em português → nome no código em inglês |
| `docs/DESIGN.md` | Fonte única do design: tokens, tipografia, componentes, onde cada cor pode aparecer |
| `docs/SPEC-CLIENT.md` | Cenários Dado/Quando/Então das 8 telas do cliente (aprovada em 14/11/2026; decisões na seção 12) |
| `contract/openapi.yaml` | Contrato OpenAPI 3.0.3 da API para as telas do cliente (aprovado em 14/11/2026; nomes passados para o inglês em 15/11/2026, por decisão do dono, antes de existir qualquer consumidor) |
| `database/schema.sql` | DDL do SQL Server (rascunho, ainda não executado; muda para o repositório do back-end quando ele existir) |
| `docs/referencias/` | Material de pesquisa do dono (requisitos, guias, capturas, fluxogramas). Só local, fora do Git. Consultar, nunca commitar |
| `docs/superpowers/plans/` | Planos de implementação já executados |

Ainda faltam: execução e aprovação do DDL em um SQL Server, credenciais de sandbox (pagamento, frete, NF-e). O servidor simulado subiu e respondeu conforme o contrato em 15/11/2026.

Os guias em `docs/referencias/` foram escritos para Next.js 15 e Tailwind 3. Onde divergirem deste arquivo ou da documentação em `node_modules/next/dist/docs/`, eles perdem.

## Como trabalhar (especificação primeiro)

- A especificação versionada é a fonte da verdade. Mudou o comportamento: altera primeiro a spec, depois o teste, depois o código.
- Teste antes do código, derivado da spec. Nunca alterar a asserção de um teste para fazê-lo passar.
- Quem faz os commits é o dono. O agente deixa as mudanças no diretório de trabalho, lista os arquivos alterados e pode sugerir a mensagem, em português.
- Nenhum ramo é criado sem avisar o dono antes e receber o ok.
- Sem dependência nova para poucas linhas. Já instaladas com o ok do dono (15/11/2026): `zod`, `server-only` e `openapi-typescript`.
- Decisão visual se mostra ao dono em página, não se descreve em texto. Material de referência se lê por inteiro antes de concluir.

## Comandos

```bash
npm run dev      # servidor local
npm test         # node:test, arquivos em tests/**/*.test.mjs
npm run lint     # eslint (o comando `next lint` não existe mais)
npm run build    # build de produção
npm run mock     # API simulada (Prism) em http://localhost:4010, a partir do contrato
npm run types    # gera src/lib/api-types.ts a partir do contrato (um teste falha se ficar desatualizado)
```

Saídas longas: filtrar antes de ler (`npm run build 2>&1 | tail -20`).

## Next.js 16: o que muda em relação aos guias

- `cookies()`, `headers()`, `params` e `searchParams` são assíncronos; sempre `await`.
- `middleware.ts` virou `proxy.ts`, com função `proxy`, e roda só em Node.
- `revalidateTag(tag, perfil)` exige o segundo argumento. Dentro de Server Action, quando a cliente precisa ver a própria alteração na hora (sacola, estoque), usar `updateTag`.
- Pré-renderização parcial se liga com `cacheComponents` no `next.config.ts`; as flags `experimental.ppr` foram removidas.
- Tailwind 4: tokens em `app/globals.css` dentro de `@theme`; não existe `tailwind.config.ts`.
- Antes de usar uma API do Next, ler o guia dela em `node_modules/next/dist/docs/`.

## Arquitetura do front

- `app/` é camada fina: só rotas, layouts e arquivos de convenção. Uma `page.tsx` busca dados e compõe; não valida, não tem regra de negócio, não tem estilo extenso.
- A lógica mora em `src/`, por domínio:

```
src/
  features/<domain>/   catalog, cart, checkout, account, returns, privacy
    components/  actions/  queries/  schemas/  index.ts
  components/ui/       primitivos (Button, Field, Badge...)
  lib/                 cliente da API, validação de ambiente
```

- Cada domínio expõe só o que é público em `index.ts`. Proibido importar de dentro de outro domínio.
- Componente de servidor por padrão. `"use client"` só nas folhas que precisam de evento, estado ou API do navegador.
- Componente de cliente não importa componente de servidor; recebe por `children` ou props.
- Arquivos de `queries/` e de `lib/` que falam com a API começam com `import "server-only"`.
- Para o componente de cliente vai só o objeto com os campos que a tela usa, nunca a resposta inteira da API: o que vira prop vai para o HTML público.
- Server Action, sempre nesta ordem: confere autorização, valida a entrada com Zod, executa, invalida o cache.
- `route.ts` só para chamadas externas (confirmação de PIX, webhooks). Interação da própria tela usa Server Action.

## Front e back

- O front nunca acessa o SQL Server. A camada de `queries/` chama a API Java, do lado do servidor.
- Contrato primeiro: o OpenAPI 3.x é escrito e aprovado antes das telas. Enquanto o back não existe, o front roda contra servidor simulado (Prism).
- Todo erro da API chega no formato RFC 9457 (`application/problem+json`); a tela trata esse formato em um ponto só.
- Mudanças no contrato são aditivas. Tipos TypeScript do cliente são gerados a partir do contrato (`npm run types`), não escritos à mão.

## Segurança

- Autorização é conferida dentro de cada Server Action, `route.ts` e consulta protegida. O `proxy.ts` só redireciona e define cabeçalhos; nunca é a única barreira.
- Sessão em cookie `httpOnly`, `Secure`, `SameSite=Lax`. Nada de token em `localStorage`.
- Nenhum segredo em variável `NEXT_PUBLIC_`. Variáveis de ambiente validadas no build.
- Cartão exige barreira antifraude do gateway; dados de cartão não passam pelo nosso servidor.

## Regras de negócio que a interface precisa respeitar

- **Reserva:** a peça fica reservada por 15 minutos a partir do início do pagamento (validade do PIX). Expirou, o estoque volta e a tela avisa.
- **Estoque:** o site mostra só o estoque de vitrine. Tamanho esgotado aparece riscado; produto esgotado vai para o fim da grade com marcação. Se zerar durante o checkout, bloquear antes de cobrar.
- **Pagamento:** PIX com confirmação na hora, ou cartão em até 6x sem juros com parcela mínima de R$ 50,00 (o número de parcelas se ajusta ao total).
- **Benefício:** cupom e frete grátis podem se acumular; um cupom por compra. Frete grátis vale para R$ 300,00 ou mais em peças, já com o desconto do cupom, em qualquer CEP do Brasil, só na modalidade mais barata; se o cupom derrubar o valor abaixo disso, o frete é recalculado.
- **Últimas peças:** aviso quando o tamanho tem 15 unidades ou menos no estoque de vitrine.
- **Frete:** por CEP (8 dígitos), com motoboy no mesmo dia na região metropolitana, PAC ou Sedex. Se a API de frete cair, aplica-se taxa fixa por região e o checkout não trava. Frete e prazo aparecem na página do produto e na sacola, antes do checkout.
- **Cadastro:** compra sem conta e sem senha. Campos obrigatórios: nome, CPF (11 dígitos), e-mail, telefone, endereço. Os dados são salvos como lead assim que preenchidos, antes do pagamento.
- **Devolução:** pedido pela própria cliente, com motivo obrigatório, até 7 dias corridos após a entrega; uma solicitação por pedido.
- **Desempenho:** página carregada em 2 a 3 segundos em 3G/4G. Mobile-first.

## Privacidade (LGPD) na interface

- Coletar só o que a venda e a nota fiscal exigem.
- Caixas de marketing desmarcadas por padrão, uma para cada canal (e-mail e WhatsApp são aceites separados). Guardar data, hora, IP e a versão do texto aceito.
- O checkout avisa que o contato informado pode ser usado para lembrar da compra não concluída. Toda mensagem de lembrete traz opção de parar de receber.
- Lembrete de sacola abandonada só fala do pedido iniciado. Oferta de outro produto é marketing e exige consentimento.
- Aviso de cookies: "Rejeitar" e "Aceitar" com o mesmo tamanho e cor, mais "Gerenciar preferências"; nada pré-marcado; a loja funciona inteira mesmo com recusa.
- O catálogo é adulto. Antes de criar categoria infantil ou campanha voltada a menores, rever as exigências do ECA Digital.

## Design (resumo; os detalhes estão em `docs/DESIGN.md`)

- Usar só os tokens: `background`, `surface`, `card`, `primary`, `muted`, `control`, `line`, `sale`, `success`, `error`. Nenhuma cor solta no código.
- Botão principal sempre `primary`. `sale` só em selo de desconto, preço promocional, timer e aviso de últimas peças; nunca em botão ou link.
- Controles em pílula (`rounded-control`); fotos, tiles e cartões de canto reto; sem sombras.
- Títulos em `font-serif` peso 400; corpo e preços em `font-sans`; rótulos em caixa alta em `font-mono`.
- Alvo de toque de 48px com 8px entre alvos; foco sempre visível; cor nunca é o único sinal.
- Sem tema escuro e sem tema de alto contraste no lançamento. Não usar classes `dark:`.
- Mexeu em cor: `npm test` confere o contraste.
