// Checks that the fonts and language defined in docs/DESIGN.md are wired into the project.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const layout = read("../app/layout.tsx");
const css = read("../app/globals.css");

test("page declares Brazilian Portuguese", () => assert.match(layout, /lang="pt-BR"/));
test("headings use Playfair Display", () => assert.match(css, /--font-serif:\s*var\(--font-playfair\)/));
test("headings have a serif fallback font", () => assert.match(layout, /fallback:\s*\[\s*"Georgia",\s*"serif"\s*\]/));
test("body uses the sans-serif font", () => assert.match(css, /body\s*\{[^}]*font-family:\s*var\(--font-sans\)/));
