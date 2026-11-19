# Estrutura comum, vitrine e catálogo — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ter a vitrine (`/`) e o catálogo (`/catalogo`) funcionando contra a API, com a estrutura comum a todas as telas: cabeçalho, abas, rodapé, aviso de cookies, preços e tratamento de erro.

**Architecture:** As páginas em `app/` só buscam dados e compõem. A lógica fica em `src/`: `lib/` (ambiente, cliente da API, formatação), `components/` (primitivos e moldura da loja) e `features/` (`catalog`, `privacy`). Filtros e ordem vivem no endereço da página e são enviados por `<Form>` do `next/form`, sem JavaScript próprio. A API real é substituída nos testes por uma API falsa com dados fixos.

**Tech Stack:** Next.js 16.4.6 (App Router), React 19, Tailwind 4, Zod 4, `server-only`, tipos gerados por `openapi-typescript`, `node:test` para a lógica e Playwright para as telas.

**Spec:** `docs/SPEC-CLIENT.md` (seções 3, 4 e 5), `docs/DESIGN.md`, `contract/openapi.yaml`, `docs/GLOSSARIO.md`.

## Restrições globais

- Código em inglês simples, nomes do `docs/GLOSSARIO.md`; texto visível em português; rotas da loja em português.
- Cores só pelos tokens (`background`, `surface`, `card`, `primary`, `muted`, `control`, `line`, `sale`, `success`, `error`). `sale` nunca em botão ou link. Sem sombra, sem `dark:`.
- Controles em pílula (`rounded-control`); fotos e cartões de canto reto. Alvo de toque de 48×48px com 8px entre alvos.
- Títulos `font-serif` peso 400; corpo e preços `font-sans`; rótulos `font-mono` em caixa alta com `tracking-[0.08em]`.
- Componente de servidor por padrão; `"use client"` só onde há evento ou estado. Nenhum `"use client"` está previsto neste plano.
- Arquivos que falam com a API começam com `import "server-only"`. Para componente nunca vai a resposta inteira da API.
- Antes de usar uma API do Next, ler o guia em `node_modules/next/dist/docs/` (`form.md`, `link.md`, `cookies.md`, `image.md`, Server Actions).
- Arquivos `.ts` testados por `node:test` usam import relativo com extensão `.ts` (o `node` não entende `@/`).
- Dinheiro trafega em centavos; a tela mostra `R$ 1.234,56`.
- Commits são do dono: cada passo "Commit" é deixar os arquivos prontos e sugerir a mensagem.

## Foco da revisão

1. **API fora do ar ou lenta:** a vitrine e o catálogo mostram a mensagem de erro com "Tentar de novo" e os filtros continuam no endereço. Testado na Tarefa 2 (cliente da API) e na Tarefa 8 (tela).
2. **Endereço digitado à mão com valor estranho** (`?ordem=xyz`, `?precoMin=abc`, `?categoria=sapatos`, `?pagina=-1`): o valor inválido é ignorado e a página abre normalmente, nunca com erro 500. Testado na Tarefa 5.
3. **Parâmetro repetido** (`?tamanho=M&tamanho=G`): vale o primeiro. Testado na Tarefa 5.
4. **Rejeitar cookies e continuar navegando:** a loja segue funcionando e o aviso não volta. Testado na Tarefa 4.
5. **Texto longo** (nome de produto grande, busca com 80 caracteres): o texto quebra linha e nunca é cortado. Testado na Tarefa 6, com o nome longo da API falsa.

## Fora deste plano

- `CAT-08` (compra rápida) e a contagem de peças na aba Sacola (`GER-01`): dependem da sacola, que vem no próximo plano.
- `GER-02` e a parte de compra do `GER-04`: valem para produto, sacola e checkout, que ainda não existem.
- Tela de produto, sacola e conta: os links para `/produto/[slug]`, `/sacola` e `/conta` já existem, mas levam à página 404 até lá.

## Decisões deste plano

