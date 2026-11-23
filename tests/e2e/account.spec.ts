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

// CTA-01: the code always signs in at /conta; a new e-mail gets a new, empty account.
async function signIn(page: Page, request: APIRequestContext, email: string) {
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
  await signIn(page, request, "nova@exemplo.com");
  await expect(page).toHaveURL(/\/conta$/);
  await expect(page.getByLabel("Crie sua senha", { exact: true })).toHaveCount(0); // the password comes with Dados pessoais
});

test("CTA-01 sign in with a password at /conta", async ({ page, request }) => {
  await request.post(`${FAKE_API}/__accounts`, { data: { email: "maria@exemplo.com", password: "certa-123" } });
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
