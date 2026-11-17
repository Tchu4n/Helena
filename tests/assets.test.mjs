// Checks the icon set and the placeholder product photos against docs/DESIGN.md.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

const ICONS = [
  "SearchIcon", "BagIcon", "HomeIcon", "UserIcon", "CloseIcon", "AlertIcon",
  "FilterIcon", "SortIcon", "ChevronLeftIcon", "ChevronRightIcon", "CheckIcon",
];
const PLACEHOLDERS = ["tshirt", "pants", "jacket", "sneaker", "accessory"];
const TOKEN_COLORS = new Set(["#EDE8E1", "#121212"]); // surface and primary

test("every icon is exported", () => {
  const icons = read("../src/components/ui/icons.tsx");
  for (const name of ICONS) assert.match(icons, new RegExp(`export function ${name}\\b`), name);
});

test("icons follow the text color and are hidden from screen readers", () => {
  const icons = read("../src/components/ui/icons.tsx");
  assert.match(icons, /stroke="currentColor"/);
  assert.match(icons, /aria-hidden/);
  assert.doesNotMatch(icons, /#[0-9a-fA-F]{3,6}\b/);
});

for (const name of PLACEHOLDERS) {
  test(`placeholder ${name} is 3:4 and uses only token colors`, () => {
    const svg = read(`../public/placeholders/${name}.svg`);
    assert.match(svg, /viewBox="0 0 300 400"/);
    const colors = svg.match(/#[0-9a-fA-F]{6}\b/g) ?? [];
    assert.ok(colors.length > 0);
    for (const c of colors) assert.ok(TOKEN_COLORS.has(c.toUpperCase()), c);
  });
}
