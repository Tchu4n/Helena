import { test, expect, type Page } from "@playwright/test";
import { skipCookieBanner } from "./consent";

const FAKE_API = "http://localhost:4011";

test.beforeEach(async ({ context, request }) => {
  await skipCookieBanner(context);
  await request.post(`${FAKE_API}/__reset`);
});

const grid = (page: Page) => page.getByRole("region", { name: "Produtos" });
const sizePicker = (page: Page) => page.getByRole("dialog", { name: "Escolha o tamanho" });

test("CAT-08 quick buy", async ({ page }) => {
  await page.goto("/catalogo");
  await grid(page).getByRole("button", { name: "Adicionar Jaqueta jeans à sacola" }).click();
  await expect(sizePicker(page)).toBeVisible();
  await expect(sizePicker(page).getByRole("radio")).toHaveCount(3);
  const soldOut = sizePicker(page).getByRole("radio", { name: "G, esgotado" });
  await expect(soldOut).toBeDisabled();
  await expect(sizePicker(page).getByText("G", { exact: true })).toHaveCSS("text-decoration-line", "line-through");

  await sizePicker(page).getByText("M", { exact: true }).click();
  await sizePicker(page).getByRole("button", { name: "Adicionar à sacola" }).click();
  await expect(page.getByRole("dialog", { name: "Peça adicionada à sacola" })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Peça adicionada à sacola" })).toContainText("Jaqueta jeans");
  await expect(sizePicker(page)).toHaveCount(0);
  await expect(page.getByRole("banner").getByRole("link", { name: /^Sacola/ })).toHaveAccessibleName("Sacola, 1 peça");
});

test("CAT-08 sold-out product has no quick buy", async ({ page }) => {
  await page.goto("/catalogo");
  const name = "Calça wide de alfaiataria em linho lavado cor areia";
  await expect(grid(page).getByRole("link", { name: new RegExp(name) })).toBeVisible();
  await expect(grid(page).getByRole("button", { name: `Adicionar ${name} à sacola` })).toHaveCount(0);
});

test("CAT-08 card link still works", async ({ page }) => {
  await page.goto("/catalogo");
  await grid(page).getByRole("link", { name: /Jaqueta jeans/ }).click();
  await expect(page).toHaveURL(/\/produto\/jaqueta-jeans-azul$/);
});

test("CAT-08 quick buy on the home page", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Adicionar Jaqueta jeans à sacola" })).toBeVisible();
});

// Final review fixes (2026-11-19). "Jaqueta jeans" sizes in the fake catalog: P ...100, M ...101 (low stock), G ...102 (sold out).
const JEANS_M = "5a1e0000-0000-4000-8000-000000000101";
const quickBuy = (page: Page) => grid(page).getByRole("button", { name: "Adicionar Jaqueta jeans à sacola" });
const bagPanel = (page: Page) => page.getByRole("dialog", { name: "Peça adicionada à sacola" });

test("CAT-08 no size: the error shows and focus goes to the sizes", async ({ page }) => {
  await page.goto("/catalogo");
  await quickBuy(page).click();
  await sizePicker(page).getByRole("button", { name: "Adicionar à sacola" }).click();
  await expect(sizePicker(page)).toContainText("Escolha um tamanho");
  await expect(sizePicker(page).getByRole("radio", { name: "P" })).toBeFocused();
});

test("CAT-08 an error after a first add stays in the picker", async ({ page, request }) => {
  await page.goto("/catalogo");
  await quickBuy(page).click();
  await sizePicker(page).getByText("M", { exact: true }).click();
  await sizePicker(page).getByRole("button", { name: "Adicionar à sacola" }).click();
  await bagPanel(page).getByRole("button", { name: "Fechar" }).click();
  await expect(quickBuy(page)).toBeFocused();

  await request.post(`${FAKE_API}/__sold-out?productSizeId=${JEANS_M}`);
  await quickBuy(page).click();
  await sizePicker(page).getByText("M", { exact: true }).click();
  await sizePicker(page).getByRole("button", { name: "Adicionar à sacola" }).click();
  await expect(sizePicker(page).getByRole("alert")).toBeVisible();
  await expect(sizePicker(page).getByRole("radio", { name: "M" })).toBeChecked();
  await expect(bagPanel(page)).toHaveCount(0);
});

test("CAT-08 double tap adds one piece", async ({ page }) => {
  await page.goto("/catalogo");
  await quickBuy(page).click();
  await sizePicker(page).getByText("M", { exact: true }).click();
  await sizePicker(page).getByRole("button", { name: "Adicionar à sacola" }).dblclick();
  await expect(bagPanel(page)).toContainText("Subtotal (1 peça)");
  await page.reload();
  await expect(page.getByRole("banner").getByRole("link", { name: /^Sacola/ })).toHaveAccessibleName("Sacola, 1 peça");
});

test("CAT-08 low stock shows for the chosen size", async ({ page }) => {
  await page.goto("/catalogo");
  await quickBuy(page).click();
  await sizePicker(page).getByText("M", { exact: true }).click();
  await expect(sizePicker(page)).toContainText("Últimas peças");
  await sizePicker(page).getByText("P", { exact: true }).click();
  await expect(sizePicker(page)).not.toContainText("Últimas peças");
});

test("CAT-08 closing the picker during the add: no panel later, not even on the next open", async ({ page, request }) => {
  await request.post(`${FAKE_API}/__slow?suffix=/items`);
  await page.goto("/catalogo");
  await quickBuy(page).click();
  await sizePicker(page).getByText("M", { exact: true }).click();
  await sizePicker(page).getByRole("button", { name: "Adicionar à sacola" }).click();
  await page.keyboard.press("Escape");
  await expect(sizePicker(page)).toHaveCount(0);
  // The add lands while the picker is closed.
  await expect(page.getByRole("banner").getByRole("link", { name: /^Sacola/ })).toHaveAccessibleName("Sacola, 1 peça");
  await expect(bagPanel(page)).toHaveCount(0);

  await quickBuy(page).click();
  await expect(sizePicker(page)).toBeVisible();
  await expect(bagPanel(page)).toHaveCount(0);
});

test("CAT-08 reopening the picker before the closed add lands: still no panel", async ({ page, request }) => {
  await request.post(`${FAKE_API}/__slow?suffix=/items`);
  await page.goto("/catalogo");
  await quickBuy(page).click();
  await sizePicker(page).getByText("M", { exact: true }).click();
  await sizePicker(page).getByRole("button", { name: "Adicionar à sacola" }).click();
  await page.keyboard.press("Escape");
  await quickBuy(page).click();
  await expect(sizePicker(page)).toBeVisible();
  // The closed add lands now, with the new picker open.
  await expect(page.getByRole("banner").getByRole("link", { name: /^Sacola/ })).toHaveAccessibleName("Sacola, 1 peça");
  await expect(bagPanel(page)).toHaveCount(0);
  await expect(sizePicker(page)).toBeVisible();
});
