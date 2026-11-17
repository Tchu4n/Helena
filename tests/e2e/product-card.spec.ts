import { test, expect } from "@playwright/test";

const featured = (page: import("@playwright/test").Page) =>
  page.getByRole("region", { name: "Em destaque" }).getByRole("listitem");

test("VIT-04 sale card", async ({ page }) => {
  await page.goto("/");
  const card = featured(page).filter({ hasText: "Jaqueta jeans" });
  await expect(card.locator("s")).toHaveText("R$ 199,00");
  await expect(card).toContainText("R$ 159,00");
  await expect(card).toContainText("-20%");
});

test("VIT-05 sold out last", async ({ page }) => {
  await page.goto("/");
  const last = featured(page).last();
  await expect(last).toContainText("Calça wide");
  await expect(last).toContainText("Esgotado");
});

test("VIT-03 card opens product", async ({ page }) => {
  await page.goto("/");
  const card = featured(page).filter({ hasText: "Camiseta básica" });
  await expect(card.getByRole("link")).toHaveAttribute("href", "/produto/camiseta-basica-branca");
});

test("long product names wrap instead of being cut", async ({ page }) => {
  await page.goto("/");
  const card = featured(page).filter({ hasText: "Calça wide" });
  await expect(card).toContainText("Calça wide de alfaiataria em linho lavado cor areia");
  const name = card.getByText("Calça wide de alfaiataria em linho lavado cor areia");
  const clipped = await name.evaluate((el) => el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth);
  expect(clipped).toBe(false);
});
