// CAT-02, CAT-03, CAT-04, CAT-09: catalog filters live in the page address, in Portuguese.
import { test } from "node:test";
import assert from "node:assert/strict";
import { activeChips, canonicalRedirect, parseFilters, toApiQuery, toSearchParams } from "../src/features/catalog/filters.ts";

test("CAT-03 category and size are read from the address and written back", () => {
  const { filters } = parseFilters({ categoria: "jaquetas", tamanho: "M" });
  assert.equal(filters.category, "jackets");
  assert.equal(filters.size, "M");
  assert.equal(filters.sort, "newest");
  assert.equal(filters.page, 1);
  assert.equal(toSearchParams(filters), "categoria=jaquetas&tamanho=M");
});

test("CAT-04 minimum above maximum is an error and drops the price filter", () => {
  const { filters, priceError } = parseFilters({ precoMin: "200", precoMax: "100" });
  assert.equal(priceError, "O preço mínimo não pode ser maior que o máximo");
  assert.equal(filters.minPrice, undefined);
  assert.equal(filters.maxPrice, undefined);
});

test("CAT-09 sort maps between the address and the API", () => {
  const { filters } = parseFilters({ ordem: "menor-preco" });
  assert.equal(filters.sort, "lowest_price");
  assert.equal(toApiQuery(filters).sort, "lowest_price");
  assert.equal(toSearchParams(filters), "ordem=menor-preco");
});

test("prices in the address are reais; the API gets cents", () => {
  const { filters } = parseFilters({ precoMin: "200", precoMax: "300" });
  assert.equal(toApiQuery(filters).minPrice, 20000);
  assert.equal(toApiQuery(filters).maxPrice, 30000);
  assert.equal(toApiQuery(filters).category, undefined);
});

test("invalid values typed in the address are ignored", () => {
  const { filters, priceError } = parseFilters({ ordem: "xyz", precoMin: "abc", categoria: "sapatos", pagina: "-1" });
  assert.equal(filters.sort, "newest");
  assert.equal(filters.minPrice, undefined);
  assert.equal(filters.category, undefined);
  assert.equal(filters.page, 1);
  assert.equal(priceError, null);
});

test("a repeated parameter keeps the first value", () => {
  assert.equal(parseFilters({ tamanho: ["M", "G"] }).filters.size, "M");
});

test("search is trimmed, empty means none, and it is capped at 80 characters", () => {
  assert.equal(parseFilters({ busca: "  jaqueta jeans  " }).filters.search, "jaqueta jeans");
  assert.equal(parseFilters({ busca: "   " }).filters.search, undefined);
  assert.equal(parseFilters({ busca: "a".repeat(100) }).filters.search?.length, 80);
});

test("page 2 stays in the address and in the API query", () => {
  const { filters } = parseFilters({ pagina: "2" });
  assert.equal(filters.page, 2);
  assert.equal(toSearchParams(filters), "pagina=2");
  assert.equal(toApiQuery(filters).page, 2);
});

test("CAT-02 each active filter is a removable chip", () => {
  const { filters } = parseFilters({ categoria: "jaquetas", tamanho: "M", pagina: "3" });
  assert.deepEqual(activeChips(filters), [
    { label: "Jaquetas", href: "/catalogo?tamanho=M" },
    { label: "Tamanho M", href: "/catalogo?categoria=jaquetas" },
  ]);
});

test("price and search chips read naturally", () => {
  const { filters } = parseFilters({ precoMin: "50", precoMax: "200", busca: "linho", cor: "azul" });
  assert.deepEqual(
    activeChips(filters).map((c) => c.label),
    ["Cor azul", "A partir de R$ 50", "Até R$ 200", "Busca: linho"],
  );
});

test("empty form fields are cleaned from the address", () => {
  assert.equal(
    canonicalRedirect({ categoria: "jaquetas", tamanho: "", cor: "", precoMin: "", precoMax: "" }),
    "/catalogo?categoria=jaquetas",
  );
  assert.equal(canonicalRedirect({ ordem: "novidades", busca: "" }), "/catalogo");
});

test("an address that is already clean is not redirected", () => {
  assert.equal(canonicalRedirect({ categoria: "jaquetas", busca: "erro" }), null);
  assert.equal(canonicalRedirect({}), null);
});

test("CAT-04 keeps the typed prices in the address so the error can be shown", () => {
  assert.equal(canonicalRedirect({ precoMin: "200", precoMax: "100", cor: "" }), null);
});
