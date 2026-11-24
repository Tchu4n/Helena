import { test, expect, type Page } from "@playwright/test";

const consentCookie = async (page: Page) =>
  (await page.context().cookies()).find((c) => c.name === "helena_consent");

test("GER-03 banner on first visit", async ({ page }) => {
  await page.goto("/");
  const banner = page.getByRole("region", { name: "Aviso de cookies" });
  await expect(banner).toBeVisible();

  const reject = banner.getByRole("button", { name: "Rejeitar" });
  const accept = banner.getByRole("button", { name: "Aceitar" });
  const [r, a] = [await reject.boundingBox(), await accept.boundingBox()];
  expect(r?.width).toBe(a?.width);
  expect(r?.height).toBe(a?.height);
  const background = (l: typeof reject) => l.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(await background(reject)).toBe(await background(accept));
  await expect(banner.getByRole("link", { name: "Gerenciar preferências" })).toHaveAttribute("href", "/cookies");

  expect(await consentCookie(page)).toBeUndefined();
});

test("GER-04 reject keeps the store working", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Rejeitar" }).click();
  await expect(page.getByRole("region", { name: "Aviso de cookies" })).toHaveCount(0);

  const cookie = await consentCookie(page);
  expect(JSON.parse(decodeURIComponent(cookie!.value))).toEqual({ v: 1, analytics: false, marketing: false, functional: false });

  await page.goto("/catalogo");
  await expect(page.getByRole("region", { name: "Aviso de cookies" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Abas" })).toBeVisible();
});

test("GER-05 manage preferences", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Gerenciar preferências" }).click();
  await expect(page).toHaveURL("/cookies");

  await expect(page.getByRole("checkbox", { name: "Necessários" })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Necessários" })).toBeDisabled();
  await expect(page.getByRole("checkbox", { name: "Análise" })).not.toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Marketing" })).not.toBeChecked();
  // Added on 2026-11-23 (PRO-15): "Funcionais", described and unchecked like the other optional ones.
  await expect(page.getByRole("checkbox", { name: /^Funcionais/ })).not.toBeChecked();
  await expect(page.getByText("Lembram os CEPs que você pesquisou para calcular o frete, só neste aparelho.")).toBeVisible();

  await page.getByRole("checkbox", { name: "Análise" }).check();
  await page.getByRole("button", { name: "Salvar preferências" }).click();
  await expect(page.getByText("Preferências salvas.")).toBeVisible();
  const cookie = await consentCookie(page);
  expect(JSON.parse(decodeURIComponent(cookie!.value))).toEqual({ v: 1, analytics: true, marketing: false, functional: false });

  await expect(page.getByRole("contentinfo").getByRole("link", { name: "Preferências de cookies" })).toHaveAttribute(
    "href",
    "/cookies",
  );
});
