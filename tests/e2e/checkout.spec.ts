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
