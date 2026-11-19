# Base design system — Implementation plan

> **Status:** done. Rewritten on 2026-11-19 with the current names (English code and docs) and without git steps, which are the owner's job.

> **For the agent running it:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkboxes (`- [ ]`) for tracking.

**Goal:** Put the design system color, shape and type tokens into the project, with a test that blocks contrast regressions, and replace the scaffold home page with a temporary Helena page.

**Architecture:** Tokens live in `app/globals.css` inside `@theme` (Tailwind 4), which generates the utility classes (`bg-background`, `text-primary`, `rounded-control`...). Fonts come in through `next/font/google` in `app/layout.tsx` and are wired to Tailwind with `@theme inline`. The contrast test reads `globals.css` itself, so there is no second copy of the values.

**Stack:** Next.js 16.4.6 (App Router), React 19.3, Tailwind CSS 4.3.3, TypeScript, tests with `node:test` (built into Node 26, no new dependency).

**Spec:** `docs/DESIGN.md`

## Global constraints

- Code and docs in plain English, names from `docs/GLOSSARY.md`; only the text the customer sees stays in Portuguese. Commit messages in Portuguese.
- Before writing Next code, read the matching guide in `node_modules/next/dist/docs/` (rule in `AGENTS.md`). Fonts: `01-app/01-getting-started/13-fonts.md`.
- No new dependency.
- Exact token values: `background #FAF8F5`, `surface #EDE8E1`, `card #FFFFFF`, `primary #121212`, `muted #66625C`, `control #857D72`, `line #D9D3CA`, `sale #9A3412`, `success #17692F`, `error #B42318`, `--radius-control: 9999px`.
- Minimum contrast: 4.5:1 for text; 3:1 for control borders.
- No dark theme and no high-contrast theme.
- No shadows; photos, tiles and cards with square corners.
- No commits and no branches: leave the changes in the working tree, list the changed files and suggest the message, in Portuguese.

## Review focus

- **Phone in dark theme:** the store must look light, same as the light theme. Covered by the test `no automatic dark theme` (Task 1).
- **Someone changes a color later:** any text/background pair below the minimum must break the test, not slip by. Covered by the contrast tests (Task 1).
- **Playfair Display doesn't load:** headings must fall back to a system serif, not a sans-serif. Covered by the test `headings have a serif fallback font` (Task 2).
- **Text zoomed to 200% on the device:** nothing cut off on the temporary page; manual check in Step 4 of Task 3.
- **Keyboard navigation:** visible focus on every interactive element. Covered by the test `visible focus is defined` (Task 1).

---

### Task 1: Color and shape tokens with contrast test

**Files:**
- Create: `tests/contrast.test.mjs`
- Modify: `app/globals.css` (whole file), `package.json` (`scripts` block)

**Interfaces:**
- Uses: nothing.
- Produces: Tailwind classes `bg-background`, `bg-surface`, `bg-card`, `text-primary`, `text-muted`, `border-control`, `border-line`, `text-sale`, `bg-sale`, `text-success`, `text-error`, `rounded-control`; script `npm test`.

- [ ] **Step 1: Write the failing test**

In `tests/contrast.test.mjs`, with `node:test` and `node:assert/strict`. The test reads `app/globals.css` and pulls each `--color-<name>: #RRGGBB` into a `tokens` map. The function `contrast(colorA, colorB)` follows the WCAG 2.1 relative luminance formula (the same as the UX handbook, section 5).

```js
const EXPECTED = {
  background: "#FAF8F5", surface: "#EDE8E1", card: "#FFFFFF", primary: "#121212", muted: "#66625C",
  control: "#857D72", line: "#D9D3CA", sale: "#9A3412", success: "#17692F", error: "#B42318",
};
const TEXT = ["primary", "muted", "sale", "success", "error"];
const BACKGROUNDS = ["background", "surface", "card"];

test("tokens match DESIGN.md", () => assert.deepEqual(tokens, EXPECTED));

for (const t of TEXT) for (const b of BACKGROUNDS)
  test(`${t} text on ${b} has contrast >= 4.5`, () => assert.ok(contrast(tokens[t], tokens[b]) >= 4.5));

for (const b of BACKGROUNDS)
  test(`control border on ${b} has contrast >= 3`, () => assert.ok(contrast(tokens.control, tokens[b]) >= 3));

test("button text (background on primary) has contrast >= 4.5", () => assert.ok(contrast(tokens.background, tokens.primary) >= 4.5));
test("badge text (card on sale) has contrast >= 4.5", () => assert.ok(contrast(tokens.card, tokens.sale) >= 4.5));
test("controls use a pill radius", () => assert.match(css, /--radius-control:\s*9999px/));
test("no automatic dark theme", () => assert.doesNotMatch(css, /prefers-color-scheme/));
test("visible focus is defined", () => assert.match(css, /:focus-visible\s*\{[^}]*outline:\s*2px solid/));
```

- [ ] **Step 2: Add the script and watch the test fail**

In `package.json`, inside `scripts`: `"test": "node --test \"tests/**/*.test.mjs\""`.

Run: `npm test`
Expected: FAIL on `tokens match DESIGN.md` (the map only has `background` and `foreground`) and on `no automatic dark theme`.

- [ ] **Step 3: Rewrite `app/globals.css`**

