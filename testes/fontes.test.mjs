// Confere que as fontes e o idioma definidos no docs/DESIGN.md estão ligados no projeto.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ler = (caminho) => readFileSync(new URL(caminho, import.meta.url), "utf8");
const layout = ler("../app/layout.tsx");
const css = ler("../app/globals.css");

test("pagina declara portugues do Brasil", () => assert.match(layout, /lang="pt-BR"/));
test("titulos usam Playfair Display", () => assert.match(css, /--font-serif:\s*var\(--font-playfair\)/));
test("titulos tem fonte reserva serifada", () => assert.match(layout, /fallback:\s*\[\s*"Georgia",\s*"serif"\s*\]/));
test("corpo usa a fonte sem serifa", () => assert.match(css, /body\s*\{[^}]*font-family:\s*var\(--font-sans\)/));
