# Base do design system — Plano de implementação

> **Para quem executa (agente):** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendada) ou superpowers:executing-plans para implementar este plano tarefa por tarefa. Os passos usam caixas (`- [ ]`) para acompanhamento.

**Objetivo:** Colocar no projeto os tokens de cor, forma e tipografia do design system, com um teste que impede regressão de contraste, e trocar a página inicial do scaffold por uma provisória da Helena.

**Arquitetura:** Os tokens vivem em `app/globals.css` dentro de `@theme` (Tailwind 4), o que gera as classes utilitárias (`bg-fundo`, `text-tinta`, `rounded-controle`...). As fontes entram por `next/font/google` em `app/layout.tsx` e são ligadas ao Tailwind por `@theme inline`. O teste de contraste lê o próprio `globals.css`, então não existe segunda cópia dos valores.

**Stack:** Next.js 16.4.6 (App Router), React 19.3, Tailwind CSS 4.3.3, TypeScript, testes com `node:test` (embutido no Node 26, sem dependência nova).

**Spec:** `docs/DESIGN.md`

## Restrições globais

- Tudo que for possível no código fica em PT-BR: tokens, variáveis, funções, arquivos próprios, comentários, nomes de teste e mensagens de commit. Identificadores sem acento nem cedilha. Só fica em inglês o que a ferramenta exige (`page.tsx`, `layout.tsx`, `@theme`, `--font-sans`, script `test`).
- Antes de escrever código Next, ler o guia correspondente em `node_modules/next/dist/docs/` (regra do `AGENTS.md`). Fontes: `01-app/01-getting-started/13-fonts.md`.
- Nenhuma dependência nova.
- Valores exatos dos tokens: `fundo #FAF8F5`, `superficie #EDE8E1`, `cartao #FFFFFF`, `tinta #121212`, `suave #66625C`, `controle #857D72`, `linha #D9D3CA`, `oferta #9A3412`, `beneficio #17692F`, `erro #B42318`, `--radius-controle: 9999px`.
- Contraste mínimo: 4,5:1 para texto; 3:1 para borda de controle.
- Sem tema escuro e sem tema de alto contraste.
- Sem sombras; fotos, tiles e cartões de canto reto.
- Trabalhar no ramo `base-design-system`, não em `main`.

## Foco de revisão

- **Celular em tema escuro:** a loja deve aparecer clara, igual ao tema claro. Coberto pelo teste `nao tem tema escuro automatico` (Tarefa 1).
- **Alguém troca uma cor depois:** qualquer par texto/fundo abaixo do mínimo deve quebrar o teste, não passar despercebido. Coberto pelos testes de contraste (Tarefa 1).
- **Playfair Display não carrega:** os títulos devem cair em uma serifada do sistema, não em sem serifa. Coberto pelo teste `titulos tem fonte reserva serifada` (Tarefa 2).
- **Texto ampliado em 200% no aparelho:** nada cortado na página provisória; conferência manual no Passo 4 da Tarefa 3.
- **Navegação por teclado:** foco visível em qualquer elemento interativo. Coberto pelo teste `foco visivel definido` (Tarefa 1).

---

### Tarefa 1: Tokens de cor e forma com teste de contraste

**Arquivos:**
- Criar: `testes/contraste.test.mjs`
- Modificar: `app/globals.css` (arquivo inteiro), `package.json` (bloco `scripts`)

**Interfaces:**
- Consome: nada.
- Produz: classes Tailwind `bg-fundo`, `bg-superficie`, `bg-cartao`, `text-tinta`, `text-suave`, `border-controle`, `border-linha`, `text-oferta`, `bg-oferta`, `text-beneficio`, `text-erro`, `rounded-controle`; script `npm test`.

- [ ] **Passo 1: Criar o ramo**

```bash
git switch -c base-design-system
```

- [ ] **Passo 2: Escrever o teste que falha**

Em `testes/contraste.test.mjs`, com `node:test` e `node:assert/strict`. O teste lê `app/globals.css` e extrai cada `--color-<nome>: #RRGGBB` para um mapa `tokens`. A função `contraste(corA, corB)` segue a fórmula de luminância relativa da WCAG 2.1 (a mesma do manual de UX, seção 5).