| Assunto | Decisão |
|---|---|
| Parâmetros no endereço do catálogo | `categoria`, `tamanho`, `cor`, `precoMin`, `precoMax`, `busca`, `ordem`, `pagina` |
| Categorias no endereço | `camisetas`, `calcas`, `jaquetas`, `acessorios` → API `tshirts`, `pants`, `jackets`, `accessories` |
| Ordem no endereço | `novidades` (padrão, fica fora do endereço), `menor-preco`, `maior-preco`, `maior-desconto`, `mais-vendidos` → API `newest`, `lowest_price`, `highest_price`, `biggest_discount`, `best_sellers` |
| Preço no endereço | reais inteiros (`precoMin=200`); a API recebe centavos (`20000`) |
| Cookie de consentimento | `helena_consent`, JSON `{"v":1,"analytics":bool,"marketing":bool}`, `httpOnly`, `SameSite=Lax`, `Secure` em produção, validade de 180 dias |
| Busca | rota `/buscar`, um formulário que envia para `/catalogo?busca=` |
| Tempo limite da API | 5 segundos; depois disso vale como falha (`GER-06`) |
| Testes de tela | Playwright, só Chromium, no tamanho de celular (Pixel 7) |

## Estrutura de arquivos

```
app/
  layout.tsx                 moldura: barra de anúncio, cabeçalho, abas, rodapé, aviso de cookies
  page.tsx                   vitrine
  catalogo/page.tsx          catálogo
  buscar/page.tsx            busca
  cookies/page.tsx           preferências de cookies
src/
  lib/env.ts                 API_URL validada
  lib/api.ts                 apiGet<T>() com erro no formato do contrato
  lib/format.ts              formatPrice()
  lib/api-types.ts           (gerado)
  components/ui/             Button, Badge, Field, ErrorMessage
  components/layout/         AnnouncementBar, Header, TabBar, Footer
  features/privacy/          consentimento de cookies
  features/catalog/          filtros, consultas, card e grade
tests/
  *.test.mjs                 lógica (node:test)
  e2e/*.spec.ts              telas (Playwright)
  e2e/fake-api.mjs           API falsa com dados fixos
playwright.config.ts
```

---

### Tarefa 0: Ícones e fotos de exemplo

Pedido do dono em 15/11/2026: ícones prontos antes das telas e SVGs genéricos de roupa para usar no lugar das fotos de produto.

**Files:**
- Create: `src/components/ui/icons.tsx`, `public/placeholders/{tshirt,pants,jacket,sneaker,accessory}.svg`
- Test: `tests/assets.test.mjs`

**Interfaces:**
- Produces: `SearchIcon`, `BagIcon`, `HomeIcon`, `UserIcon`, `CloseIcon`, `AlertIcon`, `FilterIcon`, `SortIcon`, `ChevronLeftIcon`, `ChevronRightIcon`, `CheckIcon`, cada um `({ className?: string }) => JSX`, 24×24, traço `currentColor` de 1,5, `aria-hidden`. Desenhos copiados do Lucide 1.73.0 (licença ISC, aviso no topo do arquivo).
- Produces: fotos de exemplo em `/placeholders/<nome>.svg`, proporção 3:4 (`viewBox="0 0 300 400"`), fundo `surface` (`#EDE8E1`) e traço `primary` (`#121212`), sem outra cor.

- [ ] **Passo 1:** Teste que falha em `tests/assets.test.mjs`: os 11 ícones são exportados, o arquivo usa `stroke="currentColor"` e `aria-hidden` e não tem cor em hexadecimal; as 5 fotos existem, têm `viewBox="0 0 300 400"` e só usam `#EDE8E1` e `#121212`.
- [ ] **Passo 2:** Ver falhar; criar os arquivos; ver passar.
- [ ] **Passo 3: Commit** — `feat: ícones e fotos de exemplo de produto`

### Tarefa 1: Ferramentas de teste

**Files:**
- Modify: `package.json` (scripts e `@playwright/test` em `devDependencies`), `tsconfig.json`, `.gitignore`
- Create: `playwright.config.ts`, `tests/e2e/fake-api.mjs`, `tests/e2e/smoke.spec.ts`

**Interfaces:**
- Produces: `npm test` roda os `.test.mjs` com `--conditions=react-server` (senão `server-only` lança erro fora do Next); `npm run test:e2e` faz o build, sobe a API falsa na porta 4011 e o Next na 3100 com `API_URL=http://localhost:4011`.
- Produces: a API falsa responde `GET /v1/home` e `GET /v1/products` com os dados da tabela abaixo, no formato do contrato.

