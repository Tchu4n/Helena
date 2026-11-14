@AGENTS.md

# Helena — diretrizes do projeto

Loja virtual de moda (camisetas, calças, jaquetas, acessórios) para 18 a 30 anos, que compram pelo celular a partir do Instagram. MVP com orçamento enxuto. Este repositório é o front-end em Next.js; o back-end será Java + SQL Server, em repositório próprio, e ainda não existe. Ordem de trabalho: telas do cliente primeiro, painel administrativo depois.

## Idioma

- Tudo que for possível fica em PT-BR, para o dono auditar à mão: tokens, variáveis, funções, componentes, pastas e arquivos próprios, comentários, nomes de teste, mensagens de commit e documentos.
- Identificadores sem acento nem cedilha (`superficie`, `cartao`). Texto visível e comentários com acentuação normal.
- Só fica em inglês o que a ferramenta exige: `page.tsx`, `layout.tsx`, `route.ts`, `proxy.ts`, `@theme`, `--font-sans`, script `test`.

## Documentos

| Documento | Papel |
|---|---|
| `docs/DESIGN.md` | Fonte única do design: tokens, tipografia, componentes, onde cada cor pode aparecer |
| `docs/referencias/` | Material de pesquisa do dono (requisitos, guias, capturas, fluxogramas). Só local, fora do Git. Consultar, nunca commitar |
| `docs/superpowers/plans/` | Planos de implementação já executados |

Ainda faltam, nesta ordem: `SPEC-CLIENT.md` (cenários Dado/Quando/Então das 8 telas do cliente), contrato OpenAPI 3.x com servidor simulado, DDL do SQL Server, credenciais de sandbox (pagamento, frete, NF-e).

Os guias em `docs/referencias/` foram escritos para Next.js 15 e Tailwind 3. Onde divergirem deste arquivo ou da documentação em `node_modules/next/dist/docs/`, eles perdem.

## Como trabalhar (especificação primeiro)

- A especificação versionada é a fonte da verdade. Mudou o comportamento: altera primeiro a spec, depois o teste, depois o código.
- Teste antes do código, derivado da spec. Nunca alterar a asserção de um teste para fazê-lo passar.
- Um ramo por tarefa; commits pequenos, em português.
- Sem dependência nova para poucas linhas. `zod` e `server-only` entram quando a primeira Server Action e o primeiro arquivo de acesso a dados forem escritos.
- Decisão visual se mostra ao dono em página, não se descreve em texto. Material de referência se lê por inteiro antes de concluir.

## Comandos

```bash
npm run dev      # servidor local
npm test         # node:test, arquivos em testes/**/*.test.mjs
npm run lint     # eslint (o comando `next lint` não existe mais)
npm run build    # build de produção
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
  funcionalidades/<dominio>/   catalogo, sacola, checkout, conta, devolucao
    componentes/  acoes/  consultas/  esquemas/  index.ts
  componentes/ui/              primitivos (Botao, Campo, Selo...)
  lib/                         cliente da API, validação de ambiente
```

- Cada domínio expõe só o que é público em `index.ts`. Proibido importar de dentro de outro domínio.
- Componente de servidor por padrão. `"use client"` só nas folhas que precisam de evento, estado ou API do navegador.
- Componente de cliente não importa componente de servidor; recebe por `children` ou props.
- Arquivos de `consultas/` e de `lib/` que falam com a API começam com `import "server-only"`.
- Para o componente de cliente vai só o objeto com os campos que a tela usa, nunca a resposta inteira da API: o que vira prop vai para o HTML público.
- Server Action, sempre nesta ordem: confere autorização, valida a entrada com Zod, executa, invalida o cache.
- `route.ts` só para chamadas externas (confirmação de PIX, webhooks). Interação da própria tela usa Server Action.

## Front e back

- O front nunca acessa o SQL Server. A camada de `consultas/` chama a API Java, do lado do servidor.
- Contrato primeiro: o OpenAPI 3.x é escrito e aprovado antes das telas. Enquanto o back não existe, o front roda contra servidor simulado (Prism).
- Todo erro da API chega no formato RFC 9457 (`application/problem+json`); a tela trata esse formato em um ponto só.
- Mudanças no contrato são aditivas. Tipos TypeScript do cliente são gerados a partir do contrato, não escritos à mão.

## Segurança

- Autorização é conferida dentro de cada Server Action, `route.ts` e consulta protegida. O `proxy.ts` só redireciona e define cabeçalhos; nunca é a única barreira.
- Sessão em cookie `httpOnly`, `Secure`, `SameSite=Lax`. Nada de token em `localStorage`.
- Nenhum segredo em variável `NEXT_PUBLIC_`. Variáveis de ambiente validadas no build.
- Cartão exige barreira antifraude do gateway; dados de cartão não passam pelo nosso servidor.

## Regras de negócio que a interface precisa respeitar

- **Reserva:** a peça fica reservada por 15 minutos a partir do início do pagamento (validade do PIX). Expirou, o estoque volta e a tela avisa.
- **Estoque:** o site mostra só o estoque de vitrine. Tamanho esgotado aparece riscado; produto esgotado vai para o fim da grade com marcação. Se zerar durante o checkout, bloquear antes de cobrar.
- **Pagamento:** PIX com confirmação na hora, ou cartão em até 6x sem juros com parcela mínima de R$ 50,00 (o número de parcelas se ajusta ao total).
- **Benefício:** um só por compra, cupom OU frete grátis. Frete grátis vale para pedidos a partir de R$ 300,00 na região atendida; se o cupom derrubar o total abaixo disso, o frete é recalculado.
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

- Usar só os tokens: `fundo`, `superficie`, `cartao`, `tinta`, `suave`, `controle`, `linha`, `oferta`, `beneficio`, `erro`. Nenhuma cor solta no código.
- Botão principal sempre `tinta`. `oferta` só em selo de desconto, preço promocional, timer e aviso de últimas peças; nunca em botão ou link.
- Controles em pílula (`rounded-controle`); fotos, tiles e cartões de canto reto; sem sombras.
- Títulos em `font-serif` peso 400; corpo e preços em `font-sans`; rótulos em caixa alta em `font-mono`.
- Alvo de toque de 48px com 8px entre alvos; foco sempre visível; cor nunca é o único sinal.
- Sem tema escuro e sem tema de alto contraste no lançamento. Não usar classes `dark:`.
- Mexeu em cor: `npm test` confere o contraste.
