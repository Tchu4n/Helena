import { test, expect, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";
import { skipCookieBanner } from "./consent";

const FAKE_API = "http://localhost:4011";
// Jacket "Jaqueta sarja", Verde, size M, R$ 199,00; PAC R$ 20,00 for CEP 01310-100.
const JACKET_M = "5a1e0000-0000-4000-8000-000000000002";

const VALID: [string, string][] = [
  ["Nome completo", "Maria Souza"],
  ["CPF", "529.982.247-25"],
  ["E-mail", "maria@exemplo.com"],
  ["Celular", "(11) 98765-4321"],
  ["CEP", "01310-100"],
  ["Rua", "Avenida Paulista"],
  ["Número", "1000"],
  ["Bairro", "Bela Vista"],
  ["Cidade", "São Paulo"],
  ["UF", "SP"],
];

test.beforeEach(async ({ context, request }) => {
  await skipCookieBanner(context);
  await request.post(`${FAKE_API}/__reset`);
});

const paths = async (request: APIRequestContext) => (await (await request.get(`${FAKE_API}/__requests`)).json()) as string[];

// Builds a bag, fills /checkout, taps "Ir para pagamento" and answers the order number.
async function startPayment(
  context: BrowserContext,
  page: Page,
  request: APIRequestContext,
  { productSizeId = JACKET_M, cep = "01310-100" } = {},
): Promise<string> {
  const response = await context.request.post(`${FAKE_API}/__carts`, { data: { lines: [{ productSizeId }] } });
  const { id } = await response.json();
  await context.addCookies([{ name: "helena_cart", value: id, url: "http://localhost:3100" }]);
  await page.goto("/checkout");
  for (const [label, value] of VALID) await page.getByLabel(label, { exact: true }).fill(label === "CEP" ? cep : value);
  await expect(page.getByRole("radio", { name: /PAC/ })).toBeChecked();
  await page.getByRole("button", { name: "Ir para pagamento" }).click();
  await expect(page).toHaveURL(/\/checkout\/pagamento$/);
  const read = (await paths(request)).find((p) => /^\/v1\/orders\/HL-\d+$/.test(p));
  if (!read) throw new Error("the payment page did not read the order");
  return read.split("/").pop()!;
}

async function generatePix(page: Page) {
  await page.getByRole("radio", { name: "PIX" }).check();
  await page.getByRole("button", { name: "Gerar código PIX" }).click();
  await expect(page.getByText("Aguardando pagamento")).toBeVisible();
}

test("CHK-12 the countdown shows the reservation time, as text", async ({ context, page, request }) => {
  await startPayment(context, page, request);
  await expect(page.getByRole("timer")).toHaveText(/Sua reserva termina em 1[45]:\d\d/);
});

test("CHK-14 PIX and card, neither chosen, nothing filled in", async ({ context, page, request }) => {
  await startPayment(context, page, request);
  const methods = page.getByRole("group", { name: "Forma de pagamento" });
  await expect(methods.getByRole("radio", { name: "PIX" })).not.toBeChecked();
  await expect(methods.getByRole("radio", { name: "Cartão de crédito" })).not.toBeChecked();
  await expect(page.getByRole("main").getByRole("textbox")).toHaveCount(0);
});

test("CHK-15 PIX shows the QR code, the code, the amount and copy", async ({ context, page, request }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await startPayment(context, page, request);
  await generatePix(page);
  await expect(page.getByRole("img", { name: "QR code do PIX" })).toBeVisible();
  await expect(page.getByText(/^00020126/)).toBeVisible();
  await expect(page.getByText("PIX · R$ 219,00")).toBeVisible();
  await expect(page.getByRole("timer")).toBeVisible();
  await page.getByRole("button", { name: "Copiar código PIX" }).click();
  await expect(page.getByText("Código PIX copiado")).toBeVisible();
});

test("CHK-16 a confirmed PIX goes to the home page with the success message", async ({ context, page, request }) => {
  const number = await startPayment(context, page, request);
  await generatePix(page);
  await page.evaluate(() => ((window as unknown as { marker: number }).marker = 1));
  await request.post(`${FAKE_API}/__pay?number=${number}`);
  await expect(page).toHaveURL(new RegExp(`/\\?pedido=${number}$`), { timeout: 6000 });
  expect(await page.evaluate(() => (window as unknown as { marker?: number }).marker)).toBe(1); // no full reload
  await expect(page.getByText("Pagamento concluído com sucesso")).toBeVisible();
  await expect(page.getByText(`Pedido ${number}. Os detalhes foram para m***a@exemplo.com.`)).toBeVisible();
  await page.getByRole("button", { name: "Fechar mensagem" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText("Pagamento concluído com sucesso")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /^Sacola, \d/ })).toHaveCount(0);
  expect(await page.evaluate(() => sessionStorage.getItem("helena_checkout"))).toBeNull();
});

