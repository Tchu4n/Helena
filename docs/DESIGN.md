# Design system — Helena

Single source of the store's design. It replaces `docs/referencias/DESIGN.md`, which stays only as a historical reference (it treated high-contrast blue as the main color and targeted Next 15 / Tailwind 3).

Decisions settled with the project owner on 2026-11-14, from the 17 reference screenshots, the screen flowcharts, the UX/UI handbook and the requirements.

## 1. Intent

Fashion store for ages 18 to 30, buying on the phone from Instagram. The design balances the finesse of luxury brands (Miu Miu, Hermès) with the conversion of retailers (Hering, Renner).

**Principle: editorial at rest, retail in action.** A still page is calm: warm background, lots of space, almost no color. Conversion signals exist, but only in the fixed places listed in section 4.

- **Goals:** product first; buying in a few taps with one hand; shipping cost and time visible before checkout; AA contrast everywhere.
- **Not in the launch:** dark theme and high-contrast theme (section 8).
- **What failure looks like:** looking like a discount store (sale color on buttons or spread across the page), or looking like a luxury showcase where the customer can't find size, price and shipping.

## 2. Settled decisions

| Decision | Choice |
|---|---|
| Background | Warm (`#FAF8F5`) |
| Sale color | Terracotta (`#9A3412`) |
| Control shape | Pill |
| Heading font | Playfair Display |
| Phone navigation | Bottom tabs |
| Bag | Panel when adding the item + page as step 1 of checkout |
| Main button | Solid black, never colored |
| Work order | Customer screens first; admin later |

## 3. Tokens

### Color

| Token | Value | Use | Contrast on background / surface |
|---|---|---|---|
| `background` | `#FAF8F5` | page background | — |
| `surface` | `#EDE8E1` | behind product photos, footer, notices | — |
| `card` | `#FFFFFF` | bag cards, panel, fields | — |
| `primary` | `#121212` | text, icons, main button | 17.7 / 15.4 |
| `muted` | `#66625C` | captions, struck-through price | 5.7 / 5.0 |
| `control` | `#857D72` | border of fields and chips (3:1 minimum) | 3.8 / 3.3 |
| `line` | `#D9D3CA` | decorative dividers; never text or control border | 1.4 |
| `sale` | `#9A3412` | see section 4 | 6.9 / 6.0 |
| `success` | `#17692F` | see section 4 | 6.4 / 5.6 |
| `error` | `#B42318` | error, always with icon and text | 6.2 / 5.4 |

White text on `sale` gives 7.3:1. `background` text on `primary` gives 17.7:1.

### Type

| Role | Font | Weight |
|---|---|---|
| Headings | Playfair Display | 400 |
| Body, prices, buttons | Geist | 400 / 500 / 600 |
| Tiny uppercase labels | Geist Mono, 0.08em tracking | 500 |

| Level | Phone | Desktop | Line height |
|---|---|---|---|
| H1 | 28px | 40px | 1.2 |
| H2 | 24px | 32px | 1.25 |
| H3 | 20px | 24px | 1.3 |
| Body | 16px | 16px | 1.5 |
| Caption | 13px | 14px | 1.4 |
| Label | 10px | 11px | 1.35 |

Sizes in `rem`. No text container has a fixed height; text always wraps, never gets cut. Reading line: 30 to 40 characters on the phone, 45 to 75 on desktop.

### Shape, space and touch

- **Controls** (button, size chip, field, badge, quantity picker): pill (`border-radius: 9999px`).
- **Photos, tiles and cards:** square corners. **Bottom panel:** 16px on the top corners only.
- **No shadows.** Separation by surface color and divider.
- **Touch target:** at least 48×48px, with 8px between targets. Main button 48px tall.
- **Focus:** 2px outline in `primary`, 2px offset.

## 4. Where each signal color may appear

| Color | Allowed | Not allowed |
|---|---|---|
| `sale` | discount badge, sale price, 15-min reservation timer, low-stock notice, campaign block on the home page | button, link, heading, navigation icon |
| `success` | free shipping, calculated delivery time, PIX confirmed, order confirmed | price, button |
| `error` | form validation, declined payment, item sold out during checkout | promotion |

Color is never the only signal: a badge has text, an error has an icon and a message, a selected size has a double border, a sold-out size is struck through.

## 5. Components