| Produto (`slug`) | Nome | Preço | Preço original | Selo | Esgotado | Tamanhos (`available`) |
|---|---|---|---|---|---|---|
| `jaqueta-jeans-azul` | Jaqueta jeans | 15900 | 19900 | `-20%` | não | P sim, M sim, G não |
| `camiseta-basica-branca` | Camiseta básica | 7990 | — | — | não | P sim, M não, G sim |
| `calca-wide-de-alfaiataria-em-linho-lavado-cor-areia` | Calça wide de alfaiataria em linho lavado cor areia | 24900 | — | — | sim | todos não |

Regras da API falsa em `/v1/products`: `search=nada` → lista vazia; `search=erro` → 500 com o `InternalError` do contrato; com `size`, marca `soldOutInSize` em quem não tem o tamanho disponível e o põe no fim; esgotados sempre por último. `/v1/home` → anúncio "Frete grátis a partir de R$ 300", campanha "Coleção Verão 2027" com `link: "/catalogo?categoria=camisetas"`, os três produtos em `featured`.

- [ ] **Passo 1:** Instalar `@playwright/test` (ok do dono neste plano) e o Chromium: `npm install -D @playwright/test && npx playwright install chromium`.
- [ ] **Passo 2:** Em `tsconfig.json`, ligar `"allowImportingTsExtensions": true`. Scripts: `"test": "node --conditions=react-server --test \"tests/**/*.test.mjs\""`, `"test:e2e": "playwright test"`. Em `.gitignore`, acrescentar `/test-results/` e `/playwright-report/`.
- [ ] **Passo 3:** Escrever `playwright.config.ts` com `testDir: "tests/e2e"`, projeto único `devices["Pixel 7"]`, e dois `webServer`: `node tests/e2e/fake-api.mjs` (porta 4011) e `npm run build && npx next start -p 3100` com `env: { API_URL: "http://localhost:4011" }`, `reuseExistingServer: !process.env.CI`.
- [ ] **Passo 4:** Escrever `tests/e2e/fake-api.mjs` com `node:http`, seguindo a tabela e as regras acima. Fotos com `url: "https://imagens.helena.example/<slug>.jpg"` (o mesmo domínio dos exemplos do contrato). Nos testes de tela a imagem não carrega; o texto alternativo basta.
- [ ] **Passo 5:** Teste de fumaça `tests/e2e/smoke.spec.ts`: `test("home opens", …)` abre `/` e espera `page.getByRole("img", { name: "Helena" })` visível.
- [ ] **Passo 6:** Rodar `npm test` (29 passando) e `npm run test:e2e` (1 passando).
- [ ] **Passo 7: Commit** — `test: ferramentas de teste de tela com API falsa`

### Tarefa 2: Ambiente, cliente da API e preço

**Files:**
- Create: `src/lib/env.ts`, `src/lib/api.ts`, `src/lib/format.ts`
- Test: `tests/format.test.mjs`, `tests/api.test.mjs`

**Interfaces:**
- Produces: `env.apiUrl: string` — de `process.env.API_URL`, validada com Zod como URL; fora de produção, padrão `http://localhost:4010`; em produção, ausente é erro na subida.
- Produces: `type Problem = components["schemas"]["Problem"]`; `type ApiResult<T> = { ok: true; data: T } | { ok: false; problem: Problem }`; `apiGet<T>(path: string, query?: Record<string, string | number | undefined>): Promise<ApiResult<T>>`, que omite chaves `undefined`, usa `cache: "no-store"` e `AbortSignal.timeout(5000)`.
- Produces: `formatPrice(cents: number): string`.

- [ ] **Passo 1: Testes que falham** em `tests/format.test.mjs`:
  - `formatPrice(123456)` → `"R$ 1.234,56"`, `formatPrice(15900)` → `"R$ 159,00"`, `formatPrice(0)` → `"R$ 0,00"`. O espaço depois de `R$` é o U+00A0 do `Intl` (não deixa quebrar a linha); o teste compara com `"R$ 1.234,56"`.

  Em `tests/api.test.mjs`, com um `http.createServer` local na própria suíte e `process.env.API_URL` apontando para ele antes do `import`:
  - resposta 200 com JSON → `{ ok: true, data }`;
  - resposta 422 `application/problem+json` → `{ ok: false, problem }` com o `code` recebido;
  - servidor que não responde em 5 s → `{ ok: false, problem }` com `code: "internal_error"` e `title: "Não foi possível concluir. Tente de novo"`;
  - porta fechada → o mesmo `internal_error`;
  - resposta 500 sem corpo JSON → o mesmo `internal_error`;
  - `query` com `undefined` não aparece na URL chamada.
