import { test, expect, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";
import { skipCookieBanner } from "./consent";
import { FAKE_API } from "./order-helpers";

test.beforeEach(async ({ context, request }) => {
  await skipCookieBanner(context);
  await request.post(`${FAKE_API}/__reset`);
});

const DETAILS = { name: "Maria Souza", cpf: "52998224725", phone: "11987654321" };
const EMAIL_ACCEPTED = { channel: "email", accepted: true, textVersion: "2026-11", ip: "203.0.113.7", recordedAt: "2026-11-20T15:00:00Z" };
const today = () => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date());

// Signed in with details: a session started on the fake API with a password, as the store would (see performance.spec.ts).
async function signIn(context: BrowserContext, request: APIRequestContext, consents: object[] = [EMAIL_ACCEPTED]): Promise<string> {
  await request.post(`${FAKE_API}/__accounts`, { data: { email: "maria@exemplo.com", password: "certa-123", details: DETAILS, consents } });
  const session = await (await request.post(`${FAKE_API}/v1/sessions`, { data: { email: "maria@exemplo.com", password: "certa-123" } })).json();
  const value = JSON.stringify({ token: session.token, email: "maria@exemplo.com", detailsComplete: true, expiresAt: session.expiresAt });
  await context.addCookies([{ name: "helena_session", value: encodeURIComponent(value), url: "http://localhost:3100" }]);
  return session.token;
}

async function open(page: Page) {
  await page.goto("/conta/privacidade");
  await expect(page.getByRole("heading", { level: 1, name: "Privacidade" })).toBeVisible();
}

const box = (page: Page, channel: "e-mail" | "WhatsApp") => page.getByRole("checkbox", { name: `Quero receber novidades por ${channel}` });
const history = async (request: APIRequestContext) =>
  (await (await request.get(`${FAKE_API}/__consents?email=maria@exemplo.com`)).json()) as { channel: string; accepted: boolean; textVersion: string; ip: string | null }[];

test("CTA-08 each channel with its state and date, the order messages line and the cookies link", async ({ context, page, request }) => {
  await signIn(context, request);
  await open(page);
  await expect(box(page, "e-mail")).toBeChecked();
  await expect(page.getByText("Aceito em 20/11/2026")).toBeVisible();
  await expect(box(page, "WhatsApp")).not.toBeChecked();
  await expect(page.getByText("Nunca aceito")).toBeVisible();
  await expect(page.getByText("As mensagens dos seus pedidos continuam chegando.")).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "Preferências de cookies" })).toHaveAttribute("href", "/cookies");
});

test("CTA-08 review focus 1, 2: unchecking e-mail revokes only e-mail, recorded with the text version and IP", async ({ context, page, request }) => {
  await signIn(context, request);
  await open(page);
  await box(page, "e-mail").uncheck();
  await expect(page.getByRole("status")).toHaveText("Preferência salva");
  await expect(page.getByText(`Cancelado em ${today()}`)).toBeVisible();
  await expect(box(page, "e-mail")).not.toBeChecked();
  await expect(page.getByText("Nunca aceito")).toBeVisible();
  const rows = await history(request);
  expect(rows.filter((r) => r.channel === "whatsapp")).toHaveLength(0);
  const last = rows.at(-1)!;
  expect(last).toMatchObject({ channel: "email", accepted: false, textVersion: "2026-11" });
  expect(last.ip).toBeTruthy();
});

test("CTA-08 checking WhatsApp accepts it", async ({ context, page, request }) => {
  await signIn(context, request);
  await open(page);
  await box(page, "WhatsApp").check();
  await expect(page.getByRole("status")).toHaveText("Preferência salva");
  await expect(box(page, "WhatsApp")).toBeChecked();
  await expect(page.getByText(`Aceito em ${today()}`)).toBeVisible();
  await expect(box(page, "e-mail")).toBeChecked();
});

test("CTA-08 review focus 2: a failed change shows the error and the box keeps the API's state", async ({ context, page, request }) => {
  await signIn(context, request);
  await open(page);
  await request.post(`${FAKE_API}/__fail?path=/v1/account/consents/email`);
  await box(page, "e-mail").uncheck();
  await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
  await expect(box(page, "e-mail")).toBeChecked();
  await page.reload();
  await expect(box(page, "e-mail")).toBeChecked();
  await expect(page.getByText("Aceito em 20/11/2026")).toBeVisible();
});

test("CTA-08 every box row and the link are at least 48px tall", async ({ context, page, request }) => {
  await signIn(context, request);
  await open(page);
  for (const target of [
    page.locator("label").filter({ has: box(page, "e-mail") }),
    page.locator("label").filter({ has: box(page, "WhatsApp") }),
    page.getByRole("main").getByRole("link", { name: "Preferências de cookies" }),
  ]) {
    expect((await target.boundingBox())!.height).toBeGreaterThanOrEqual(48);
  }
});

test("CTA-08 signed out: /conta/privacidade goes to /conta", async ({ page }) => {
  await page.goto("/conta/privacidade");
  await expect(page).toHaveURL(/\/conta$/);
  await expect(page.getByRole("button", { name: "Receber código" })).toBeVisible();
});

// CTA-09: my data.
const requests = async (request: APIRequestContext) =>
  (await (await request.get(`${FAKE_API}/__data-requests?email=maria@exemplo.com`)).json()) as { type: string; status: string }[];
const myData = (page: Page) => page.getByRole("region", { name: "Meus dados" });
const confirmation = (page: Page) => page.getByRole("group", { name: "Excluir minha conta?" });

