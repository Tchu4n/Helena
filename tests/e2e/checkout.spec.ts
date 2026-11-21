import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { skipCookieBanner } from "./consent";

const FAKE_API = "http://localhost:4011";
// Jacket "Jaqueta sarja", Verde, size M, R$ 199,00 in the fake API.
const JACKET_M = "5a1e0000-0000-4000-8000-000000000002";

type Line = { productSizeId: string; quantity?: number; unitPrice?: number; name?: string };

test.beforeEach(async ({ context, request }) => {
  await skipCookieBanner(context);
  await request.post(`${FAKE_API}/__reset`);
});

// Builds a bag in the fake API, hands its id to the browser as the store's own cookie, and opens /checkout.
async function openCheckout(
  context: BrowserContext,
  page: Page,
  lines: Line[] = [{ productSizeId: JACKET_M }],
  extra: { cep?: string; chosen?: string; coupon?: string } = {},
): Promise<string> {
  const response = await context.request.post(`${FAKE_API}/__carts`, { data: { lines, ...extra } });
  const { id } = await response.json();
  await context.addCookies([{ name: "helena_cart", value: id, url: "http://localhost:3100" }]);
  await page.goto("/checkout");
  return id;
}

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

async function fillValid(page: Page, skip: string[] = []) {
  for (const [label, value] of VALID) {
    if (!skip.includes(label)) await page.getByLabel(label, { exact: true }).fill(value);
  }
}

// The fake API answers an empty body when nothing was saved yet.
const savedLead = (context: BrowserContext, cartId: string) =>
  context.request
    .get(`${FAKE_API}/__customer?cartId=${cartId}`)
    .then((r) => r.text())
    .then((text) => (text ? JSON.parse(text) : null));

test("CHK-01 Finalizar compra goes straight to the details form, no login", async ({ context, page }) => {
  await openCheckout(context, page);
  await page.goto("/sacola");
  await page.getByRole("button", { name: "Finalizar compra" }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole("heading", { name: "Seus dados" })).toBeVisible();
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await expect(page.getByText("Entrar", { exact: true })).toHaveCount(0);
});

test("CHK-02 the fields, their autocomplete, and an empty CEP", async ({ context, page }) => {
  await openCheckout(context, page, undefined, { cep: "01310100", chosen: "pac" });
  const steps = page.getByRole("list", { name: "Etapas da compra" });
  await expect(steps.locator("[aria-current=step]")).toHaveText("Dados e entrega");
  const autocomplete: [string, string][] = [
    ["Nome completo", "name"],
    ["CPF", "off"],
    ["E-mail", "email"],
    ["Celular", "tel-national"],
    ["CEP", "postal-code"],
    ["Rua", "address-line1"],
    ["Número", "off"],
    ["Complemento (opcional)", "address-line2"],
    ["Bairro", "address-level3"],
    ["Cidade", "address-level2"],
    ["UF", "address-level1"],
  ];
  for (const [label, value] of autocomplete) {
    await expect(page.getByLabel(label, { exact: true })).toHaveAttribute("autocomplete", value);
  }
  await expect(page.getByLabel("CEP", { exact: true })).toHaveValue("");
});

const ROWS: [string, string, string][] = [
  ["CPF", "123.456.789-0", "CPF deve ter 11 números"],
  ["CPF", "1234567890a", "CPF deve ter 11 números"],
  ["E-mail", "maria.exemplo.com", "Digite um e-mail válido"],
  ["Celular", "(11) 9abc-0000", "Digite só números"],
  ["CEP", "0131010", "Digite um CEP com 8 números"],
  ["Nome completo", "", "Campo obrigatório"],
  ["Rua", "", "Campo obrigatório"],
  ["CPF", "111.444.777-00", "CPF inválido"],
  ["Celular", "(11) 9876-543", "Digite o celular com DDD"],
  ["UF", "S", "Digite a sigla do estado, como SP"],
];

for (const [label, value, message] of ROWS) {
  test(`CHK-03 ${label} "${value}" shows "${message}" and gets focus (CHK-04 keeps the rest)`, async ({ context, page }) => {
    await openCheckout(context, page);
    await fillValid(page);
    const field = page.getByLabel(label, { exact: true });
    await field.fill(value);
    await page.getByRole("button", { name: "Ir para pagamento" }).click();
    await expect(field).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText(message, { exact: true })).toBeVisible();
    await expect(field).toBeFocused();
    // CHK-04: nothing already filled in is cleared.
    for (const [other, typed] of VALID) {
      if (other !== label) await expect(page.getByLabel(other, { exact: true })).toHaveValue(typed);
    }
  });
}

