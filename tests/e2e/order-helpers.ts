import { expect, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";

export const FAKE_API = "http://localhost:4011";
// Jacket "Jaqueta sarja", Verde, size M, R$ 199,00; PAC R$ 20,00 for CEP 01310-100.
export const JACKET_M = "5a1e0000-0000-4000-8000-000000000002";

export const VALID: [string, string][] = [
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

export const paths = async (request: APIRequestContext) => (await (await request.get(`${FAKE_API}/__requests`)).json()) as string[];

// Builds a bag, fills /checkout, taps "Ir para pagamento" and answers the order number.
export async function startPayment(
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
  const read = (await paths(request)).findLast((p) => /^\/v1\/orders\/HL-\d+$/.test(p));
  if (!read) throw new Error("the payment page did not read the order");
  return read.split("/").pop()!;
}

export async function generatePix(page: Page) {
  await page.getByRole("radio", { name: "PIX" }).check();
  await page.getByRole("button", { name: "Gerar código PIX" }).click();
  await expect(page.getByText("Aguardando pagamento")).toBeVisible();
}

// The simulated gateway's fields: 4111 1111 1111 0000 is approved, a card ending in 0002 is declined.
export async function fillCard(page: Page, number: string, { cvv = "123" } = {}) {
  await page.getByRole("radio", { name: "Cartão de crédito" }).check();
  const gateway = page.getByRole("group", { name: "Campos do gateway · simulado" });
  await gateway.getByLabel("Número do cartão").fill(number);
  await gateway.getByLabel("Nome impresso no cartão").fill("MARIA SOUZA");
  await gateway.getByLabel("Validade").fill("08/29");
  await gateway.getByLabel("CVV").fill(cvv);
}