| Component | Behavior | Based on |
|---|---|---|
| Announcement bar | `primary` strip at the top with coupon or shipping; hidden on purchase screens | Hering |
| Header | search on the left, logo in the center, bag on the right | Miu Miu |
| Bottom tabs | Home, Search, Bag, Account; on the product, bag and checkout screens they give way to the fixed button | customer flowchart |
| Benefits strip | three items in monospaced labels, no color | Hering content, Hermès finish |
| Product card | 3:4 photo on `surface`, badge, heart, quick-buy button, name, price; sold out goes to the end of the grid with a mark | Miu Miu + Hering |
| Product page | gallery of 4+ photos (carousel on the phone, 2×2 grid on desktop), serif title, struck-through price + current + badge, installments, color as dots, size as chips, size guide, CEP with delivery time right below, "Adicionar à sacola" fixed at the bottom | Hering + Miu Miu |
| Bag panel | when adding the item, slides up from the bottom on the phone and opens from the right side on a computer: timer, item, amount left for free shipping, subtotal, "Finalizar compra" and "Ver sacola" | Hering |
| Bag page | reduced header, 3-step progress, timer, white cards, shipping by CEP, total with installments, "Finalizar compra" | Hermès, with early shipping |
| Form field | label above, 48px, `control` border, error with border + icon + text, `autocomplete` attributes | UX handbook |
| Cookie notice | "Rejeitar" and "Aceitar" with the same size and color; nothing checked by default | LGPD guide |

Logo: `public/logo.svg` (thin-stroke placeholder).

## 6. Accessibility, always on

- Text with at least 4.5:1 contrast; control border and focus with 3:1.
- Visible focus on everything interactive, never covered by the fixed bars (use `scroll-padding`).
- Billing address same as delivery address by default; data kept after an error.
- Checkout without account and without transcription CAPTCHA.
- Respect `prefers-reduced-motion`.
- Basic scope, as in the requirements: no advanced screen reader support and no Libras at launch.

## 7. Implementation

The project uses Tailwind 4: tokens live in `app/globals.css`, not in `tailwind.config.ts`.

**Language:** code and docs in plain English, following `docs/GLOSSARY.md`; the text the customer sees stays in Portuguese. The glossary maps the old token names to the current ones.

```css
@theme {
  --color-background: #FAF8F5;
  --color-surface: #EDE8E1;
  --color-card: #FFFFFF;
  --color-primary: #121212;
  --color-muted: #66625C;
  --color-control: #857D72;
  --color-line: #D9D3CA;
  --color-sale: #9A3412;
  --color-success: #17692F;
  --color-error: #B42318;
  --radius-control: 9999px;
}

/* inline because these variables only exist at runtime (next/font) */
@theme inline {
  --font-serif: var(--font-playfair);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}
```

- Fonts through `next/font/google`: Geist, Geist Mono and `Playfair_Display`, in `app/layout.tsx`.
- No `prefers-color-scheme: dark` block, or the store looks half dark on phones with a dark theme.
- The page declares `lang="pt-BR"`, because the store text is Portuguese.
- An automated test checks the contrast pairs of the color table.

### Approaches considered

| Approach | Assessment |
|---|---|
| Variables in `globals.css` via `@theme` | **Chosen.** It is the native Tailwind 4 way, with no extra file or dependency |
| `tailwind.config.ts`, as in the old `DESIGN.md` | Dropped: it is the Tailwind 3 format |
| JSON tokens (DTCG) compiled with Style Dictionary | Dropped: it serves to ship tokens to iOS, Android and Figma; this is a web-only store |

## 8. Not in the launch

- **Dark theme:** no requirement asks for it and no reference has it.
- **High-contrast theme:** when it comes, it redefines the same tokens at AAA level (7:1): white background and card, black text, 2px border instead of `surface` fills, links and focus in blue `#0052A3`. The blue of the old `DESIGN.md` belongs to this theme.

## 9. Open

- **Checkout (delivery and payment):** there is no real reference screenshot; only the flowcharts.
- **Real photos:** the choices were made looking at silhouettes; review background and `surface` once there are product photos.
- **Bottom part of the bag panel** in the reference does not show in the screenshot; the design in section 5 is a proposal.
- **Choices made by the writer, not the owner:** `control` and `line` as separate colors, `success` green darker than in the old `DESIGN.md`, focus outline in `primary`.