test("CHK-03 focus goes to the first field with an error", async ({ context, page }) => {
  await openCheckout(context, page);
  await fillValid(page, ["E-mail", "Bairro"]);
  await page.getByRole("button", { name: "Ir para pagamento" }).click();
  await expect(page.getByLabel("E-mail", { exact: true })).toBeFocused();
  await expect(page.getByLabel("Bairro", { exact: true })).toHaveAttribute("aria-invalid", "true");
});

test("CHK-05 the lead is saved when every required field is valid and she leaves a field", async ({ context, page }) => {
  const cartId = await openCheckout(context, page);
  await fillValid(page, ["UF"]);
  await page.getByLabel("Cidade", { exact: true }).blur();
  expect(await savedLead(context, cartId)).toBeNull(); // one required field still empty
  await page.getByLabel("UF", { exact: true }).fill("sp");
  await page.getByLabel("UF", { exact: true }).blur();
  await expect.poll(() => savedLead(context, cartId)).toMatchObject({
    name: "Maria Souza",
    cpf: "52998224725",
    phone: "11987654321",
    address: { cep: "01310100", state: "SP", complement: null },
  });
});

test("CHK-06 the reminder notice sits with the contact fields, with the privacy link", async ({ context, page }) => {
  await openCheckout(context, page);
  const contact = page.getByRole("group", { name: "Seus dados" });
  await expect(
    contact.getByText(
      "Podemos usar seu e-mail e celular para lembrar você desta compra, se ela não for concluída. Cada lembrete traz a opção de parar de receber.",
    ),
  ).toBeVisible();
  await expect(contact.getByRole("link", { name: "Política de privacidade" })).toHaveAttribute("href", "/privacidade");
});

test("CHK-07 two separate boxes, unchecked; only the checked channel is recorded", async ({ context, page }) => {
  const cartId = await openCheckout(context, page);
  const email = page.getByRole("checkbox", { name: "Quero receber novidades por e-mail" });
  const whatsapp = page.getByRole("checkbox", { name: "Quero receber novidades por WhatsApp" });
  await expect(email).not.toBeChecked();
  await expect(whatsapp).not.toBeChecked();
  await fillValid(page);
  await whatsapp.check();
  await page.getByLabel("UF", { exact: true }).focus();
  await page.getByLabel("UF", { exact: true }).blur();
  await expect
    .poll(async () => (await savedLead(context, cartId))?.consents)
    .toEqual({ email: false, whatsapp: true, textVersion: "2026-11" });
});

test("CHK-08 a CPF already on record: no error and nothing filled in for her", async ({ context, page, request }) => {
  // Someone else's purchase with the same CPF and e-mail.
  const other = await (await request.post(`${FAKE_API}/__carts`, { data: { lines: [{ productSizeId: JACKET_M }] } })).json();
  await request.put(`${FAKE_API}/v1/carts/${other.id}/customer`, {
    data: {
      name: "Outra Pessoa",
      cpf: "52998224725",
      email: "maria@exemplo.com",
      phone: "21999998888",
      address: { cep: "20040002", street: "Rua X", number: "9", complement: null, neighborhood: "Centro", city: "Rio", state: "RJ" },
      consents: { email: true, whatsapp: true, textVersion: "2026-11" },
    },
  });
  await openCheckout(context, page);
  await page.getByLabel("CPF", { exact: true }).fill("529.982.247-25");
  await page.getByLabel("E-mail", { exact: true }).fill("maria@exemplo.com");
  await page.getByLabel("Celular", { exact: true }).focus();
  for (const label of ["Nome completo", "Celular", "Rua", "Cidade"]) {
    await expect(page.getByLabel(label, { exact: true })).toHaveValue("");
  }
  await expect(page.getByText("Outra Pessoa")).toHaveCount(0);
  // Next's route announcer also has role="alert", outside <main>.
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
});

