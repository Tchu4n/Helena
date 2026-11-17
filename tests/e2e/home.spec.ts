import { test, expect } from "@playwright/test";
import { skipCookieBanner } from "./consent";

const FAKE_API = "http://localhost:4011";

test.describe.configure({ mode: "serial" }); // /__fail affects the whole fake API
test.beforeEach(async ({ context }) => skipCookieBanner(context));
test.afterEach(async ({ request }) => {
  await request.post(`${FAKE_API}/__reset`);
});

test("VIT-01 home order", async ({ page }) => {
  await page.goto("/");
  const blocks = [
    page.getByRole("complementary", { name: "Anúncio" }),
    page.locator("header"),
    page.getByRole("heading", { name: "Coleção Verão 2027" }),
    page.getByRole("list", { name: "Benefícios" }),
    page.getByRole("navigation", { name: "Categorias" }),
    page.getByRole("heading", { name: "Em destaque" }),
  ];
  for (const block of blocks) await expect(block).toBeVisible();
  await expect(blocks[0]).toHaveText("Frete grátis a partir de R$ 300");
  await expect(page.getByRole("navigation", { name: "Categorias" }).getByRole("link")).toHaveText([
    "Camisetas",
    "Calças",
    "Jaquetas",
    "Acessórios",
  ]);

  const tops = [];
  for (const block of blocks) tops.push((await block.boundingBox())!.y);
  expect(tops).toEqual([...tops].sort((a, b) => a - b));
});

test("VIT-02 category tile", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Categorias" }).getByRole("link", { name: "Calças" }).click();
  await expect(page).toHaveURL("/catalogo?categoria=calcas");
});

test("GER-06 home with API down", async ({ page, request }) => {
  await request.post(`${FAKE_API}/__fail?path=/v1/home`);
  await page.goto("/");
  const alert = page.getByRole("alert").filter({ hasText: "Tentar de novo" }); // Next also renders a route announcer with role=alert
  await expect(alert).toContainText("Não foi possível concluir. Tente de novo");
  await expect(alert.getByRole("link", { name: "Tentar de novo" })).toHaveAttribute("href", "/");
  await expect(page.getByRole("complementary", { name: "Anúncio" })).toHaveCount(0);
});