- [ ] **Passo 2:** Rodar `npm test` e ver os novos falharem.
- [ ] **Passo 3:** Implementar os três arquivos. `api.ts` e `env.ts` começam com `import "server-only"`. O `Problem` sintético de falha usa `type: "about:blank"`, `status: 500`.
- [ ] **Passo 4:** Rodar `npm test` e ver tudo passar.
- [ ] **Passo 5: Commit** — `feat: cliente da API com erro padronizado e formato de preço`

### Tarefa 3: Primitivos e moldura da loja

**Files:**
- Create: `src/components/ui/{Button,Badge,Field,ErrorMessage}.tsx`, `src/components/ui/index.ts`, `src/components/layout/{AnnouncementBar,Header,TabBar,Footer}.tsx`, `src/components/layout/index.ts`
- Modify: `app/layout.tsx`, `app/globals.css`
- Test: `tests/e2e/layout.spec.ts`

**Interfaces:**
- Produces: `Button({ href?, type?, variant: "primary" | "secondary", children })` — com `href` vira `next/link`; altura mínima 48px; `primary` = fundo `primary` e texto `background`; `secondary` = fundo `card`, borda `control`, texto `primary`.
- Produces: `Badge({ tone: "sale" | "neutral", children })` — pílula, rótulo `font-mono`; `sale` = fundo `sale`, texto `card`.
- Produces: `Field({ label, name, type?, defaultValue?, error?, inputMode?, autoComplete? })` — rótulo acima, 48px, borda `control`; com `error`, borda `error` + ícone + texto ligado por `aria-describedby`.
- Produces: `ErrorMessage({ title: string, retryHref: string })` — ícone, título e link "Tentar de novo"; `role="alert"`.
- Produces: `AnnouncementBar({ text: string | null })` (nada quando `null`), `Header()` (busca → `/buscar`, logo → `/`, sacola → `/sacola`), `TabBar()` (Início `/`, Buscar `/buscar`, Sacola `/sacola`, Conta `/conta`; fixa na base só abaixo de `md`), `Footer()` (link "Preferências de cookies" → `/cookies`).

- [ ] **Passo 1: Testes que falham** em `tests/e2e/layout.spec.ts`:
  - `GER-01 tabs on mobile`: em `/`, a navegação "Abas" tem os links Início, Buscar, Sacola e Conta, nessa ordem, e está visível.
  - `GER-07 touch targets`: todo link e botão dentro de `header`, da navegação "Abas" e do `footer` tem caixa com largura e altura ≥ 48.
  - `GER-07 focus not hidden`: o `html` tem `scroll-padding-bottom` ≥ a altura da barra de abas (ler os dois com `evaluate`).
  - `GER-07 focus visible`: depois de `keyboard.press("Tab")`, o elemento focado tem `outline-style` diferente de `none`.
- [ ] **Passo 2:** Rodar `npm run test:e2e` e ver falhar.
- [ ] **Passo 3:** Implementar os componentes e montar a moldura em `app/layout.tsx`. Ícones em SVG inline com `aria-hidden` e texto acessível no link. Em `globals.css`, `html { scroll-padding-bottom: 5rem }` abaixo de `md` e respeito a `prefers-reduced-motion`. A barra de anúncio recebe o texto da vitrine só na Tarefa 7; até lá, `null`.
- [ ] **Passo 4:** Rodar `npm run test:e2e`, `npm test` e `npm run lint`; tudo passa.
- [ ] **Passo 5: Commit** — `feat: primitivos de interface e moldura da loja`

### Tarefa 4: Aviso e preferências de cookies

**Files:**
- Create: `src/features/privacy/consent.ts`, `src/features/privacy/actions/saveConsent.ts`, `src/features/privacy/components/CookieBanner.tsx`, `src/features/privacy/components/CookiePreferences.tsx`, `src/features/privacy/index.ts`, `app/cookies/page.tsx`
- Modify: `app/layout.tsx`, `docs/GLOSSARIO.md` (domínio `privacy`), `CLAUDE.md` (lista de domínios)
- Test: `tests/consent.test.mjs`, `tests/e2e/cookies.spec.ts`

