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
async function startPayment(context: BrowserContext, page: Page, request: APIRequestContext): Promise<string> {
  const response = await context.request.post(`${FAKE_API}/__carts`, { data: { lines: [{ productSizeId: JACKET_M }] } });
  const { id } = await response.json();
  await context.addCookies([{ name: "helena_cart", value: id, url: "http://localhost:3100" }]);
  await page.goto("/checkout");
  for (const [label, value] of VALID) await page.getByLabel(label, { exact: true }).fill(value);
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
