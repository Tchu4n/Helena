import { test, expect, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";
import { skipCookieBanner } from "./consent";
import { FAKE_API, fillCard, startPayment } from "./order-helpers";

test.beforeEach(async ({ context, request }) => {
  await skipCookieBanner(context);
  await request.post(`${FAKE_API}/__reset`);
});

// Pays the jacket by card (1x) and waits for the confirmation; answers the order number.
async function payByCard(context: BrowserContext, page: Page, request: APIRequestContext, delivery?: RegExp): Promise<string> {
  const number = await startPayment(context, page, request, { delivery });
  await fillCard(page, "4111 1111 1111 0000");
  await page.getByRole("button", { name: /^Pagar R\$/ }).click();
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

// Tracking (PED-03, PED-04, PED-07, PED-08): a paid order, opened without ?confirmado.
const advance = (request: APIRequestContext, number: string, to: string, code = "") =>
  request.post(`${FAKE_API}/__advance?number=${number}&to=${to}&code=${code}`);

async function openTracking(page: Page, number: string) {
  await page.goto(`/pedido/${number}`);
  await expect(page.getByRole("heading", { level: 1, name: "Acompanhar pedido" })).toBeVisible();
}

const today = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date());

test("PED-03 the four steps in order, the current one in text, dates on the done ones", async ({ context, page, request }) => {
  const number = await payByCard(context, page, request);
  await advance(request, number, "preparing");
  await openTracking(page, number);
  const main = page.getByRole("main");
  await expect(main.getByText(`Pedido ${number}`, { exact: true })).toBeVisible();
  await expect(main.getByText("Etapa atual: Em separação")).toBeVisible();
  const steps = main.getByRole("list", { name: "Etapas do pedido" }).getByRole("listitem");
  await expect(steps).toHaveCount(4);
  await expect(steps.nth(0)).toContainText("Pagamento confirmado");
  await expect(steps.nth(1)).toContainText("Em separação");
  await expect(steps.nth(2)).toContainText("Enviado");
  await expect(steps.nth(3)).toContainText("Entregue");
  for (const i of [0, 1]) {
    await expect(steps.nth(i)).toContainText(today);
    await expect(steps.nth(i)).toContainText("concluída"); // text, not color alone
    await expect(steps.nth(i).locator("svg")).toBeVisible();
  }
  for (const i of [2, 3]) {
    await expect(steps.nth(i)).not.toContainText(today);
    await expect(steps.nth(i)).not.toContainText("concluída");
  }
});

test("PED-03 right after paying, the current step is Pagamento confirmado", async ({ context, page, request }) => {
  const number = await payByCard(context, page, request);
  await openTracking(page, number);
  await expect(page.getByRole("main").getByText("Etapa atual: Pagamento confirmado")).toBeVisible();
});

test("PED-04 PAC shipped: the tracking code, copy and the tracking link", async ({ context, page, request }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const number = await payByCard(context, page, request);
  await advance(request, number, "shipped", "AA123456789BR");
  await openTracking(page, number);
  const main = page.getByRole("main");
  await expect(main.getByText("Código de rastreio")).toBeVisible();
  await expect(main.getByText("AA123456789BR", { exact: true })).toBeVisible();
  await main.getByRole("button", { name: "Copiar código" }).click();
  await expect(main.getByText("Código copiado")).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("AA123456789BR");
  await expect(main.getByRole("link", { name: "Rastrear entrega" })).toHaveAttribute("href", "https://rastreio.exemplo/AA123456789BR");
});

test("PED-04 courier shipped: delivery that day, no Correios code", async ({ context, page, request }) => {
  const number = await payByCard(context, page, request, /Entrega Helena/);
  await advance(request, number, "shipped");
  await openTracking(page, number);
  const main = page.getByRole("main");
  await expect(main.getByText("Etapa atual: Enviado")).toBeVisible();
  await expect(main.getByText("Chega hoje").first()).toBeVisible();
  await expect(main.getByText("Código de rastreio")).toHaveCount(0);
});

test("PED-05 tracking shows city/state and the items, never CPF, phone or street", async ({ context, page, request }) => {
  const number = await payByCard(context, page, request);
  await openTracking(page, number);
  const main = page.getByRole("main");
  await expect(main.getByText("Entrega em São Paulo/SP")).toBeVisible();
  await expect(main.getByText("Chega em até 5 dias úteis").first()).toBeVisible();
  await expect(main.getByText("Jaqueta sarja")).toBeVisible();
  const text = await page.locator("body").innerText();
  for (const secret of ["529.982.247-25", "52998224725", "98765-4321", "Avenida Paulista", "Bela Vista"]) expect(text).not.toContain(secret);
});

test("PED-07 a return requested shows Suporte em andamento", async ({ context, page, request }) => {
  const number = await payByCard(context, page, request);
  await advance(request, number, "support_in_progress");
  await openTracking(page, number);
  await expect(page.getByRole("main").getByText("Suporte em andamento")).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "Solicitar devolução" })).toHaveCount(0);
});

test("PED-08 delivered offers Solicitar devolução; before delivery it doesn't", async ({ context, page, request }) => {
  const number = await payByCard(context, page, request);
  await openTracking(page, number);
  await expect(page.getByRole("main").getByRole("link", { name: "Solicitar devolução" })).toHaveCount(0);
  await advance(request, number, "delivered");
  await page.reload();
  await expect(page.getByRole("main").getByText("Etapa atual: Entregue")).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "Solicitar devolução" })).toHaveAttribute("href", "/devolucao");
});
