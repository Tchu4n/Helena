import { test, expect, type APIRequestContext } from "@playwright/test";
import { skipCookieBanner } from "./consent";
import { FAKE_API, fillCard, generatePix, JACKET_M, paths, startPayment, VALID } from "./order-helpers";

test.beforeEach(async ({ context, request }) => {
  await skipCookieBanner(context);
  await request.post(`${FAKE_API}/__reset`);
});

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

test("CHK-16 a confirmed PIX goes to the order confirmation without reloading", async ({ context, page, request }) => {
  const number = await startPayment(context, page, request);
  await generatePix(page);
  await page.evaluate(() => ((window as unknown as { marker: number }).marker = 1));
  await request.post(`${FAKE_API}/__pay?number=${number}`);
  await expect(page).toHaveURL(new RegExp(`/pedido/${number}\\?confirmado=1$`), { timeout: 6000 });
  expect(await page.evaluate(() => (window as unknown as { marker?: number }).marker)).toBe(1); // no full reload
  await expect(page.getByRole("heading", { level: 1, name: "Pedido confirmado" })).toBeVisible();
  // The payment page stays hidden in the DOM (route state is kept), so look inside main only.
  await expect(page.getByRole("main").getByText("Forma de pagamento")).toBeVisible();
  await expect(page.getByRole("main").getByText("PIX", { exact: true })).toBeVisible();
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

// Card (CHK-18 to CHK-22).
const CAP = "5a1e0000-0000-4000-8000-000000000004"; // Boné de algodão, R$ 79,00

const payments = async (request: APIRequestContext) => (await paths(request)).filter((p) => p.endsWith("/payments"));

test("CHK-18 the card data never leaves the browser; only a token reaches the API", async ({ context, page, request }) => {
  await startPayment(context, page, request);
  const sent: string[] = [];
  page.on("request", (r) => sent.push(`${r.url()}\n${r.postData() ?? ""}`));
  await fillCard(page, "4111 1111 1111 0000");
  await page.getByRole("button", { name: "Pagar R$ 219,00" }).click();
  await expect(page).toHaveURL(/\/pedido\/HL-\d+\?confirmado=1$/);
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

test("CHK-20 an approved card goes to the order confirmation", async ({ context, page, request }) => {
  const number = await startPayment(context, page, request);
  await fillCard(page, "4111 1111 1111 0000");
  await page.getByLabel("Parcelas").selectOption({ label: "2x de R$ 109,50 sem juros" });
  await page.getByRole("button", { name: "Pagar R$ 219,00" }).click();
  await expect(page).toHaveURL(new RegExp(`/pedido/${number}\\?confirmado=1$`));
  await expect(page.getByRole("heading", { level: 1, name: "Pedido confirmado" })).toBeVisible();
  await expect(page.getByRole("main").getByText("Cartão de crédito · 2x")).toBeVisible();
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
  await expect(page).toHaveURL(/\/pedido\/HL-\d+\?confirmado=1$/, { timeout: 6000 });
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