Content: `@import "tailwindcss";`, a `@theme` block with the ten `--color-*` and `--radius-control` from the Global constraints, and the base rules below. Remove `:root`, the old `@theme inline` and the scaffold's `prefers-color-scheme` block.

```css
body {
  background: var(--color-background);
  color: var(--color-primary);
}

:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

- [ ] **Step 4: Watch the test pass**

Run: `npm test`
Expected: all tests pass (24 in total), 0 failures.

- [ ] **Step 5: Hand over to the owner**

List the changed files (`tests/contrast.test.mjs`, `app/globals.css`, `package.json`, `docs/DESIGN.md`, this plan, `public/logo.svg`, `.gitignore`). Suggested message: `Adiciona tokens do design system e teste de contraste`.

---

### Task 2: Fonts and language

**Files:**
- Create: `tests/fonts.test.mjs`
- Modify: `app/layout.tsx`, `app/globals.css` (adds the `@theme inline` block and the `body` rule)

**Interfaces:**
- Uses: `app/globals.css` from Task 1.
- Produces: classes `font-serif` (Playfair Display), `font-sans` (Geist), `font-mono` (Geist Mono); CSS variables `--font-playfair`, `--font-geist-sans`, `--font-geist-mono` on `<html>`.

- [ ] **Step 1: Write the failing test**

In `tests/fonts.test.mjs`, reading `app/layout.tsx` and `app/globals.css` as text:

```js
test("page declares Brazilian Portuguese", () => assert.match(layout, /lang="pt-BR"/));
test("headings use Playfair Display", () => assert.match(css, /--font-serif:\s*var\(--font-playfair\)/));
test("headings have a serif fallback font", () => assert.match(layout, /fallback:\s*\[\s*"Georgia",\s*"serif"\s*\]/));
test("body uses the sans-serif font", () => assert.match(css, /body\s*\{[^}]*font-family:\s*var\(--font-sans\)/));
```

- [ ] **Step 2: Watch the test fail**

Run: `npm test`
Expected: FAIL on the four tests in `fonts.test.mjs`.

- [ ] **Step 3: Change `app/layout.tsx`**

- Import `Playfair_Display` from `next/font/google` along with `Geist` and `Geist_Mono`.
- `const headingFont = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], weight: "400", display: "swap", fallback: ["Georgia", "serif"] })`.
- Name the other two by role: `bodyFont` (Geist) and `labelFont` (Geist Mono).
- Add `headingFont.variable` to the `<html>` `className` and change `lang="en"` to `lang="pt-BR"` (the store text is Portuguese).
- `metadata`: `title: "Helena"`, `description: "Moda para o dia a dia. Loja em construção."`.

- [ ] **Step 4: Wire the fonts to Tailwind in `app/globals.css`**

```css
/* inline because these variables only exist at runtime (next/font) */
@theme inline {
  --font-serif: var(--font-playfair);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}
```

And add `font-family: var(--font-sans);` to the `body` rule.

- [ ] **Step 5: Watch the test pass and the project build**

Run: `npm test && npm run lint && npm run build`
Expected: tests pass; lint with no errors; build ends with `✓ Compiled successfully`.

- [ ] **Step 6: Hand over to the owner**

List the changed files (`tests/fonts.test.mjs`, `app/layout.tsx`, `app/globals.css`). Suggested message: `Adiciona Playfair Display e define idioma pt-BR`.

---

### Task 3: Temporary home page

**Files:**
- Modify: `app/page.tsx` (whole file)
- Delete: `public/next.svg`, `public/vercel.svg`, `public/file.svg`, `public/globe.svg`, `public/window.svg`

**Interfaces:**
- Uses: token classes from Task 1 and font classes from Task 2; `public/logo.svg`.
- Produces: nothing other tasks use.

- [ ] **Step 1: Rewrite `app/page.tsx`**

Component `HomePage` (default export), no `"use client"`. Centered content, with `min-height` (never a fixed height):

- `Image` from `next/image` pointing to `/logo.svg`, with `alt="Helena"`, `width={160}` and `height={29}` (the SVG ratio is 264:48).
- Label `Em breve` in `font-mono`, uppercase, `text-muted`, `0.08em` tracking.
- `<h1>` `A loja está sendo preparada` in `font-serif`, weight 400, 28px on the phone and 40px from `md` up.
- Paragraph `Moda para vestir todo dia, com entrega rápida e troca em 7 dias.` in `text-muted`, max width of 40 characters.

No `dark:` class and no color outside the tokens.

- [ ] **Step 2: Delete the scaffold SVGs**

```bash
rm public/next.svg public/vercel.svg public/file.svg public/globe.svg public/window.svg
```

- [ ] **Step 3: Check nothing still points to them**

Run: `grep -rnE "dark:|next\.svg|vercel\.svg|zinc-" app/`
Expected: no lines.

Run: `npm test && npm run lint && npm run build`
Expected: everything passes.

- [ ] **Step 4: Check in the browser**

Run `npm run dev` and open `http://localhost:3000` at phone width (390px).
Expected: `#FAF8F5` background, logo, serif heading. With the browser text zoom at 200%, nothing cut off. With the system in dark theme, the page stays light.

- [ ] **Step 5: Hand over to the owner**

List the changed files (`app/page.tsx` and the deleted SVGs). Suggested message: `Troca a pagina do scaffold por pagina provisoria da Helena`.