**Interfaces:**
- Produces: `type Consent = { v: 1; analytics: boolean; marketing: boolean }`; `CONSENT_COOKIE = "helena_consent"`; `parseConsent(raw: string | undefined): Consent | null` (JSON inválido, `v` diferente ou campo faltando → `null`); `serializeConsent(c: Consent): string`.
- Produces: `getConsent(): Promise<Consent | null>` (lê `cookies()`); Server Action `saveConsent(formData)` com campo `choice` = `"reject" | "accept" | "custom"` (+ `analytics`, `marketing` quando `custom`), validado com Zod, que grava o cookie (180 dias) e volta para a página de origem. Não exige autorização: grava só a escolha da própria visitante.
- Produces: `CookieBanner()` — texto "Usamos cookies necessários para a loja funcionar e, com a sua permissão, cookies opcionais.", botões "Rejeitar" e "Aceitar" (mesmo componente `Button variant="secondary"`, mesma largura) e o link "Gerenciar preferências" → `/cookies`.

- [ ] **Passo 1: Testes que falham.** `tests/consent.test.mjs`: `parseConsent(undefined)` → `null`; `parseConsent("lixo")` → `null`; `parseConsent('{"v":2,"analytics":true,"marketing":true}')` → `null`; ida e volta com `serializeConsent` devolve o mesmo objeto.

  `tests/e2e/cookies.spec.ts` (contexto novo, sem cookies):
  - `GER-03 banner on first visit`: o aviso aparece; "Rejeitar" e "Aceitar" têm a mesma largura, altura e `background-color`; `context.cookies()` não tem `helena_consent`.
  - `GER-04 reject keeps the store working`: tocar em "Rejeitar" → o aviso some, o cookie vale `{"v":1,"analytics":false,"marketing":false}`, e abrir `/catalogo` funciona sem o aviso voltar.
  - `GER-05 manage preferences`: "Gerenciar preferências" leva a `/cookies` com "Necessários" marcado e desabilitado, "Análise" e "Marketing" desmarcados; marcar "Análise" e salvar grava `analytics: true, marketing: false`; o rodapé tem "Preferências de cookies" levando a `/cookies` mesmo depois da escolha.
- [ ] **Passo 2:** Rodar e ver falhar.
- [ ] **Passo 3:** Implementar. O layout chama `getConsent()` e só renderiza o `CookieBanner` quando o resultado é `null`. Os botões são um `<form action={saveConsent}>` com `name="choice"`, então funcionam sem JavaScript.
- [ ] **Passo 4:** Rodar `npm test` e `npm run test:e2e`; tudo passa.
- [ ] **Passo 5: Commit** — `feat: aviso e preferências de cookies (LGPD)`

### Tarefa 5: Filtros do catálogo

**Files:**
- Create: `src/features/catalog/filters.ts`
- Test: `tests/catalog-filters.test.mjs`

**Interfaces:**
- Produces: `type CatalogFilters = { category?: Category; size?: string; color?: string; minPrice?: number; maxPrice?: number; search?: string; sort: Sort; page: number }`, com preços em reais inteiros, `Category` e `Sort` do contrato.
- Produces: `parseFilters(params: Record<string, string | string[] | undefined>): { filters: CatalogFilters; priceError: string | null }`.
- Produces: `toSearchParams(filters: CatalogFilters): string` — sem `ordem` quando `newest`, sem `pagina` quando 1; ordem fixa das chaves: `categoria, tamanho, cor, precoMin, precoMax, busca, ordem, pagina`.
- Produces: `toApiQuery(filters: CatalogFilters): Record<string, string | number | undefined>` — preços × 100, nomes do contrato.
- Produces: `activeChips(filters: CatalogFilters): { label: string; href: string }[]` — um chip por filtro (não por ordem nem página); `href` é `/catalogo?` + os filtros sem aquele e com `pagina` voltando a 1.
- Produces: `CATEGORY_LABELS: Record<Category, string>` (`Camisetas`, `Calças`, `Jaquetas`, `Acessórios`) e `SORT_LABELS: Record<Sort, string>` (`Novidades`, `Menor preço`, `Maior preço`, `Maior desconto`, `Mais vendidos`).

