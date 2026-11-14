// Confere os tokens de cor do app/globals.css contra os mínimos de contraste do docs/DESIGN.md.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const tokens = Object.fromEntries(
  [...css.matchAll(/--color-([a-z]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map(([, nome, valor]) => [nome, valor.toUpperCase()]),
);

// Luminância relativa e razão de contraste da WCAG 2.1.
function luminancia(cor) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const canal = parseInt(cor.slice(i, i + 2), 16) / 255;
    return canal <= 0.03928 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contraste(corA, corB) {
  const [clara, escura] = [luminancia(corA), luminancia(corB)].sort((a, b) => b - a);
  return (clara + 0.05) / (escura + 0.05);
}

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
