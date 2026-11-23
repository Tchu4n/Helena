import { test, expect, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";
import { skipCookieBanner } from "./consent";
import { FAKE_API } from "./order-helpers";

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