- [ ] **Passo 1: Testes que falham**:
  - `CAT-03`: `parseFilters({ categoria: "jaquetas", tamanho: "M" })` dá `category: "jackets", size: "M", sort: "newest", page: 1`, e `toSearchParams` disso devolve `"categoria=jaquetas&tamanho=M"`.
  - `CAT-04`: `{ precoMin: "200", precoMax: "100" }` → `priceError: "O preço mínimo não pode ser maior que o máximo"`, sem `minPrice` nem `maxPrice` nos filtros.
  - `CAT-09`: `{ ordem: "menor-preco" }` → `sort: "lowest_price"`; `toApiQuery` → `sort: "lowest_price"`; `toSearchParams` → `"ordem=menor-preco"`.
  - Preços: `{ precoMin: "200" }` → `toApiQuery` com `minPrice: 20000`.
  - Foco da revisão 2: `{ ordem: "xyz", precoMin: "abc", categoria: "sapatos", pagina: "-1" }` → `sort: "newest"`, sem `minPrice`, sem `category`, `page: 1`, `priceError: null`.
  - Foco da revisão 3: `{ tamanho: ["M", "G"] }` → `size: "M"`.
  - Busca: `{ busca: "  jaqueta jeans  " }` → `search: "jaqueta jeans"`; texto vazio vira ausente; mais de 80 caracteres é cortado em 80 (limite do contrato).
  - `CAT-02` chips: filtros `{ category: "jackets", size: "M" }` → chips `"Jaquetas"` com `href "/catalogo?tamanho=M"` e `"Tamanho M"` com `href "/catalogo?categoria=jaquetas"`.
- [ ] **Passo 2:** Rodar e ver falhar.
- [ ] **Passo 3:** Implementar `filters.ts` como funções puras, sem `server-only` e com imports relativos `.ts`.
- [ ] **Passo 4:** Rodar `npm test`; tudo passa.
- [ ] **Passo 5: Commit** — `feat: filtros e ordem do catálogo no endereço da página`

### Tarefa 6: Consulta, card e grade de produtos

**Files:**
- Create: `src/features/catalog/queries/{getHome,listProducts}.ts`, `src/features/catalog/components/{ProductCard,ProductGrid}.tsx`, `src/features/catalog/index.ts`
- Modify: `next.config.ts` (`images.remotePatterns` para `https://imagens.helena.example/**`; a URL definitiva entra quando houver hospedagem de imagens)
- Test: `tests/e2e/product-card.spec.ts`

**Interfaces:**
- Consumes: `apiGet` (Tarefa 2), `toApiQuery` (Tarefa 5), `formatPrice` (Tarefa 2), `Badge` (Tarefa 3).
- Produces: `getHome(): Promise<ApiResult<HomeView>>` e `listProducts(filters: CatalogFilters): Promise<ApiResult<ProductListView>>`, que já devolvem só os campos usados pela tela:
  - `CardProduct = { slug; name; photoUrl; photoAlt; price; originalPrice: number | null; discountBadge: string | null; soldOut: boolean; soldOutInSize: boolean }`
  - `HomeView = { announcement: string | null; campaign: { title; text: string | null; imageUrl; imageAlt; link }; featured: CardProduct[] }`
  - `ProductListView = { items: CardProduct[]; total: number; page: number; perPage: number }`
- Produces: `ProductCard({ product: CardProduct, size?: string })` — link inteiro para `/produto/<slug>`; foto 3:4 sobre `surface`; nome; preço atual; quando há `originalPrice`, o antigo riscado (`<s>`) em `muted` e o atual em `sale`, mais o `Badge tone="sale"` com `discountBadge`; quando `soldOut`, rótulo "Esgotado"; quando `soldOutInSize` e há `size`, rótulo "Esgotado no <size>".
- Produces: `ProductGrid({ products: CardProduct[], size?: string })` — duas colunas no celular, quatro a partir de `md`, na ordem recebida.

- [ ] **Passo 1: Testes que falham** em `tests/e2e/product-card.spec.ts`, em `/` (grade "Em destaque"):
  - `VIT-04 sale card`: o card "Jaqueta jeans" mostra "R$ 199,00" dentro de `s`, "R$ 159,00" e o selo "-20%".
  - `VIT-05 sold out last`: o último card da grade é a calça, com o texto "Esgotado".
  - `VIT-03 card opens product`: o link do card "Camiseta básica" aponta para `/produto/camiseta-basica-branca`.
  - Foco da revisão 5: o nome da calça aparece inteiro (o `innerText` do card contém o nome completo) e o card não tem `overflow: hidden` cortando texto (`scrollHeight <= clientHeight` no bloco de texto).