test("CTA-09 a copy goes to the account's e-mail; she stays signed in", async ({ context, page, request }) => {
  await signIn(context, request);
  await open(page);
  await expect(myData(page)).toContainText("Você pode pedir uma cópia dos seus dados ou a exclusão da sua conta.");
  await expect(myData(page)).toContainText("Os dados das notas fiscais ficam guardados pelo prazo que a lei exige.");
  await myData(page).getByRole("button", { name: "Pedir cópia dos meus dados" }).click();
  await expect(page.getByRole("status")).toHaveText("Pedido registrado. Enviaremos a cópia para maria@exemplo.com em até 15 dias.");
  await expect(page).toHaveURL(/\/conta\/privacidade$/);
  expect(await requests(request)).toEqual([expect.objectContaining({ type: "copy", status: "open" })]);
});

test("CTA-09 review focus 5: the confirmation asks first; Cancelar sends nothing", async ({ context, page, request }) => {
  await signIn(context, request);
  await open(page);
  await myData(page).getByRole("button", { name: "Excluir minha conta" }).click();
  await expect(confirmation(page)).toContainText("Nossa equipe exclui sua conta em até 15 dias. Você sai da conta agora, em todos os aparelhos.");
  await expect(confirmation(page)).toContainText("Se entrar de novo antes disso, o pedido é cancelado.");
  const remove = confirmation(page).getByRole("button", { name: "Excluir", exact: true });
  const cancel = confirmation(page).getByRole("button", { name: "Cancelar" });
  const [r, c] = [(await remove.boundingBox())!, (await cancel.boundingBox())!];
  expect([r.width, r.height]).toEqual([c.width, c.height]);
  const background = (l: typeof remove) => l.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(await background(remove)).toBe(await background(cancel));
  await cancel.click();
  await expect(confirmation(page)).toHaveCount(0);
  expect(await requests(request)).toEqual([]);
});

test("CTA-09 review focus 3: deletion signs her out on every device", async ({ browser, context, page, request }) => {
  await signIn(context, request);
  const other = await browser.newContext();
  await skipCookieBanner(other);
  const token = (await (await request.post(`${FAKE_API}/v1/sessions`, { data: { email: "maria@exemplo.com", password: "certa-123" } })).json()).token;
  const value = JSON.stringify({ token, email: "maria@exemplo.com", detailsComplete: true, expiresAt: new Date(Date.now() + 86_400_000).toISOString() });
  await other.addCookies([{ name: "helena_session", value: encodeURIComponent(value), url: "http://localhost:3100" }]);
  await open(page);
  await myData(page).getByRole("button", { name: "Excluir minha conta" }).click();
  await confirmation(page).getByRole("button", { name: "Excluir", exact: true }).click();
  await expect(page).toHaveURL(/\/conta\?exclusao=pedida$/);
  await expect(page.getByRole("status").first()).toHaveText("Pedido de exclusão registrado. Você saiu da conta em todos os aparelhos.");
  await expect(page.getByRole("button", { name: "Receber código" })).toBeVisible();
  expect(await requests(request)).toEqual([expect.objectContaining({ type: "deletion", status: "open" })]);
  const otherPage = await other.newPage();
  await otherPage.goto("/conta/privacidade");
  await expect(otherPage).toHaveURL(/\/conta$/);
  await other.close();
});

async function requestDeletion(page: Page) {
  await open(page);
  await myData(page).getByRole("button", { name: "Excluir minha conta" }).click();
  await confirmation(page).getByRole("button", { name: "Excluir", exact: true }).click();
  await expect(page).toHaveURL(/exclusao=pedida/);
}

const CANCELLED = "Seu pedido de exclusão foi cancelado porque você entrou de novo.";

test("CTA-09 review focus 4: signing in again with the password cancels it, said once", async ({ context, page, request }) => {
  await signIn(context, request);
  await requestDeletion(page);
  await page.goto("/conta");
  await page.getByRole("button", { name: "Já tem senha? Entrar com senha" }).click();
  await page.getByRole("textbox", { name: "E-mail", exact: true }).fill("maria@exemplo.com");
  await page.getByLabel("Senha", { exact: true }).fill("certa-123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/conta\?exclusao=cancelada$/);
  await expect(page.getByText(CANCELLED)).toBeVisible();
  await expect(page.getByRole("button", { name: "Sair" })).toBeVisible();
  expect(await requests(request)).toEqual([expect.objectContaining({ type: "deletion", status: "cancelled" })]);
  await page.goto("/conta");
  await expect(page.getByText(CANCELLED)).toHaveCount(0);
});

test("CTA-09 review focus 4: signing in again with the code cancels it too", async ({ context, page, request }) => {
  await signIn(context, request);
  await requestDeletion(page);
  await page.goto("/conta");
  await page.getByRole("textbox", { name: "E-mail", exact: true }).fill("maria@exemplo.com");
  await page.getByRole("button", { name: "Receber código" }).click();
  const { code } = await (await request.get(`${FAKE_API}/__codes?email=maria@exemplo.com`)).json();
  await page.getByLabel("Código", { exact: true }).fill(code);
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByText(CANCELLED)).toBeVisible();
  expect(await requests(request)).toEqual([expect.objectContaining({ type: "deletion", status: "cancelled" })]);
});

test("CTA-09 an unknown exclusao value shows nothing", async ({ page }) => {
  await page.goto("/conta?exclusao=qualquer");
  await expect(page.getByRole("button", { name: "Receber código" })).toBeVisible();
  await expect(page.getByText(/Pedido de exclusão|exclusão foi cancelado/)).toHaveCount(0);
});