```js
const ESPERADO = {
  fundo: "#FAF8F5", superficie: "#EDE8E1", cartao: "#FFFFFF", tinta: "#121212", suave: "#66625C",
  controle: "#857D72", linha: "#D9D3CA", oferta: "#9A3412", beneficio: "#17692F", erro: "#B42318",
};
const TEXTO = ["tinta", "suave", "oferta", "beneficio", "erro"];
const FUNDOS = ["fundo", "superficie", "cartao"];

test("tokens tem os valores do DESIGN.md", () => assert.deepEqual(tokens, ESPERADO));

for (const t of TEXTO) for (const f of FUNDOS)
  test(`texto ${t} sobre ${f} tem contraste >= 4.5`, () => assert.ok(contraste(tokens[t], tokens[f]) >= 4.5));

for (const f of FUNDOS)
  test(`borda controle sobre ${f} tem contraste >= 3`, () => assert.ok(contraste(tokens.controle, tokens[f]) >= 3));

test("texto do botao (fundo sobre tinta) tem contraste >= 4.5", () => assert.ok(contraste(tokens.fundo, tokens.tinta) >= 4.5));
test("texto do selo (cartao sobre oferta) tem contraste >= 4.5", () => assert.ok(contraste(tokens.cartao, tokens.oferta) >= 4.5));
test("raio dos controles e pilula", () => assert.match(css, /--radius-controle:\s*9999px/));
test("nao tem tema escuro automatico", () => assert.doesNotMatch(css, /prefers-color-scheme/));
test("foco visivel definido", () => assert.match(css, /:focus-visible\s*\{[^}]*outline:\s*2px solid/));
```

- [ ] **Passo 3: Adicionar o script e ver o teste falhar**

Em `package.json`, dentro de `scripts`: `"test": "node --test \"testes/**/*.test.mjs\""`.

Rodar: `npm test`
Esperado: FALHA em `tokens tem os valores do DESIGN.md` (o mapa vem só com `background` e `foreground`) e em `nao tem tema escuro automatico`.

- [ ] **Passo 4: Reescrever `app/globals.css`**

Conteúdo: `@import "tailwindcss";`, um bloco `@theme` com os dez `--color-*` e `--radius-controle` das Restrições globais, e as regras de base abaixo. Remover `:root`, o `@theme inline` antigo e o bloco `prefers-color-scheme` do scaffold.

```css
body {
  background: var(--color-fundo);
  color: var(--color-tinta);
}

:focus-visible {
  outline: 2px solid var(--color-tinta);
  outline-offset: 2px;
}
```

- [ ] **Passo 5: Ver o teste passar**

Rodar: `npm test`
Esperado: todos os testes passam (24 no total), 0 falhas.

- [ ] **Passo 6: Commit**

```bash
git add testes/contraste.test.mjs app/globals.css package.json docs/DESIGN.md docs/superpowers/plans/2026-11-14-base-design-system.md public/logo.svg .gitignore
git commit -m "Adiciona tokens do design system e teste de contraste"
```

---

### Tarefa 2: Fontes e idioma

**Arquivos:**
- Criar: `testes/fontes.test.mjs`
- Modificar: `app/layout.tsx`, `app/globals.css` (acrescenta bloco `@theme inline` e a regra de `body`)

**Interfaces:**
- Consome: `app/globals.css` da Tarefa 1.
- Produz: classes `font-serif` (Playfair Display), `font-sans` (Geist), `font-mono` (Geist Mono); variáveis CSS `--font-playfair`, `--font-geist-sans`, `--font-geist-mono` no `<html>`.

- [ ] **Passo 1: Escrever o teste que falha**

Em `testes/fontes.test.mjs`, lendo `app/layout.tsx` e `app/globals.css` como texto:

```js
test("pagina declara portugues do Brasil", () => assert.match(layout, /lang="pt-BR"/));
test("titulos usam Playfair Display", () => assert.match(css, /--font-serif:\s*var\(--font-playfair\)/));
test("titulos tem fonte reserva serifada", () => assert.match(layout, /fallback:\s*\[\s*"Georgia",\s*"serif"\s*\]/));
test("corpo usa a fonte sem serifa", () => assert.match(css, /body\s*\{[^}]*font-family:\s*var\(--font-sans\)/));
```

- [ ] **Passo 2: Ver o teste falhar**

Rodar: `npm test`
Esperado: FALHA nos quatro testes de `fontes.test.mjs`.

- [ ] **Passo 3: Alterar `app/layout.tsx`**

- Importar `Playfair_Display` de `next/font/google` junto de `Geist` e `Geist_Mono`.
- `const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], weight: "400", display: "swap", fallback: ["Georgia", "serif"] })`.
- Acrescentar `playfair.variable` ao `className` do `<html>` e trocar `lang="en"` por `lang="pt-BR"`.
- `metadata`: `title: "Helena"`, `description: "Moda para o dia a dia. Loja em construção."`.
- Renomear as constantes para PT-BR: `geistSans` → `fonteCorpo`, `geistMono` → `fonteRotulo`, `playfair` → `fonteTitulo`.

- [ ] **Passo 4: Ligar as fontes ao Tailwind em `app/globals.css`**

```css
/* inline porque estas variáveis só existem em tempo de execução (next/font) */
@theme inline {
  --font-serif: var(--font-playfair);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}
```

E acrescentar `font-family: var(--font-sans);` à regra `body`.

- [ ] **Passo 5: Ver o teste passar e o projeto compilar**

Rodar: `npm test && npm run lint && npm run build`
Esperado: testes passam; lint sem erros; build termina com `✓ Compiled successfully`.

- [ ] **Passo 6: Commit**

```bash
git add testes/fontes.test.mjs app/layout.tsx app/globals.css
git commit -m "Adiciona Playfair Display e define idioma pt-BR"
```

---

### Tarefa 3: Página inicial provisória

**Arquivos:**
- Modificar: `app/page.tsx` (arquivo inteiro)
- Remover: `public/next.svg`, `public/vercel.svg`, `public/file.svg`, `public/globe.svg`, `public/window.svg`

**Interfaces:**
- Consome: classes de token da Tarefa 1 e de fonte da Tarefa 2; `public/logo.svg`.
- Produz: nada que outras tarefas usem.

- [ ] **Passo 1: Reescrever `app/page.tsx`**

Componente `PaginaInicial` (export default), sem `"use client"`. Conteúdo, centralizado, com `min-height` (nunca altura fixa):

- `Image` de `next/image` apontando para `/logo.svg`, com `alt="Helena"`, `width={160}` e `height={29}` (a proporção do SVG é 264:48).
- Rótulo `Em breve` com `font-mono`, caixa alta, `text-suave`, espaçamento `0.08em`.
- `<h1>` `A loja está sendo preparada` com `font-serif`, peso 400, 28px no celular e 40px a partir de `md`.
- Parágrafo `Moda para vestir todo dia, com entrega rápida e troca em 7 dias.` com `text-suave`, largura máxima de 40 caracteres.

Nenhuma classe `dark:` e nenhuma cor fora dos tokens.

- [ ] **Passo 2: Remover os SVGs do scaffold**

```bash
git rm public/next.svg public/vercel.svg public/file.svg public/globe.svg public/window.svg
```

- [ ] **Passo 3: Conferir que não sobrou referência**

Rodar: `grep -rnE "dark:|next\.svg|vercel\.svg|zinc-" app/`
Esperado: nenhuma linha.

Rodar: `npm test && npm run lint && npm run build`
Esperado: tudo passa.

- [ ] **Passo 4: Conferir no navegador**

Rodar `npm run dev` e abrir `http://localhost:3000` em largura de celular (390px).
Esperado: fundo `#FAF8F5`, logo, título em serifa. Com o zoom de texto do navegador em 200%, nada cortado. Com o sistema em tema escuro, a página continua clara.

- [ ] **Passo 5: Commit**

```bash
git add app/page.tsx
git commit -m "Troca a pagina do scaffold por pagina provisoria da Helena"
```
