import { test, expect, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";
import { skipCookieBanner } from "./consent";
import { FAKE_API, JACKET_M } from "./order-helpers";

test.beforeEach(async ({ context, request }) => {
  await skipCookieBanner(context);
  await request.post(`${FAKE_API}/__reset`);
});

// A bag whose e-mail is not confirmed yet; "Finalizar compra" leads to identification (CHK-01).
async function openIdentification(context: BrowserContext, page: Page): Promise<string> {
  const response = await context.request.post(`${FAKE_API}/__carts`, { data: { lines: [{ productSizeId: JACKET_M }] } });
  const { id } = await response.json();
  await context.addCookies([{ name: "helena_cart", value: id, url: "http://localhost:3100" }]);
  await page.goto("/sacola");
  await page.getByRole("button", { name: "Finalizar compra" }).click();
  await expect(page).toHaveURL(/\/checkout\/identificacao$/);
  return id;
}

const codeFor = async (request: APIRequestContext, email: string) =>
  ((await (await request.get(`${FAKE_API}/__codes?email=${encodeURIComponent(email)}`)).json()) as { code: string }).code;

async function askCode(page: Page, email: string, way: RegExp = /Comprar só com e-mail/) {
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByRole("radio", { name: way }).check();
  await page.getByRole("button", { name: "Receber código" }).click();
  await expect(page.getByText(`Enviamos um código para ${email.trim().toLowerCase()}`)).toBeVisible();
}

async function typeCode(page: Page, code: string) {
  await page.getByLabel("Código", { exact: true }).fill(code);
  await page.getByRole("button", { name: "Confirmar" }).click();
}

test("IDT-01 the step, the two ways with none chosen, the notice, and the required checks", async ({ context, page }) => {
  await openIdentification(context, page);
  await expect(page.getByRole("heading", { level: 1, name: "Identificação" })).toBeVisible();
  const steps = page.getByRole("list", { name: "Etapas da compra" });
  await expect(steps.locator("[aria-current=step]")).toHaveText("Identificação");
  const ways = page.getByRole("radiogroup", { name: "Como você quer comprar?" });
  await expect(ways.getByRole("radio", { name: /Comprar só com e-mail/ })).not.toBeChecked();
  await expect(ways.getByRole("radio", { name: /Criar conta/ })).not.toBeChecked();
  await expect(page.getByText("Você confirma o e-mail a cada compra.")).toBeVisible();
  await expect(page.getByText("Sua conta guarda pedidos e endereços.")).toBeVisible();
  await expect(page.getByText("Usaremos este e-mail para o pedido e para lembrar você de uma compra não concluída.")).toBeVisible();
  await page.getByRole("button", { name: "Receber código" }).click();
  await expect(page.getByText("Campo obrigatório")).toBeVisible();
  await expect(page.getByText("Escolha como quer comprar")).toBeVisible();
  await expect(page.getByLabel("E-mail", { exact: true })).toBeFocused();
});

test("IDT-01 a wrong e-mail is caught before anything is sent", async ({ context, page, request }) => {
  await openIdentification(context, page);
  await page.getByLabel("E-mail", { exact: true }).fill("maria.exemplo.com");
  await page.getByRole("radio", { name: /Comprar só com e-mail/ }).check();
  await page.getByRole("button", { name: "Receber código" }).click();
  await expect(page.getByText("Digite um e-mail válido")).toBeVisible();
  const sent = (await (await request.get(`${FAKE_API}/__requests`)).json()) as string[];
  expect(sent).not.toContain("/v1/email-codes");
});

test("IDT-02 Review focus 1: the same answer for any e-mail, and nothing saved shows", async ({ context, page, request }) => {
  // An earlier purchase's lead with this e-mail, on another bag.
  const other = await (await request.post(`${FAKE_API}/__carts`, { data: { lines: [{ productSizeId: JACKET_M }], verifiedEmail: "maria@exemplo.com" } })).json();
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
  await openIdentification(context, page);
  await askCode(page, "maria@exemplo.com");
  await expect(page.getByText("Outra Pessoa")).toHaveCount(0);
  await expect(page.getByText("Rua X")).toHaveCount(0);
  await page.getByRole("button", { name: "Trocar e-mail" }).click();
  await askCode(page, "ninguem@exemplo.com");
});

test("IDT-03 Review focus 3: the right code, pasted with spaces, opens Dados e entrega with the e-mail read-only", async ({ context, page, request }) => {
  await openIdentification(context, page);
  await askCode(page, "  MARIA@Exemplo.com ");
  const code = await codeFor(request, "maria@exemplo.com");
  await typeCode(page, ` ${code.slice(0, 3)} ${code.slice(3)} `);
  await expect(page).toHaveURL(/\/checkout$/);
  const email = page.getByLabel("E-mail", { exact: true });
  await expect(email).toHaveValue("maria@exemplo.com");
  await expect(email).toHaveAttribute("readonly", "");
  await expect(page.getByRole("button", { name: "Trocar e-mail" })).toBeVisible();
});

test("IDT-04 a wrong code is refused, and after 5 wrong tries the right one is too", async ({ context, page, request }) => {
  await openIdentification(context, page);
  await askCode(page, "maria@exemplo.com");
  const code = await codeFor(request, "maria@exemplo.com");
  const wrong = code === "000000" ? "111111" : "000000";
  await typeCode(page, wrong);
  await expect(page.getByText("Código inválido ou vencido")).toBeVisible();
  await expect(page.getByText("Enviamos um código para maria@exemplo.com")).toBeVisible();
  for (let i = 0; i < 4; i++) await typeCode(page, wrong);
  await typeCode(page, code);
  await expect(page.getByText("Código inválido ou vencido")).toBeVisible();
  await expect(page).toHaveURL(/\/checkout\/identificacao$/);
});

test("IDT-05 IDT-06 resend after 30 s, WhatsApp help after 2 minutes, and no sale without the code", async ({ context, page, request }) => {
  await page.clock.install();
  await openIdentification(context, page);
  await askCode(page, "maria@exemplo.com");
  const first = await codeFor(request, "maria@exemplo.com");
  const resend = page.getByRole("button", { name: "Reenviar código" });
  await expect(resend).toBeDisabled();
  await page.clock.fastForward(30_000);
  await expect(resend).toBeEnabled();
  await resend.click();
  await expect(page.getByText("Código reenviado")).toBeVisible();
  expect(await codeFor(request, "maria@exemplo.com")).not.toBe(first);
  await expect(page.getByRole("link", { name: "Não recebeu? Fale com a loja no WhatsApp" })).toHaveCount(0);
  await page.clock.fastForward(120_000);
  await expect(page.getByRole("link", { name: "Não recebeu? Fale com a loja no WhatsApp" })).toHaveAttribute(
    "href",
    "https://wa.me/5511900000000",
  );
  await page.goto("/checkout");
  await expect(page).toHaveURL(/\/checkout\/identificacao$/);
});

test("IDT-07 Review focus 2: after a reload she is back on the code step, same e-mail and way", async ({ context, page, request }) => {
  await openIdentification(context, page);
  await askCode(page, "maria@exemplo.com");
  await page.reload();
  await expect(page.getByText("Enviamos um código para maria@exemplo.com")).toBeVisible();
  await typeCode(page, await codeFor(request, "maria@exemplo.com"));
  await expect(page).toHaveURL(/\/checkout$/); // the guest way was kept
});

test("IDT-12 Review focus 4: no confirmed e-mail, no Dados e entrega and no order", async ({ context, page, request }) => {
  const cartId = await openIdentification(context, page);
  await page.goto("/checkout");
  await expect(page).toHaveURL(/\/checkout\/identificacao$/);
  // Confirmed, then dropped on the API while the form is open: "Ir para pagamento" lands on identification.
  await askCode(page, "maria@exemplo.com");
  await typeCode(page, await codeFor(request, "maria@exemplo.com"));
  await expect(page).toHaveURL(/\/checkout$/);
  for (const [label, value] of [
    ["Nome completo", "Maria Souza"],
    ["CPF", "529.982.247-25"],
    ["Celular", "(11) 98765-4321"],
    ["CEP", "01310-100"],
    ["Rua", "Avenida Paulista"],
    ["Número", "1000"],
    ["Bairro", "Bela Vista"],
    ["Cidade", "São Paulo"],
    ["UF", "SP"],
  ]) {
    await page.getByLabel(label, { exact: true }).fill(value);
  }
  await expect(page.getByRole("radio", { name: /PAC/ })).toBeChecked();
  await request.post(`${FAKE_API}/__unverify?cartId=${cartId}`);
  await page.getByRole("button", { name: "Ir para pagamento" }).click();
  await expect(page).toHaveURL(/\/checkout\/identificacao$/);
  const sent = (await (await request.get(`${FAKE_API}/__requests`)).json()) as string[];
  expect(sent.filter((p) => p === "/v1/orders")).toHaveLength(0); // the customer step was refused first
});

test("IDT-13 Trocar e-mail drops the confirmation and goes back to the first step", async ({ context, page, request }) => {
  await openIdentification(context, page);
  await askCode(page, "maria@exemplo.com");
  await typeCode(page, await codeFor(request, "maria@exemplo.com"));
  await expect(page).toHaveURL(/\/checkout$/);
  await page.getByRole("button", { name: "Trocar e-mail" }).click();
  await expect(page).toHaveURL(/\/checkout\/identificacao$/);
  // getByRole skips the details page Next keeps hidden in the DOM (preserved route state).
  await expect(page.getByRole("textbox", { name: "E-mail", exact: true })).toHaveValue("");
  await page.goto("/checkout");
  await expect(page).toHaveURL(/\/checkout\/identificacao$/);
});

test("CHK-23 with the read-only e-mail: details kept in the tab never bring back an old e-mail", async ({ context, page, request }) => {
  await openIdentification(context, page);
  await page.evaluate(() => sessionStorage.setItem("helena_checkout", JSON.stringify({ email: "ana@exemplo.com", name: "Maria Souza" })));
  await askCode(page, "maria@exemplo.com");
  await typeCode(page, await codeFor(request, "maria@exemplo.com"));
  await expect(page.getByLabel("E-mail", { exact: true })).toHaveValue("maria@exemplo.com");
  await expect(page.getByLabel("Nome completo", { exact: true })).toHaveValue("Maria Souza");
});

test("too many codes: the API's message", async ({ context, page }) => {
  await openIdentification(context, page);
  await page.getByLabel("E-mail", { exact: true }).fill("limite@exemplo.com");
  await page.getByRole("radio", { name: /Comprar só com e-mail/ }).check();
  await page.getByRole("button", { name: "Receber código" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Muitas tentativas. Aguarde um pouco e tente de novo");
});