test("Review focus 1: reloading the payment page shows the same PIX, with one payment made", async ({ context, page, request }) => {
  await startPayment(context, page, request);
  await generatePix(page);
  const code = await page.getByText(/^00020126/).textContent();
  await page.reload();
  await expect(page.getByText(code!, { exact: true })).toBeVisible();
  await expect(page.getByText("Aguardando pagamento")).toBeVisible();
  expect((await paths(request)).filter((p) => p.endsWith("/payments"))).toHaveLength(1);
});

test("Review focus 2: a made-up or unpaid order number shows no message", async ({ context, page, request }) => {
  await page.goto("/?pedido=HL-999999");
  await expect(page.getByRole("heading", { name: "Em destaque" })).toBeVisible();
  await expect(page.getByText("Pagamento concluído com sucesso")).toHaveCount(0);
  const number = await startPayment(context, page, request);
  await page.goto(`/?pedido=${number}`);
  await expect(page.getByRole("heading", { name: "Em destaque" })).toBeVisible();
  await expect(page.getByText("Pagamento concluído com sucesso")).toHaveCount(0);
});

test("no order cookie: the payment page goes back to /checkout", async ({ context, page }) => {
  const response = await context.request.post(`${FAKE_API}/__carts`, { data: { lines: [{ productSizeId: JACKET_M }] } });
  const { id } = await response.json();
  await context.addCookies([{ name: "helena_cart", value: id, url: "http://localhost:3100" }]);
  await page.goto("/checkout/pagamento");
  await expect(page).toHaveURL(/\/checkout$/);
});

