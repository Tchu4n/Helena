import { test, expect, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";
import { skipCookieBanner } from "./consent";
import { FAKE_API, fillCard, startPayment } from "./order-helpers";

test.beforeEach(async ({ context, request }) => {
  await skipCookieBanner(context);
  await request.post(`${FAKE_API}/__reset`);
});

// Pays the jacket by card (1x) and waits for the confirmation; answers the order number.
async function payByCard(context: BrowserContext, page: Page, request: APIRequestContext): Promise<string> {
  const number = await startPayment(context, page, request);
  await fillCard(page, "4111 1111 1111 0000");
  await page.getByRole("button", { name: "Pagar R$ 219,00" }).click();
  await expect(page).toHaveURL(new RegExp(`/pedido/${number}\\?confirmado=1$`));
  await expect(page.getByRole("heading", { level: 1, name: "Pedido confirmado" })).toBeVisible();
  return number;
}

test("PED-01 the confirmation shows the check, the order and the two ways on", async ({ context, page, request }) => {
  const number = await payByCard(context, page, request);
  const main = page.getByRole("main");
  const check = main.locator("svg.text-success").first();
  await expect(check).toBeVisible();
  await expect(check).toHaveAttribute("aria-hidden", "true");
  await expect(main.getByText(`Pedido ${number}`, { exact: true })).toBeVisible();
  await expect(main.getByText("Enviamos os detalhes para m***a@exemplo.com")).toBeVisible();
  await expect(main.getByText("Forma de pagamento")).toBeVisible();
  await expect(main.getByText("Cartão de crédito · 1x")).toBeVisible();
  await expect(main.getByText("Jaqueta sarja")).toBeVisible();
  await expect(main.getByText("Frete (PAC)")).toBeVisible();
  await expect(main.getByText("Chega em até 5 dias úteis")).toBeVisible();
  await expect(main.getByRole("link", { name: "Acompanhar pedido" })).toHaveAttribute("href", `/pedido/${number}`);
  await expect(main.getByRole("link", { name: "Continuar comprando" })).toHaveAttribute("href", "/");
});

test("PED-01 with no interaction, the confirmation goes to the home page by itself", async ({ context, page, request }) => {
  await payByCard(context, page, request);
  await expect(page).toHaveURL(/\/$/, { timeout: 10_000 });
  await expect(page.getByRole("heading", { name: "Em destaque" })).toBeVisible();
  await expect(page.getByText("Pagamento concluído com sucesso")).toHaveCount(0);
});

test("PED-01 a key press cancels the return to the home page", async ({ context, page, request }) => {
  const number = await payByCard(context, page, request);
  await page.keyboard.press("Tab");
  await page.waitForTimeout(9000);
  await expect(page).toHaveURL(new RegExp(`/pedido/${number}\\?confirmado=1$`));
});

test("PED-01 a tap cancels the return to the home page", async ({ context, page, request }) => {
  const number = await payByCard(context, page, request);
  const box = await page.getByRole("heading", { level: 1, name: "Pedido confirmado" }).boundingBox();
  await page.mouse.click(box!.x + 2, box!.y + 2);
  await page.waitForTimeout(9000);
  await expect(page).toHaveURL(new RegExp(`/pedido/${number}\\?confirmado=1$`));
});

test("PED-02 after the confirmation the bag is empty, with no timer and no saved details", async ({ context, page, request }) => {
  await payByCard(context, page, request);
  await page.keyboard.press("Tab"); // stay on the confirmation
  await expect(page.getByRole("link", { name: /^Sacola, \d/ })).toHaveCount(0);
  expect(await page.evaluate(() => sessionStorage.getItem("helena_checkout"))).toBeNull();
  await page.goto("/sacola");
  await expect(page.getByRole("heading", { name: "Sua sacola está vazia" })).toBeVisible();
  await expect(page.getByRole("timer")).toHaveCount(0);
  await page.goto("/checkout/pagamento");
  await expect(page).toHaveURL(/\/sacola$/);
});

test("Review focus 1: a made-up or someone else's order shows no order data", async ({ browser, context, page, request }) => {
  const number = await payByCard(context, page, request);
  const stranger = await browser.newContext();
  await skipCookieBanner(stranger);
  const other = await stranger.newPage();
  for (const url of [`/pedido/${number}?confirmado=1`, `/pedido/${number}`, "/pedido/HL-100000?confirmado=1"]) {
    await other.goto(url);
    await expect(other.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(other.getByText("Pedido confirmado")).toHaveCount(0);
    await expect(other.getByText(/Enviamos/)).toHaveCount(0);
    await expect(other.getByText("Jaqueta sarja")).toHaveCount(0);
  }
  await stranger.close();
});

test("Review focus 3: reloading the confirmation still shows the order", async ({ context, page, request }) => {
  const number = await payByCard(context, page, request);
  await page.keyboard.press("Tab");
  await page.reload();
  await expect(page.getByRole("main").getByText(`Pedido ${number}`, { exact: true })).toBeVisible();
});
