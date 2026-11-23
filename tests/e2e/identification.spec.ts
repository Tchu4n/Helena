import { test, expect, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";
import { skipCookieBanner } from "./consent";
import { FAKE_API, JACKET_M, VALID } from "./order-helpers";

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
  // Each wrong try must reach the API before the next one: typing while the last one is still on its way
  // would be wiped by the form reset and sent empty.
  for (let tries = 2; tries <= 5; tries++) {
    await typeCode(page, wrong);
    await expect
      .poll(async () => ((await (await request.get(`${FAKE_API}/__codes?email=maria%40exemplo.com`)).json()) as { tries: number }).tries)
      .toBe(tries);
  }
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

// Signs her up through the screen ("Criar conta", code, password) and lands on Dados e entrega.
async function signUp(context: BrowserContext, page: Page, request: APIRequestContext, email: string) {
  await openIdentification(context, page);
  await askCode(page, email, /Criar conta/);
  await typeCode(page, await codeFor(request, email));
  await page.getByLabel("Crie sua senha", { exact: true }).fill("senha-segura");
  await page.getByRole("button", { name: "Continuar" }).click();
  await fillAccountDetails(page);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page).toHaveURL(/\/checkout$/);
}

// IDT-14: "Seus dados", with the VALID name, CPF and phone.
// Dados e entrega has a "Seus dados" section too: the URL tells them apart.
async function fillAccountDetails(page: Page, cpf = "529.982.247-25") {
  await expect(page.getByRole("heading", { name: "Seus dados" })).toBeVisible();
  await expect(page).toHaveURL(/\/checkout\/identificacao$/);
  for (const [label, value] of VALID.slice(0, 3)) await page.getByLabel(label, { exact: true }).fill(label === "CPF" ? cpf : value);
}

const DETAILS = { name: "Maria Souza", cpf: "52998224725", phone: "11987654321" };

// A second bag, started another day: its e-mail is not confirmed yet.
async function newBag(context: BrowserContext): Promise<string> {
  const { id } = await (await context.request.post(`${FAKE_API}/__carts`, { data: { lines: [{ productSizeId: JACKET_M }] } })).json();
  await context.addCookies([{ name: "helena_cart", value: id, url: "http://localhost:3100" }]);
  return id;
}

async function fillDetails(page: Page) {
  for (const [label, value] of VALID) await page.getByLabel(label, { exact: true }).fill(value);
  await expect(page.getByRole("radio", { name: /PAC/ })).toBeChecked();
}

const sessionCookie = async (context: BrowserContext) => (await context.cookies()).find((c) => c.name === "helena_session");
const sessionValue = async (context: BrowserContext) =>
  JSON.parse(decodeURIComponent((await sessionCookie(context))!.value)) as { token: string; detailsComplete: boolean };

test("IDT-08 Criar conta with a new e-mail: the password after the code, then Dados e entrega signed in", async ({ context, page, request }) => {
  await openIdentification(context, page);
  await askCode(page, "nova@exemplo.com", /Criar conta/);
  await typeCode(page, await codeFor(request, "nova@exemplo.com"));
  const password = page.getByLabel("Crie sua senha", { exact: true });
  await expect(password).toHaveAttribute("type", "password");
  await expect(page.getByText("Mínimo de 8 caracteres")).toBeVisible();
  await password.fill("curta");
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByText("A senha precisa ter pelo menos 8 caracteres")).toBeVisible();
  await expect(password).toHaveValue("");
  await password.fill("senha-segura");
  await page.getByRole("button", { name: "Continuar" }).click();
  // IDT-14: "Seus dados" before Dados e entrega, with the CHK-03 messages.
  await expect(page.getByRole("heading", { name: "Seus dados" })).toBeVisible();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByText("Campo obrigatório").first()).toBeVisible();
  await expect(page.getByLabel("Nome completo", { exact: true })).toBeFocused();
  expect((await sessionValue(context)).detailsComplete).toBe(false);
  await fillAccountDetails(page);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByLabel("E-mail", { exact: true })).toHaveValue("nova@exemplo.com");
  expect((await sessionValue(context)).detailsComplete).toBe(true);
  const session = await sessionCookie(context);
  expect(session?.httpOnly).toBe(true);
  expect(session?.sameSite).toBe("Lax");
  const stored = await page.evaluate(() => JSON.stringify({ ...sessionStorage }) + JSON.stringify({ ...localStorage }));
  expect(stored).not.toContain("senha-segura");
  expect(stored).not.toContain(decodeURIComponent(session!.value));
});