test("CHK-23 going back to the bag and coming back keeps everything", async ({ context, page }) => {
  await openCheckout(context, page);
  await fillValid(page);
  await page.getByLabel("Complemento (opcional)", { exact: true }).fill("Apto 12");
  await page.getByRole("checkbox", { name: "Quero receber novidades por e-mail" }).check();
  await page.goto("/sacola");
  await page.goto("/checkout");
  for (const [label, value] of VALID) await expect(page.getByLabel(label, { exact: true })).toHaveValue(value);
  await expect(page.getByLabel("Complemento (opcional)", { exact: true })).toHaveValue("Apto 12");
  await expect(page.getByRole("checkbox", { name: "Quero receber novidades por e-mail" })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Quero receber novidades por WhatsApp" })).not.toBeChecked();
});

test("a failed lead save shows nothing and typing goes on", async ({ context, page, request }) => {
  const cartId = await openCheckout(context, page);
  await request.post(`${FAKE_API}/__fail?path=/v1/carts/${cartId}/customer`);
  await fillValid(page);
  await page.getByLabel("UF", { exact: true }).blur();
  await expect.poll(async () => (await (await request.get(`${FAKE_API}/__requests`)).json()).filter((p: string) => p.endsWith("/customer")).length).toBeGreaterThan(0);
  // Next's route announcer also has role="alert", outside <main>.
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  await page.getByLabel("Complemento (opcional)", { exact: true }).fill("Casa");
  await expect(page.getByLabel("Complemento (opcional)", { exact: true })).toHaveValue("Casa");
});

test("an empty bag goes back to /sacola", async ({ context, page }) => {
  await openCheckout(context, page, []);
  await expect(page).toHaveURL(/\/sacola$/);
});

// ---- Task 4: delivery, CHK-10 note, "Ir para pagamento" ----

const ordersPosted = async (request: import("@playwright/test").APIRequestContext) =>
  ((await (await request.get(`${FAKE_API}/__requests`)).json()) as string[]).filter((p) => p === "/v1/orders").length;

const PROTOTYPE_BAG: Line[] = [{ productSizeId: JACKET_M }, { productSizeId: "5a1e0000-0000-4000-8000-000000000004", unitPrice: 11900 }];
const delivery = (page: Page) => page.getByRole("group", { name: "Entrega", exact: true });
const bar = (page: Page) => page.locator("[data-purchase-bar]");

test("before any CEP: the hint, and the summary keeps the bag's shipping and total", async ({ context, page }) => {
  await openCheckout(context, page, undefined, { cep: "01310100", chosen: "pac" });
  await expect(delivery(page).getByText("Digite o CEP para ver as opções de entrega.")).toBeVisible();
  await expect(delivery(page).getByRole("radio")).toHaveCount(0);
  await page.getByText(/^Resumo/).click();
  await expect(page.getByText("Frete (PAC)")).toBeVisible();
  await expect(bar(page)).toContainText("R$ 219,00");
});

test("CHK-09 a CEP shows the options with price and time, the cheapest chosen; Sedex changes the total", async ({ context, page }) => {
  await openCheckout(context, page);
  await page.getByLabel("CEP", { exact: true }).fill("01310-100");
  const options = delivery(page).getByRole("radio");
  await expect(options).toHaveCount(3);
  await expect(delivery(page).getByRole("radio", { name: /PAC/ })).toBeChecked();
  await expect(delivery(page)).toContainText("Chega em até 5 dias úteis");
  await expect(delivery(page)).toContainText("R$ 20,00");
  await expect(bar(page)).toContainText("R$ 219,00");
  await delivery(page).getByRole("radio", { name: /Sedex/ }).check();
  await expect(bar(page)).toContainText("R$ 234,00");
  await page.getByText(/^Resumo/).click();
  await expect(page.getByText("Frete (Sedex)")).toBeVisible();
});

test("CHK-09 with PRO-11: the fixed-fee answer still lets her go to payment", async ({ context, page }) => {
  await openCheckout(context, page);
  await fillValid(page, ["CEP"]);
  await page.getByLabel("CEP", { exact: true }).fill("99999-999");
  await expect(delivery(page).getByRole("radio")).toHaveCount(1);
  await expect(delivery(page)).toContainText("R$ 30,00");
  await page.getByRole("button", { name: "Ir para pagamento" }).click();
  await expect(page).toHaveURL(/\/checkout\/pagamento$/);
});

test("CHK-10 a new CEP shows the change in the total; the bag's own CEP shows no note", async ({ context, page }) => {
  // The prototype's bag: jacket R$ 199,00 + a R$ 119,00 piece, MARIA10, PAC R$ 20,00.
  await openCheckout(context, page, PROTOTYPE_BAG, { cep: "01310100", chosen: "pac", coupon: "MARIA10" });
  await expect(bar(page)).toContainText("R$\u00a0306,20");
  await page.getByLabel("CEP", { exact: true }).fill("01310-100");
  await expect(delivery(page).getByRole("radio")).toHaveCount(3);
  await expect(page.getByText("O frete mudou com o novo CEP")).toHaveCount(0);
  await page.getByLabel("CEP", { exact: true }).fill("69900-000");
  await expect(delivery(page).getByRole("radio")).toHaveCount(2);
  const note = page.getByText("O frete mudou com o novo CEP");
  await expect(note).toBeVisible();
  await expect(page.getByText("Total: R$\u00a0306,20 → R$\u00a0331,20")).toBeVisible();
});

test("CHK-11 the summary opens to items, discount, shipping, delivery time and total", async ({ context, page }) => {
  await openCheckout(context, page, undefined, { cep: "01310100", chosen: "pac", coupon: "MARIA10" });
  await page.getByText(/^Resumo/).click();
  const summary = page.locator("details");
  await expect(summary.getByText("Jaqueta sarja")).toBeVisible();
  await expect(summary.getByText("Desconto (MARIA10)")).toBeVisible();
  await expect(summary.getByText("Frete (PAC)")).toBeVisible();
  await expect(summary.getByText("Chega em até 5 dias úteis")).toBeVisible();
  await expect(summary.getByText("Total", { exact: true })).toBeVisible();
});

test("CHK-12 a valid form goes to /checkout/pagamento with one order", async ({ context, page, request }) => {
  await openCheckout(context, page);
  await fillValid(page);
  await expect(delivery(page).getByRole("radio", { name: /PAC/ })).toBeChecked();
  await page.getByRole("button", { name: "Ir para pagamento" }).click();
  await expect(page).toHaveURL(/\/checkout\/pagamento$/);
  expect(await ordersPosted(request)).toBe(1);
});

test("Review focus 4: a double tap on Ir para pagamento makes one order", async ({ context, page, request }) => {
  await openCheckout(context, page);
  await fillValid(page);
  await expect(delivery(page).getByRole("radio", { name: /PAC/ })).toBeChecked();
  await request.post(`${FAKE_API}/__slow?suffix=/v1/orders`);
  await page.getByRole("button", { name: "Ir para pagamento" }).dblclick();
  await expect(page.getByRole("button", { name: "Processando" })).toBeDisabled();
  await expect(page).toHaveURL(/\/checkout\/pagamento$/);
  expect(await ordersPosted(request)).toBe(1);
});

test("CHK-13 a piece sold out before reserving: back to the bag, which names it", async ({ context, page, request }) => {
  await openCheckout(context, page);
  await fillValid(page);
  await expect(delivery(page).getByRole("radio", { name: /PAC/ })).toBeChecked();
  await request.post(`${FAKE_API}/__sold-out?productSizeId=${JACKET_M}`);
  await page.getByRole("button", { name: "Ir para pagamento" }).click();
  await expect(page).toHaveURL(/\/sacola$/);
  await expect(page.getByText("Esgotada", { exact: true })).toBeVisible();
  await expect(page.getByText("Esgotou depois que entrou na sacola. Fica fora do total.")).toBeVisible();
});

// The 422 answer (incomplete cart) can't happen after the action saved the details and a delivery is chosen;
// it goes through the same branch as this 500: problem.title above the bar.
test("a failed /v1/orders shows the message above the bar and keeps the fields", async ({ context, page, request }) => {
  await openCheckout(context, page);
  await fillValid(page);
  await expect(delivery(page).getByRole("radio", { name: /PAC/ })).toBeChecked();
  await request.post(`${FAKE_API}/__fail?path=/v1/orders`);
  await page.getByRole("button", { name: "Ir para pagamento" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Não foi possível concluir. Tente de novo");
  await expect(page).toHaveURL(/\/checkout$/);
  for (const [label, value] of VALID) await expect(page.getByLabel(label, { exact: true })).toHaveValue(value);
});