test("CHK-17 reservation over: warning, no PIX, and Tentar de novo reserves again", async ({ context, page, request }) => {
  const number = await startPayment(context, page, request);
  await generatePix(page);
  await request.post(`${FAKE_API}/__expire?number=${number}`);
  const alert = page.getByRole("main").getByRole("alert");
  await expect(alert).toContainText("Reserva encerrada", { timeout: 6000 });
  await expect(alert).toContainText("Os 15 minutos acabaram e as peças voltaram para o estoque. O código PIX não vale mais.");
  await expect(page.getByText(/^00020126/)).toHaveCount(0);
  await expect(page.getByRole("timer")).toHaveCount(0);
  await page.getByRole("button", { name: "Tentar de novo" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  await expect(page.getByRole("radio", { name: "PIX" })).not.toBeChecked();
  await generatePix(page);
  await expect(page.getByText(/^00020126/)).toBeVisible();
  await expect(page.getByRole("timer")).toHaveText(/Sua reserva termina em 1[45]:\d\d/);
});

test("CHK-17 reservation over and the piece sold out: Tentar de novo goes to the bag", async ({ context, page, request }) => {
  const number = await startPayment(context, page, request);
  await generatePix(page);
  await request.post(`${FAKE_API}/__expire?number=${number}`);
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Reserva encerrada", { timeout: 6000 });
  await request.post(`${FAKE_API}/__sold-out?productSizeId=${JACKET_M}`);
  await page.getByRole("button", { name: "Tentar de novo" }).click();
  await page.getByRole("radio", { name: "PIX" }).check();
  await page.getByRole("button", { name: "Gerar código PIX" }).click();
  await expect(page).toHaveURL(/\/sacola$/);
  await expect(page.getByText("Esgotada").first()).toBeVisible();
});

test("SAC-17 the bag shows the reservation time only while a payment is in progress", async ({ context, page, request }) => {
  const response = await context.request.post(`${FAKE_API}/__carts`, { data: { lines: [{ productSizeId: JACKET_M }] } });
  const { id } = await response.json();
  await context.addCookies([{ name: "helena_cart", value: id, url: "http://localhost:3100" }]);
  await page.goto("/sacola");
  await expect(page.getByRole("heading", { name: /Sua sacola/ })).toBeVisible();
  await expect(page.getByRole("timer")).toHaveCount(0);
  await startPayment(context, page, request);
  await page.goto("/sacola");
  await expect(page.getByRole("timer")).toHaveText(/Sua reserva termina em 1[45]:\d\d/);
});

test("Review focus 5: changing the bag ends the payment in progress", async ({ context, page, request }) => {
  await startPayment(context, page, request);
  await page.goto("/sacola");
  await expect(page.getByRole("timer")).toBeVisible();
  await page.getByRole("button", { name: /Aumentar/ }).first().click();
  await expect(page.getByRole("timer")).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(/\/checkout$/);
});

// Card (CHK-18 to CHK-22). The simulated gateway's fields: 4111 1111 1111 0000 is approved, a card ending in 0002 is declined.
const CAP = "5a1e0000-0000-4000-8000-000000000004"; // Boné de algodão, R$ 79,00

async function fillCard(page: Page, number: string, { cvv = "123" } = {}) {
  await page.getByRole("radio", { name: "Cartão de crédito" }).check();
  const gateway = page.getByRole("group", { name: "Campos do gateway · simulado" });
  await gateway.getByLabel("Número do cartão").fill(number);
  await gateway.getByLabel("Nome impresso no cartão").fill("MARIA SOUZA");
  await gateway.getByLabel("Validade").fill("08/29");
  await gateway.getByLabel("CVV").fill(cvv);
}

const payments = async (request: APIRequestContext) => (await paths(request)).filter((p) => p.endsWith("/payments"));

test("CHK-18 the card data never leaves the browser; only a token reaches the API", async ({ context, page, request }) => {
  await startPayment(context, page, request);
  const sent: string[] = [];
  page.on("request", (r) => sent.push(`${r.url()}\n${r.postData() ?? ""}`));
  await fillCard(page, "4111 1111 1111 0000");
  await page.getByRole("button", { name: "Pagar R$ 219,00" }).click();
  await expect(page).toHaveURL(/\/\?pedido=HL-\d+$/);
  for (const text of sent) {
    expect(text).not.toContain("4111111111110000");
    expect(text).not.toContain("4111 1111");
    expect(text).not.toContain("411111");
    expect(text).not.toContain("MARIA SOUZA");
    expect(text).not.toContain("08/29");
    // The CVV on its own: hex ids (action ids, UUIDs) may hold "123" inside them.
    expect(text).not.toMatch(/(^|[^0-9a-z])123([^0-9a-z]|$)/im);
  }
  expect(await payments(request)).toHaveLength(1);
  const bodies = await (await request.get(`${FAKE_API}/__payment-bodies`)).json();
  expect(bodies).toEqual([{ method: "card", cardToken: "tok_test_0000", installments: 1 }]);
});

test("CHK-19 an order of R$ 150,00 offers 1x, 2x and 3x sem juros, and no other", async ({ context, page, request }) => {
  await startPayment(context, page, request, { productSizeId: CAP, cep: "88010-000" });
  await page.getByRole("radio", { name: "Cartão de crédito" }).check();
  const options = page.getByLabel("Parcelas").locator("option");
  await expect(options).toHaveText(["1x de R$ 150,00 sem juros", "2x de R$ 75,00 sem juros", "3x de R$ 50,00 sem juros"]);
});

test("CHK-20 an approved card goes to the home page with the success message", async ({ context, page, request }) => {
  const number = await startPayment(context, page, request);
  await fillCard(page, "4111 1111 1111 0000");
  await page.getByLabel("Parcelas").selectOption({ label: "2x de R$ 109,50 sem juros" });
  await page.getByRole("button", { name: "Pagar R$ 219,00" }).click();
  await expect(page).toHaveURL(new RegExp(`/\\?pedido=${number}$`));
  await expect(page.getByText("Pagamento concluído com sucesso")).toBeVisible();
  const bodies = await (await request.get(`${FAKE_API}/__payment-bodies`)).json();
  expect(bodies[0].installments).toBe(2);
});

test("CHK-21 a declined card: the error, Pagar com PIX, and the details still filled in", async ({ context, page, request }) => {
  await startPayment(context, page, request);
  await fillCard(page, "4111 1111 1111 0002");
  await page.getByRole("button", { name: "Pagar R$ 219,00" }).click();
  const alert = page.getByRole("main").getByRole("alert");
  await expect(alert).toContainText("Pagamento não aprovado");
  await expect(alert).toContainText("O banco do cartão não aprovou esta compra. Tente outro cartão ou pague com PIX.");
  await expect(page.getByRole("timer")).toHaveCount(0);
  await page.getByRole("button", { name: "Pagar com PIX" }).click();
  await expect(page.getByRole("radio", { name: "PIX" })).toBeChecked();
  await page.getByRole("button", { name: "Gerar código PIX" }).click();
  await expect(page.getByText(/^00020126/)).toBeVisible();
  await expect(page.getByRole("timer")).toHaveText(/Sua reserva termina em 1[45]:\d\d/);
  // CHK-23: back to the details, everything she typed is still there.
  await page.goto("/checkout");
  for (const [label, value] of VALID) await expect(page.getByLabel(label, { exact: true })).toHaveValue(value);
});

test("CHK-21 a declined card and the piece sold out: paying again goes to the bag", async ({ context, page, request }) => {
  await startPayment(context, page, request);
  await fillCard(page, "4111 1111 1111 0002");
  await page.getByRole("button", { name: "Pagar R$ 219,00" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Pagamento não aprovado");
  await request.post(`${FAKE_API}/__sold-out?productSizeId=${JACKET_M}`);
  await page.getByRole("group", { name: "Campos do gateway · simulado" }).getByLabel("Número do cartão").fill("4111 1111 1111 0000");
  await page.getByRole("button", { name: "Pagar R$ 219,00" }).click();
  await expect(page).toHaveURL(/\/sacola$/);
});

test("CHK-22 a double tap on Pagar makes one charge and shows Processando", async ({ context, page, request }) => {
  await startPayment(context, page, request);
  await request.post(`${FAKE_API}/__slow?suffix=/payments`);
  await fillCard(page, "4111 1111 1111 0000");
  await page.getByRole("button", { name: "Pagar R$ 219,00" }).dblclick();
  await expect(page.getByRole("button", { name: "Processando" })).toBeDisabled();
  await expect(page).toHaveURL(/\/\?pedido=HL-\d+$/, { timeout: 6000 });
  expect(await payments(request)).toHaveLength(1);
});

test("card field checks: an empty CVV shows Confira o CVV, focuses it and sends nothing", async ({ context, page, request }) => {
  await startPayment(context, page, request);
  await fillCard(page, "4111 1111 1111 0000", { cvv: "" });
  await page.getByRole("button", { name: "Pagar R$ 219,00" }).click();
  await expect(page.getByText("Confira o CVV")).toBeVisible();
  await expect(page.getByLabel("CVV")).toBeFocused();
  expect(await payments(request)).toHaveLength(0);
});