test("IDT-09 an account without details: the message, then Seus dados", async ({ context, page, request }) => {
  await request.post(`${FAKE_API}/__accounts`, { data: { email: "maria@exemplo.com", password: "antiga-123" } });
  await openIdentification(context, page);
  await askCode(page, "maria@exemplo.com", /Criar conta/);
  await typeCode(page, await codeFor(request, "maria@exemplo.com"));
  await expect(page.getByText("Este e-mail já tem uma conta. Você entrou nela e sua senha não mudou.")).toBeVisible();
  await page.getByRole("button", { name: "Continuar" }).click();
  await fillAccountDetails(page);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page).toHaveURL(/\/checkout$/);
});

test("IDT-09 Criar conta on an e-mail that has one: signed in, no password asked, the old one kept", async ({ context, page, request }) => {
  await request.post(`${FAKE_API}/__accounts`, { data: { email: "maria@exemplo.com", password: "antiga-123", details: DETAILS } });
  await openIdentification(context, page);
  await askCode(page, "maria@exemplo.com", /Criar conta/);
  await typeCode(page, await codeFor(request, "maria@exemplo.com"));
  await expect(page.getByText("Este e-mail já tem uma conta. Você entrou nela e sua senha não mudou.")).toBeVisible();
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  expect(await sessionCookie(context)).toBeDefined();
  // "Sair" arrives with Task 4; dropping the cookie signs her out here.
  await context.clearCookies({ name: "helena_session" });
  await page.goto("/checkout/identificacao");
  await page.getByRole("button", { name: "Já tem senha? Entrar com senha" }).click();
  await page.getByLabel("E-mail", { exact: true }).fill("maria@exemplo.com");
  await page.getByLabel("Senha", { exact: true }).fill("antiga-123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/checkout$/);
});

test("IDT-10 sign in with a password into an account without details: Seus dados", async ({ context, page, request }) => {
  await request.post(`${FAKE_API}/__accounts`, { data: { email: "maria@exemplo.com", password: "certa-123" } });
  await openIdentification(context, page);
  await page.getByRole("button", { name: "Já tem senha? Entrar com senha" }).click();
  await page.getByLabel("E-mail", { exact: true }).fill("maria@exemplo.com");
  await page.getByLabel("Senha", { exact: true }).fill("certa-123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: "Seus dados" })).toBeVisible();
  await expect(page).toHaveURL(/\/checkout\/identificacao$/);
});

test("IDT-10 sign in with a password: a wrong one keeps the e-mail and clears the password", async ({ context, page, request }) => {
  await request.post(`${FAKE_API}/__accounts`, { data: { email: "maria@exemplo.com", password: "certa-123", details: DETAILS } });
  await openIdentification(context, page);
  await page.getByRole("button", { name: "Já tem senha? Entrar com senha" }).click();
  const email = page.getByLabel("E-mail", { exact: true });
  const password = page.getByLabel("Senha", { exact: true });
  // The browser itself trims an e-mail field; the store lowercases it before the call.
  await email.fill("Maria@Exemplo.com");
  await password.fill("errada-123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("E-mail ou senha não conferem")).toBeVisible();
  await expect(email).toHaveValue("Maria@Exemplo.com");
  await expect(password).toHaveValue("");
  await password.fill("certa-123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole("textbox", { name: "E-mail", exact: true })).toHaveValue("maria@exemplo.com");
});

test("IDT-11 Review focus 5: signed in, a new bag skips identification and pays with the account's e-mail", async ({ context, page, request }) => {
  await signUp(context, page, request, "nova@exemplo.com");
  await page.goto("/checkout/identificacao");
  await expect(page).toHaveURL(/\/checkout$/);
  await newBag(context);
  await page.goto("/sacola");
  await page.getByRole("button", { name: "Finalizar compra" }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  const email = page.getByLabel("E-mail", { exact: true });
  await expect(email).toHaveValue("nova@exemplo.com");
  await expect(email).toHaveAttribute("readonly", "");
  await expect(page.getByRole("button", { name: "Trocar e-mail" })).toHaveCount(0);
  await fillDetails(page);
  await page.getByRole("button", { name: "Ir para pagamento" }).click();
  await expect(page).toHaveURL(/\/checkout\/pagamento$/);
});

test("Review focus 1 (account): an e-mail with an account shows nothing of it before the code", async ({ context, page, request }) => {
  await request.post(`${FAKE_API}/__accounts`, { data: { email: "maria@exemplo.com", password: "antiga-123" } });
  await openIdentification(context, page);
  await askCode(page, "maria@exemplo.com", /Criar conta/);
  await expect(page.getByText("Este e-mail já tem uma conta", { exact: false })).toHaveCount(0);
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  expect(await sessionCookie(context)).toBeUndefined();
});

test("a session ended on the API sends her to the first step, once, and drops the cookie", async ({ context, page, request }) => {
  await signUp(context, page, request, "nova@exemplo.com");
  const { token } = JSON.parse(decodeURIComponent((await sessionCookie(context))!.value)) as { token: string };
  await request.post(`${FAKE_API}/__end-session?token=${token}`);
  await newBag(context);
  await page.goto("/checkout");
  await fillDetails(page);
  await page.getByRole("button", { name: "Ir para pagamento" }).click();
  await expect(page).toHaveURL(/\/checkout\/identificacao$/);
  await expect(page.getByRole("button", { name: "Receber código" })).toBeVisible();
  expect(await sessionCookie(context)).toBeUndefined();
});

// Sign up and stop on "Seus dados".
async function stopAtDetails(context: BrowserContext, page: Page, request: APIRequestContext, email: string) {
  await openIdentification(context, page);
  await askCode(page, email, /Criar conta/);
  await typeCode(page, await codeFor(request, email));
  await page.getByLabel("Crie sua senha", { exact: true }).fill("senha-segura");
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("heading", { name: "Seus dados" })).toBeVisible();
  await expect(page).toHaveURL(/\/checkout\/identificacao$/);
}

test("IDT-14 a CPF in another account: a neutral message and the WhatsApp link", async ({ context, page, request }) => {
  await request.post(`${FAKE_API}/__accounts`, { data: { email: "outra@exemplo.com", password: "outra-123", details: DETAILS } });
  await stopAtDetails(context, page, request, "nova@exemplo.com");
  await fillAccountDetails(page);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByText("Não foi possível usar este CPF.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Fale com a loja no WhatsApp" })).toHaveAttribute("href", "https://wa.me/5511900000000");
  await expect(page.getByText("outra@exemplo.com")).toHaveCount(0);
  await expect(page.getByLabel("CPF", { exact: true })).toBeFocused();
  await expect(page.getByLabel("Nome completo", { exact: true })).toHaveValue("Maria Souza");
});

test("IDT-14 Review focus 1: after a reload she is still on Seus dados, signed in", async ({ context, page, request }) => {
  await stopAtDetails(context, page, request, "nova@exemplo.com");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Seus dados" })).toBeVisible();
  await expect(page.getByLabel("Rua", { exact: true })).toHaveCount(0); // not Dados e entrega
  expect(await sessionCookie(context)).toBeDefined();
});

test("IDT-14 Review focus 2: details saved behind the screen's back go on to Dados e entrega with no message", async ({ context, page, request }) => {
  await stopAtDetails(context, page, request, "nova@exemplo.com");
  await request.post(`${FAKE_API}/__accounts`, { data: { email: "nova@exemplo.com", password: "senha-segura", details: DETAILS } });
  await fillAccountDetails(page, "111.444.777-35");
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0); // Next's route announcer is outside main
});

test("IDT-14 gate: signed in without details, Dados e entrega and the account show Seus dados", async ({ context, page, request }) => {
  await stopAtDetails(context, page, request, "nova@exemplo.com");
  await page.goto("/checkout");
  await expect(page).toHaveURL(/\/checkout\/identificacao$/);
  await expect(page.getByRole("heading", { name: "Seus dados" })).toBeVisible();
  await page.goto("/conta");
  await expect(page.getByRole("heading", { name: "Seus dados" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sair" })).toHaveCount(0);
});

test("IDT-15 Voltar from the password sign-in keeps the typed e-mail", async ({ context, page }) => {
  await openIdentification(context, page);
  await page.getByRole("button", { name: "Já tem senha? Entrar com senha" }).click();
  await page.getByLabel("E-mail", { exact: true }).fill("maria@exemplo.com");
  await page.getByRole("button", { name: "Voltar" }).click();
  await expect(page.getByRole("button", { name: "Receber código" })).toBeVisible();
  await expect(page.getByLabel("E-mail", { exact: true })).toHaveValue("maria@exemplo.com");
});
