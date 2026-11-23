import { test, expect, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";
import { skipCookieBanner } from "./consent";
import { FAKE_API, JACKET_M, paths, startPayment, VALID } from "./order-helpers";

test.beforeEach(async ({ context, request }) => {
  await skipCookieBanner(context);
  await request.post(`${FAKE_API}/__reset`);
});

const codeFor = async (request: APIRequestContext, email: string) =>
  ((await (await request.get(`${FAKE_API}/__codes?email=${encodeURIComponent(email)}`)).json()) as { code: string }).code;

const sessionCookie = async (context: BrowserContext) => (await context.cookies()).find((c) => c.name === "helena_session");

const DETAILS = { name: "Maria Souza", cpf: "52998224725", phone: "11987654321" };

// CTA-01: the code always signs in at /conta, here into an account that already has its details.
async function signIn(page: Page, request: APIRequestContext, email: string) {
  await request.post(`${FAKE_API}/__accounts`, { data: { email, details: DETAILS } });
  await page.goto("/conta");
  await page.getByRole("textbox", { name: "E-mail", exact: true }).fill(email);
  await page.getByRole("button", { name: "Receber código" }).click();
  await expect(page.getByText(`Enviamos um código para ${email}`)).toBeVisible();
  await page.getByLabel("Código", { exact: true }).fill(await codeFor(request, email));
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByRole("button", { name: "Sair" })).toBeVisible();
}

test("CTA-01 the Conta tab signs in with a code, no way to choose", async ({ page, request }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Conta" }).click();
  await expect(page).toHaveURL(/\/conta$/);
  await expect(page.getByRole("heading", { level: 1, name: "Minha conta" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "E-mail", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Receber código" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Já tem senha? Entrar com senha" })).toBeVisible();
  await expect(page.getByRole("radiogroup")).toHaveCount(0);
  // A new e-mail goes through the full sign-up: "Crie sua senha", then "Seus dados" (IDT-14).
  await page.getByRole("textbox", { name: "E-mail", exact: true }).fill("nova@exemplo.com");
  await page.getByRole("button", { name: "Receber código" }).click();
  await expect(page.getByText("Enviamos um código para nova@exemplo.com")).toBeVisible();
  await page.getByLabel("Código", { exact: true }).fill(await codeFor(request, "nova@exemplo.com"));
  await page.getByRole("button", { name: "Confirmar" }).click();
  await page.getByLabel("Crie sua senha", { exact: true }).fill("senha-segura");
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("heading", { name: "Seus dados" })).toBeVisible();
  await page.getByLabel("Nome completo", { exact: true }).fill("Maria Souza");
  await page.getByLabel("CPF", { exact: true }).fill("529.982.247-25");
  await page.getByLabel("Celular", { exact: true }).fill("(11) 98765-4321");
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page).toHaveURL(/\/conta$/);
  await expect(page.getByRole("button", { name: "Sair" })).toBeVisible();
});

test("CTA-01 sign in with a password at /conta", async ({ page, request }) => {
  await request.post(`${FAKE_API}/__accounts`, { data: { email: "maria@exemplo.com", password: "certa-123", details: DETAILS } });
  await page.goto("/conta");
  await page.getByRole("button", { name: "Já tem senha? Entrar com senha" }).click();
  await page.getByRole("textbox", { name: "E-mail", exact: true }).fill("maria@exemplo.com");
  await page.getByLabel("Senha", { exact: true }).fill("certa-123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/conta$/);
  await expect(page.getByRole("button", { name: "Sair" })).toBeVisible();
});

test("CTA-02 signed in: the four sections, the e-mail and Sair, each 48px tall", async ({ page, request }) => {
  await signIn(page, request, "maria@exemplo.com");
  await expect(page.getByText("maria@exemplo.com")).toBeVisible();
  for (const [name, href] of [
    ["Meus pedidos", "/conta/pedidos"],
    ["Meus endereços", "/conta/enderecos"],
    ["Dados pessoais", "/conta/dados"],
    ["Privacidade", "/conta/privacidade"],
  ]) {
    const link = page.getByRole("main").getByRole("link", { name });
    await expect(link).toHaveAttribute("href", href);
    expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(48);
  }
  expect((await page.getByRole("button", { name: "Sair" }).boundingBox())!.height).toBeGreaterThanOrEqual(48);
});

test("CTA-10 Sair ends the session on the API and asks for identification again", async ({ context, page, request }) => {
  await signIn(page, request, "maria@exemplo.com");
  const { token } = JSON.parse(decodeURIComponent((await sessionCookie(context))!.value)) as { token: string };
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/conta$/);
  await expect(page.getByRole("button", { name: "Receber código" })).toBeVisible();
  expect(await sessionCookie(context)).toBeUndefined();
  const sent = (await (await request.get(`${FAKE_API}/__requests`)).json()) as string[];
  expect(sent).toContain("/v1/sessions/current");
  const old = await request.put(`${FAKE_API}/v1/account/password`, { data: { password: "qualquer-1" }, headers: { Authorization: `Bearer ${token}` } });
  expect(old.status()).toBe(401);
});

