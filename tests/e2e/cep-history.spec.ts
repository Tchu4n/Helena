import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { FAKE_API, JACKET_M } from "./order-helpers";

// PRO-15, SAC-18: the CEP history, only with the "Funcionais" cookies, only on the device.
const JACKET = "/produto/jaqueta-sarja-verde";
const OTHER = "/produto/bone-de-algodao-cru";

async function consent(context: BrowserContext, choice: object) {
  await context.addCookies([{ name: "helena_consent", value: encodeURIComponent(JSON.stringify(choice)), url: "http://localhost:3100" }]);
}
const withFunctional = (context: BrowserContext) => consent(context, { v: 1, analytics: false, marketing: false, functional: true });

test.beforeEach(async ({ request }) => {
  await request.post(`${FAKE_API}/__reset`);
});

const shipping = (page: Page) => page.getByRole("form", { name: "Frete e prazo" });
const cepField = (page: Page) => shipping(page).getByLabel("CEP", { exact: true });
const suggestions = (page: Page) => page.getByRole("group", { name: "Pesquisados recentemente" });
const stored = (page: Page) => page.evaluate(() => localStorage.getItem("helena_ceps"));

async function quote(page: Page, cep: string) {
  await cepField(page).fill(cep);
  await shipping(page).getByRole("button", { name: "Calcular" }).click();
  await expect(shipping(page).getByRole("list", { name: "Modalidades de entrega" })).toBeVisible();
}

// The field holds the bag's CEP after a calculation; emptying it is what shows the list.
async function openSuggestions(page: Page) {
  await cepField(page).fill("");
  await cepField(page).focus();
}

test("PRO-15 without Funcionais: nothing kept, nothing shown", async ({ context, page }) => {
  await consent(context, { v: 1, analytics: true, marketing: true, functional: false });
  await page.goto(JACKET);
  await quote(page, "01310-100");
  await page.reload();
  await openSuggestions(page);
  await expect(suggestions(page)).toHaveCount(0);
  expect(await stored(page)).toBeNull();
});

test("PRO-15 with Funcionais: newest first with city/UF; a tap calculates right away", async ({ context, page }) => {
  await withFunctional(context);
  await page.goto(JACKET);
  await quote(page, "01310-100");
  await quote(page, "69900-000");
  await page.goto(OTHER);
  await openSuggestions(page);
  const buttons = suggestions(page).getByRole("button");
  await expect(buttons.nth(0)).toHaveAccessibleName("69900-000 · Rio Branco/AC");
  await expect(buttons.nth(1)).toHaveAccessibleName("01310-100 · São Paulo/SP");
  await buttons.nth(1).click();
  await expect(cepField(page)).toHaveValue(/01310-?100/);
  await expect(shipping(page)).toContainText("Entrega para São Paulo/SP");
  await expect(suggestions(page)).toHaveCount(0);
});

test("PRO-15 at most five; a CEP calculated again moves to the top", async ({ context, page }) => {
  await withFunctional(context);
  await page.goto(JACKET);
  for (const cep of ["11111111", "22222222", "33333333", "44444444", "55555555", "66666666"]) await quote(page, cep);
  await openSuggestions(page);
  await expect(suggestions(page).getByRole("button", { name: /^\d{5}-\d{3}/ })).toHaveCount(5);
  await expect(suggestions(page).getByRole("button", { name: /^11111-111/ })).toHaveCount(0);
  await quote(page, "33333333");
  await openSuggestions(page);
  await expect(suggestions(page).getByRole("button").first()).toHaveAccessibleName(/^33333-333/);
  await expect(suggestions(page).getByRole("button", { name: /^\d{5}-\d{3}/ })).toHaveCount(5);
});

test("PRO-15 a failed calculation is not kept", async ({ context, page, request }) => {
  await withFunctional(context);
  await page.goto(JACKET);
  await quote(page, "01310-100");
  await request.post(`${FAKE_API}/__fail?path=/v1/shipping/quotes`);
  await cepField(page).fill("69900-000");
  await shipping(page).getByRole("button", { name: "Calcular" }).click();
  await expect(shipping(page).getByRole("alert")).toBeVisible();
  await openSuggestions(page);
  await expect(suggestions(page).getByRole("button", { name: /^69900-000/ })).toHaveCount(0);
  await expect(suggestions(page).getByRole("button", { name: /^01310-100/ })).toBeVisible();
});

test("SAC-18 the bag's CEP field shares the history both ways", async ({ context, page }) => {
  await withFunctional(context);
  const { id } = await (await context.request.post(`${FAKE_API}/__carts`, { data: { lines: [{ productSizeId: JACKET_M }] } })).json();
  await context.addCookies([{ name: "helena_cart", value: id, url: "http://localhost:3100" }]);
  await page.goto(JACKET);
  await quote(page, "01310-100");
  await page.goto("/sacola");
  const bagCep = page.getByRole("region", { name: "Frete e prazo" }).getByLabel("CEP", { exact: true });
  await bagCep.fill("");
  await bagCep.focus();
  await expect(suggestions(page).getByRole("button", { name: "01310-100 · São Paulo/SP" })).toBeVisible();
  await bagCep.fill("88010-000");
  await page.getByRole("region", { name: "Frete e prazo" }).getByRole("button", { name: /Calcular|Alterar/ }).click();
  await expect(page.getByRole("region", { name: "Frete e prazo" }).getByRole("radio", { name: /PAC/ })).toBeVisible();
  await page.goto(JACKET);
  await openSuggestions(page);
  await expect(suggestions(page).getByRole("button").first()).toHaveAccessibleName(/^88010-000/);
});

test("PRO-15 Limpar histórico deletes it", async ({ context, page }) => {
  await withFunctional(context);
  await page.goto(JACKET);
  await quote(page, "01310-100");
  await openSuggestions(page);
  await suggestions(page).getByRole("button", { name: "Limpar histórico" }).click();
  await expect(suggestions(page)).toHaveCount(0);
  expect(await stored(page)).toBeNull();
});

test("PRO-15 review focus 4: withdrawing Funcionais deletes the history at once", async ({ context, page }) => {
  await withFunctional(context);
  await page.goto(JACKET);
  await quote(page, "01310-100");
  expect(await stored(page)).not.toBeNull();
  await page.goto("/cookies");
  await page.getByRole("checkbox", { name: /^Funcionais/ }).uncheck();
  await page.getByRole("button", { name: "Salvar preferências" }).click();
  await expect(page.getByText("Preferências salvas.")).toBeVisible();
  expect(await stored(page)).toBeNull();
});

test("PRO-15 review focus 4: a choice from before Funcionais shows nothing", async ({ context, page }) => {
  await withFunctional(context);
  await page.goto(JACKET);
  await quote(page, "01310-100");
  await consent(context, { v: 1, analytics: true, marketing: true });
  await page.goto(OTHER);
  await openSuggestions(page);
  await expect(suggestions(page)).toHaveCount(0);
  expect(await stored(page)).toBeNull();
});

test("PRO-15 review focus 5: Tab reaches a 48px suggestion; Escape hides the list", async ({ context, page }) => {
  await withFunctional(context);
  await page.goto(JACKET);
  await quote(page, "01310-100");
  await openSuggestions(page);
  await page.keyboard.press("Tab");
  const first = suggestions(page).getByRole("button", { name: /01310-100/ });
  await expect(first).toBeFocused();
  expect((await first.boundingBox())!.height).toBeGreaterThanOrEqual(48);
  await cepField(page).focus();
  await expect(suggestions(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(suggestions(page)).toHaveCount(0);
});