- [ ] **Passo 2:** Rodar e ver falhar (a vitrine ainda não usa a grade; a Tarefa 7 liga). Para este passo, a página `/` provisória passa a renderizar `ProductGrid` com `getHome()` sob o título "Em destaque".
- [ ] **Passo 3:** Implementar consultas (com `import "server-only"` e mapeamento resposta → visão) e componentes.
- [ ] **Passo 4:** Rodar `npm run test:e2e`, `npm test` e `npm run lint`; tudo passa.
- [ ] **Passo 5: Commit** — `feat: card e grade de produtos com dados da API`

### Tarefa 7: Vitrine

**Files:**
- Modify: `app/page.tsx`, `app/layout.tsx` (texto da barra de anúncio)
- Create: `src/features/catalog/components/{Campaign,BenefitsStrip,CategoryTiles}.tsx`
- Test: `tests/e2e/home.spec.ts`

**Interfaces:**
- Consumes: `getHome`, `ProductGrid`, `CATEGORY_LABELS`, `AnnouncementBar`, `ErrorMessage`.
- Produces: `BenefitsStrip()` com os três itens "Frete grátis a partir de R$ 300", "Até 6x sem juros" e "Devolução em até 7 dias", em rótulo `font-mono` caixa alta, sem cor de sinal. `CategoryTiles()` com as quatro categorias, cada uma levando a `/catalogo?categoria=<slug>`.

A barra de anúncio aparece em todas as telas desta etapa, então o texto vem de `getHome()` chamado pelo layout. Para layout e página não chamarem a API duas vezes na mesma renderização, `getHome` é envolvida em `cache` do React (`import { cache } from "react"`).

- [ ] **Passo 1: Testes que falham** em `tests/e2e/home.spec.ts`:
  - `VIT-01 home order`: em `/`, aparecem nesta ordem no DOM: a barra com "Frete grátis a partir de R$ 300", o `header`, o título "Coleção Verão 2027", a faixa de benefícios, os quatro links de categoria e o título "Em destaque".
  - `VIT-02 category tile`: tocar em "Calças" leva a `/catalogo?categoria=calcas`.
  - `GER-06 home with API down`: o teste chama `POST http://localhost:4011/__fail?path=/v1/home` (a API falsa passa a responder 500 nesse caminho) e, no `afterEach`, `POST /__reset`. A página mostra "Não foi possível concluir. Tente de novo" e o link "Tentar de novo". Esta suíte roda com `test.describe.configure({ mode: "serial" })`, porque a falha vale para toda a API falsa.
- [ ] **Passo 2:** Acrescentar `/__fail` e `/__reset` à API falsa (só existe nos testes). Rodar e ver falhar.
- [ ] **Passo 3:** Implementar a vitrine. Com `getHome()` falhando, a página mostra `ErrorMessage` com `retryHref="/"` e a barra de anúncio some.
- [ ] **Passo 4:** Rodar tudo; passa.
- [ ] **Passo 5:** Tirar capturas da vitrine em 390px e 1280px (`page.screenshot`) e mostrar ao dono numa página, como pede o `CLAUDE.md`, antes de seguir para o catálogo.
- [ ] **Passo 6: Commit** — `feat: vitrine`

### Tarefa 8: Catálogo e busca

**Files:**
- Create: `app/catalogo/page.tsx`, `app/buscar/page.tsx`, `src/features/catalog/components/{FilterPanel,SortPanel,FilterChips,ResultCount,Pagination}.tsx`
- Test: `tests/e2e/catalog.spec.ts`

**Interfaces:**
- Consumes: `parseFilters`, `toSearchParams`, `activeChips`, `CATEGORY_LABELS`, `SORT_LABELS` (Tarefa 5); `listProducts`, `ProductGrid` (Tarefa 6); `Field`, `Button`, `ErrorMessage` (Tarefa 3).
- Produces: `FilterPanel({ filters, priceError })` — `<details>` com resumo "Filtrar" e um `<Form action="/catalogo">` do `next/form` com categoria (rádios), tamanho (`P`, `M`, `G`, `GG`), cor (texto), preço mínimo e máximo em reais (`Field inputMode="numeric"`), campos ocultos para `busca` e `ordem`, e o botão "Aplicar". `SortPanel({ filters })` — `<details>` "Ordenar" com rádios das cinco ordens e "Aplicar", carregando os filtros em campos ocultos. `ResultCount({ total })` — "1 produto" / "N produtos". `Pagination({ filters, total, perPage })` — "Anterior" e "Próxima" só quando existem.

