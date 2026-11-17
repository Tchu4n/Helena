import { test, expect, type Page } from "@playwright/test";
import { skipCookieBanner } from "./consent";

test.beforeEach(async ({ context }) => skipCookieBanner(context));

const chips = (page: Page) => page.getByRole("list", { name: "Filtros ativos" }).getByRole("link");
const grid = (page: Page) => page.getByRole("region", { name: "Produtos" }).getByRole("listitem");

async function openFilters(page: Page) {
  await page.getByText("Filtrar", { exact: true }).click();
  return page.getByRole("form", { name: "Filtros" });
}

test("CAT-01 filters", async ({ page }) => {
  await page.goto("/catalogo");
  const form = await openFilters(page);
  await expect(form.getByRole("group", { name: "Categoria" })).toBeVisible();
  await expect(form.getByRole("group", { name: "Tamanho" })).toBeVisible();
  await expect(form.getByLabel("Cor")).toBeVisible();
  await expect(form.getByLabel("Preço mínimo (R$)")).toBeVisible();
  await expect(form.getByLabel("Preço máximo (R$)")).toBeVisible();
});

test("CAT-02 apply filter without reloading the page", async ({ page }) => {
  await page.goto("/catalogo");
  await page.evaluate(() => ((window as unknown as { marker: number }).marker = 42));
  const form = await openFilters(page);
  await form.getByRole("radio", { name: "Jaquetas" }).check();
  await form.getByRole("button", { name: "Aplicar" }).click();

  await expect(page).toHaveURL("/catalogo?categoria=jaquetas");
  expect(await page.evaluate(() => (window as unknown as { marker?: number }).marker)).toBe(42);
  await expect(page.getByText("1 produto", { exact: true })).toBeVisible();
  await expect(chips(page)).toHaveText(["Jaquetas"]);

  await chips(page).first().click();
  await expect(page).toHaveURL("/catalogo");
  await expect(page.getByText("3 produtos", { exact: true })).toBeVisible();
});

test("CAT-03 filters stay in the address", async ({ page }) => {
  await page.goto("/catalogo?categoria=jaquetas&tamanho=M");
  await expect(chips(page)).toHaveText(["Jaquetas", "Tamanho M"]);
  await page.reload();
  await expect(chips(page)).toHaveText(["Jaquetas", "Tamanho M"]);
  await page.goto("/");
  await page.goBack();
  await expect(chips(page)).toHaveText(["Jaquetas", "Tamanho M"]);
});

test("CAT-04 invalid price range", async ({ page }) => {
  await page.goto("/catalogo");
  const form = await openFilters(page);
  await form.getByLabel("Preço mínimo (R$)").fill("200");
  await form.getByLabel("Preço máximo (R$)").fill("100");
  await form.getByRole("button", { name: "Aplicar" }).click();
  await expect(page.getByText("O preço mínimo não pode ser maior que o máximo")).toBeVisible();
  await expect(chips(page)).toHaveCount(0);
});

test("CAT-05 size filter puts products without the size last", async ({ page }) => {
  await page.goto("/catalogo?tamanho=M");
  // Only the jacket has M; the t-shirt lacks M and the pants are sold out, so both come after it.
  await expect(grid(page).first()).toContainText("Jaqueta jeans");
  await expect(grid(page).filter({ hasText: "Camiseta básica" })).toContainText("Esgotado no M");
  await expect(grid(page).first()).not.toContainText("Esgotado");
});

test("CAT-06 no results", async ({ page }) => {
  await page.goto("/catalogo?busca=nada");
  await expect(page.getByText("Nenhum produto encontrado")).toBeVisible();
  await expect(page.getByRole("link", { name: "Limpar filtros" })).toHaveAttribute("href", "/catalogo");
});

test("CAT-07 search from the Buscar tab", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Abas" }).getByRole("link", { name: "Buscar" }).click();
  await page.getByRole("searchbox", { name: "O que você procura?" }).fill("jaqueta jeans");
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page).toHaveURL("/catalogo?busca=jaqueta+jeans");
  await expect(page.getByText("Filtrar", { exact: true })).toBeVisible();
  await expect(chips(page)).toHaveText(["Busca: jaqueta jeans"]);
});

test("CAT-09 sort keeps the filters", async ({ page }) => {
  await page.goto("/catalogo?categoria=jaquetas");
  await page.getByText("Ordenar", { exact: true }).click();
  const form = page.getByRole("form", { name: "Ordem" });
  await expect(form.getByRole("radio")).toHaveCount(5);
  await expect(form.getByRole("radio", { name: "Novidades" })).toBeChecked();
  await form.getByRole("radio", { name: "Menor preço" }).check();
  await form.getByRole("button", { name: "Aplicar" }).click();
  await expect(page).toHaveURL("/catalogo?categoria=jaquetas&ordem=menor-preco");
  await expect(chips(page)).toHaveText(["Jaquetas"]);
});

test("GER-06 catalog with API down keeps the filters in the retry link", async ({ page }) => {
  await page.goto("/catalogo?categoria=jaquetas&busca=erro");
  const alert = page.getByRole("alert").filter({ hasText: "Tentar de novo" });
  await expect(alert).toContainText("Não foi possível concluir. Tente de novo");
  await expect(alert.getByRole("link", { name: "Tentar de novo" })).toHaveAttribute(
    "href",
    "/catalogo?categoria=jaquetas&busca=erro",
  );
});
