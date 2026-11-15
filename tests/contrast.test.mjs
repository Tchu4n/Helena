// Checks the color tokens in app/globals.css against the contrast minimums in docs/DESIGN.md.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const tokens = Object.fromEntries(
  [...css.matchAll(/--color-([a-z]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map(([, name, value]) => [name, value.toUpperCase()]),
);

// Relative luminance and contrast ratio from WCAG 2.1.
function luminance(color) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const channel = parseInt(color.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(colorA, colorB) {
  const [light, dark] = [luminance(colorA), luminance(colorB)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

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