Comportamento da página `/catalogo` (`searchParams` é assíncrono; `await`): `parseFilters` → se `priceError`, mostra o erro no campo de preço e busca sem o filtro de preço → `listProducts` → erro da API vira `ErrorMessage` com `retryHref` igual ao endereço atual; lista vazia vira "Nenhum produto encontrado" com o link "Limpar filtros" → `/catalogo`.

- [ ] **Passo 1: Testes que falham** em `tests/e2e/catalog.spec.ts`:
  - `CAT-01 filters`: abrir "Filtrar" mostra categoria, tamanho, cor, preço mínimo e preço máximo.
  - `CAT-02 apply filter`: escolher "Jaquetas" e "Aplicar" leva a `/catalogo?categoria=jaquetas` sem recarregar a página (um `window.__marker` definido antes continua definido depois), mostra a contagem e o chip "Jaquetas"; tocar no chip volta para `/catalogo`.
  - `CAT-03 filters in the URL`: abrir `/catalogo?categoria=jaquetas&tamanho=M`, recarregar e voltar com `goBack` depois de outra navegação: os chips "Jaquetas" e "Tamanho M" continuam.
  - `CAT-04 invalid price range`: preço mínimo 200 e máximo 100 → aparece "O preço mínimo não pode ser maior que o máximo" e não há chip de preço.
  - `CAT-05 size filter`: `/catalogo?tamanho=M` → o último card é "Camiseta básica" com "Esgotado no M".
  - `CAT-06 no results`: `/catalogo?busca=nada` → "Nenhum produto encontrado" e o link "Limpar filtros" para `/catalogo`.
  - `CAT-07 search`: na aba Buscar, digitar "jaqueta jeans" e enviar leva a `/catalogo?busca=jaqueta+jeans`, com a grade e o botão "Filtrar" disponíveis.
  - `CAT-09 sort`: com `/catalogo?categoria=jaquetas`, escolher "Menor preço" em "Ordenar" leva a `/catalogo?categoria=jaquetas&ordem=menor-preco` e o chip "Jaquetas" continua.
  - `GER-06 catalog with API down`: `/catalogo?busca=erro&categoria=jaquetas` mostra "Não foi possível concluir. Tente de novo" e "Tentar de novo" aponta para o mesmo endereço, com os filtros.
- [ ] **Passo 2:** Rodar e ver falhar.
- [ ] **Passo 3:** Implementar a página, a busca e os painéis.
- [ ] **Passo 4:** Rodar `npm test`, `npm run test:e2e` e `npm run lint`; tudo passa.
- [ ] **Passo 5:** Capturas do catálogo (com filtros abertos, vazio e com erro) em 390px, mostradas ao dono.
- [ ] **Passo 6: Commit** — `feat: catálogo com filtros, ordem e busca`

### Tarefa 9: Desempenho e conferência final

**Files:**
- Create: `tests/e2e/performance.spec.ts`

- [ ] **Passo 1: Teste** `GER-08 main content under 3s`: com CDP (`Network.emulateNetworkConditions`: 400 kbit/s de download, 400 ms de latência, aproximação do "4G lento" do Lighthouse) e `Emulation.setCPUThrottlingRate` 4, abrir `/` e `/catalogo` e ler o LCP por `PerformanceObserver` (`largest-contentful-paint`); cada um abaixo de 3000 ms.
- [ ] **Passo 2:** Rodar. Se passar de 3 s, a correção é desta tarefa (prioridade na primeira imagem com `priority`, fontes com `display: swap`, nada de JavaScript novo).
- [ ] **Passo 3:** Rodar tudo: `npm test`, `npm run test:e2e`, `npm run lint`, `npm run build`. Conferir à mão em `npm run dev` + `npm run mock` que vitrine e catálogo abrem com a API simulada de verdade.
- [ ] **Passo 4: Commit** — `test: medida de desempenho da vitrine e do catálogo`
