import { test, expect } from "@playwright/test";

test("GER-01 tabs on mobile", async ({ page }) => {
  await page.goto("/");
  const tabs = page.getByRole("navigation", { name: "Abas" });
  await expect(tabs).toBeVisible();
  await expect(tabs.getByRole("link")).toHaveText(["Início", "Buscar", "Sacola", "Conta"]);
  await expect(tabs.getByRole("link", { name: "Buscar" })).toHaveAttribute("href", "/buscar");
});

test("GER-07 touch targets", async ({ page }) => {
  await page.goto("/");
  const targets = page.locator(
    'header a, header button, nav[aria-label="Abas"] a, footer a, footer button',
  );
  const count = await targets.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const box = await targets.nth(i).boundingBox();
    const name = await targets.nth(i).innerText();
    expect(box?.width, name).toBeGreaterThanOrEqual(48);
    expect(box?.height, name).toBeGreaterThanOrEqual(48);
  }
});

test("GER-07 focus not hidden by the tab bar", async ({ page }) => {
  await page.goto("/");
  const { padding, barHeight } = await page.evaluate(() => ({
    padding: parseFloat(getComputedStyle(document.documentElement).scrollPaddingBottom),
    barHeight: document.querySelector('nav[aria-label="Abas"]')!.getBoundingClientRect().height,
  }));
  expect(padding).toBeGreaterThanOrEqual(barHeight);
});

test("GER-07 focus visible", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle);
  expect(outline).not.toBe("none");
});