test("a tampered session cookie is treated as signed out", async ({ context, page }) => {
  await context.addCookies([{ name: "helena_session", value: "nao-e-json", url: "http://localhost:3100" }]);
  await page.goto("/conta");
  await expect(page.getByRole("button", { name: "Receber código" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sair" })).toHaveCount(0);
});

// CTA-03: a purchase through the screens, signed in (name, CPF and phone come from the account).
async function buySignedIn(context: BrowserContext, page: Page, request: APIRequestContext): Promise<string> {
  const { id } = await (await context.request.post(`${FAKE_API}/__carts`, { data: { lines: [{ productSizeId: JACKET_M }] } })).json();
  await context.addCookies([{ name: "helena_cart", value: id, url: "http://localhost:3100" }]);
  await page.goto("/checkout");
  for (const [label, value] of VALID.slice(3)) await page.getByLabel(label, { exact: true }).fill(value);
  await expect(page.getByRole("radio", { name: /PAC/ })).toBeChecked();
  await page.getByRole("button", { name: "Ir para pagamento" }).click();
  await expect(page).toHaveURL(/\/checkout\/pagamento$/);
  return (await paths(request)).findLast((p) => /^\/v1\/orders\/HL-\d+$/.test(p))!.split("/").pop()!;
}

const today = () => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date());

test("CTA-03 Meus pedidos: newest first with number, date, total and state; an order opens with its address", async ({ context, page, request }) => {
  await signIn(page, request, "maria@exemplo.com");
  const first = await buySignedIn(context, page, request);
  const second = await buySignedIn(context, page, request);
  await page.goto("/conta/pedidos");
  await expect(page.getByRole("heading", { level: 1, name: "Meus pedidos" })).toBeVisible();
  const orders = page.getByRole("main").getByRole("link", { name: /HL-/ });
  await expect(orders).toHaveCount(2);
  await expect(orders.nth(0)).toContainText(second);
  await expect(orders.nth(1)).toContainText(first);
  for (const text of [today(), "R$ 219,00", "Aguardando pagamento"]) await expect(orders.nth(0)).toContainText(text);
  expect((await orders.nth(0).boundingBox())!.height).toBeGreaterThanOrEqual(48);
  await orders.nth(1).click();
  await expect(page).toHaveURL(new RegExp(`/pedido/${first}$`));
  await expect(page.getByText("Avenida Paulista, 1000")).toBeVisible();
});

test("CTA-04 no orders: the message and Ver novidades", async ({ page, request }) => {
  await signIn(page, request, "maria@exemplo.com");
  await page.goto("/conta/pedidos");
  await expect(page.getByText("Você ainda não tem pedidos")).toBeVisible();
  await page.getByRole("link", { name: "Ver novidades" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("CTA-11 someone else's order: the same lookup form as a number that doesn't exist", async ({ browser, page, request }) => {
  const maria = await browser.newContext();
  await skipCookieBanner(maria);
  const number = await startPayment(maria, await maria.newPage(), request);
  await maria.close();
  await signIn(page, request, "ana@exemplo.com");
  await page.goto(`/pedido/${number}`);
  await expect(page.getByRole("button", { name: "Ver pedido" })).toBeVisible();
  await expect(page.getByText("Avenida Paulista")).toHaveCount(0);
});

test("Review focus 4: an order followed by the lookup still shows, without the address, when signed in as someone else", async ({ context, page, request }) => {
  const number = await startPayment(context, page, request);
  await context.clearCookies({ name: "helena_order" });
  await page.goto(`/pedido/${number}`);
  await page.getByLabel("E-mail").fill("maria@exemplo.com");
  await page.getByRole("button", { name: "Ver pedido" }).click();
  await expect(page.getByRole("heading", { name: "Acompanhar pedido" })).toBeVisible();
  await signIn(page, request, "ana@exemplo.com");
  await page.goto(`/pedido/${number}`);
  await expect(page.getByRole("heading", { name: "Acompanhar pedido" })).toBeVisible();
  await expect(page.getByText("Avenida Paulista")).toHaveCount(0);
});

test("signed out, Meus pedidos asks for identification", async ({ page }) => {
  await page.goto("/conta/pedidos");
  await expect(page.getByRole("button", { name: "Receber código" })).toBeVisible();
});
