import { test, expect, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";
import { skipCookieBanner } from "./consent";
import { FAKE_API, JACKET_M, VALID } from "./order-helpers";

test.beforeEach(async ({ context, request }) => {
  await skipCookieBanner(context);
  await request.post(`${FAKE_API}/__reset`);
});

const DETAILS = { name: "Maria Souza", cpf: "52998224725", phone: "11987654321" };
const PAULISTA = { cep: "01310100", street: "Avenida Paulista", number: "1000", complement: null, neighborhood: "Bela Vista", city: "São Paulo", state: "SP" };

// Signed in with details: a session started on the fake API with a password, as the store would (see performance.spec.ts).
async function signIn(context: BrowserContext, request: APIRequestContext, addresses: object[] = []): Promise<string> {
  await request.post(`${FAKE_API}/__accounts`, { data: { email: "maria@exemplo.com", password: "certa-123", details: DETAILS, addresses } });
  const session = await (await request.post(`${FAKE_API}/v1/sessions`, { data: { email: "maria@exemplo.com", password: "certa-123" } })).json();
  const value = JSON.stringify({ token: session.token, email: "maria@exemplo.com", detailsComplete: true, expiresAt: session.expiresAt });
  await context.addCookies([{ name: "helena_session", value: encodeURIComponent(value), url: "http://localhost:3100" }]);
  return session.token;
}

async function open(page: Page) {
  await page.goto("/conta/enderecos");
  await expect(page.getByRole("heading", { level: 1, name: "Meus endereços" })).toBeVisible();
}

async function fillAddress(page: Page, values: { cep: string; street: string; number: string }) {
  await page.getByLabel("CEP", { exact: true }).fill(values.cep);
  await page.getByLabel("Rua", { exact: true }).fill(values.street);
  await page.getByLabel("Número", { exact: true }).fill(values.number);
  await page.getByLabel("Bairro", { exact: true }).fill("Bela Vista");
  await page.getByLabel("Cidade", { exact: true }).fill("São Paulo");
  await page.getByLabel("UF", { exact: true }).fill("SP");
}

const card = (page: Page, text: string) => page.getByRole("listitem").filter({ hasText: text });

test("CTA-05 with no address: the empty text and Adicionar endereço", async ({ context, page, request }) => {
  await signIn(context, request);
  await open(page);
  await expect(page.getByText("Você ainda não tem endereços salvos")).toBeVisible();
  await expect(page.getByRole("button", { name: "Adicionar endereço" })).toBeVisible();
});

test("CTA-05 add with the checkout's fields; the first address becomes the favorite", async ({ context, page, request }) => {
  await signIn(context, request);
  await open(page);
  await page.getByRole("button", { name: "Adicionar endereço" }).click();
  await page.getByRole("button", { name: "Salvar endereço" }).click();
  await expect(page.getByLabel("CEP", { exact: true })).toBeFocused();
  await expect(page.getByText("Campo obrigatório").first()).toBeVisible();
  await fillAddress(page, { cep: "01310-100", street: "Avenida Paulista", number: "1000" });
  await page.getByRole("button", { name: "Salvar endereço" }).click();
  await expect(page.getByRole("status")).toHaveText("Endereço salvo");
  const saved = card(page, "Avenida Paulista, 1000");
  await expect(saved).toBeVisible();
  await expect(saved.getByText("Favorito", { exact: true })).toBeVisible();
  await expect(saved.getByText("CEP 01310-100")).toBeVisible();
});

test("CTA-05 Editar opens the form filled in and saves the change", async ({ context, page, request }) => {
  await signIn(context, request, [PAULISTA]);
  await open(page);
  await card(page, "Avenida Paulista, 1000").getByRole("button", { name: "Editar" }).click();
  await expect(page.getByLabel("Rua", { exact: true })).toHaveValue("Avenida Paulista");
  await page.getByLabel("Número", { exact: true }).fill("2000");
  await page.getByRole("button", { name: "Salvar endereço" }).click();
  await expect(page.getByRole("status")).toHaveText("Endereço salvo");
  await expect(card(page, "Avenida Paulista, 2000")).toBeVisible();
  await expect(card(page, "Avenida Paulista, 1000")).toHaveCount(0);
});

test("CTA-05 Tornar favorito moves the favorite, and it comes first", async ({ context, page, request }) => {
  await signIn(context, request, [PAULISTA]);
  await open(page);
  await page.getByRole("button", { name: "Adicionar endereço" }).click();
  await fillAddress(page, { cep: "04538133", street: "Rua Funchal", number: "200" });
  await page.getByRole("button", { name: "Salvar endereço" }).click();
  await expect(page.getByRole("status")).toHaveText("Endereço salvo");
  await expect(card(page, "Rua Funchal, 200").getByText("Favorito", { exact: true })).toHaveCount(0);
  await card(page, "Rua Funchal, 200").getByRole("button", { name: "Tornar favorito" }).click();
  await expect(page.getByRole("status")).toHaveText("Endereço favorito atualizado");
  await expect(page.getByRole("listitem").first()).toContainText("Rua Funchal, 200");
  await expect(card(page, "Rua Funchal, 200").getByText("Favorito", { exact: true })).toBeVisible();
  await expect(card(page, "Avenida Paulista, 1000").getByRole("button", { name: "Tornar favorito" })).toBeVisible();
});

test("CTA-05 removing the favorite passes it on; removing the last one shows the empty text", async ({ context, page, request }) => {
  await signIn(context, request, [
    { ...PAULISTA, favorite: true },
    { ...PAULISTA, street: "Rua Funchal", number: "200", cep: "04538133" },
  ]);
  await open(page);
  // Cancelar keeps the address.
  await card(page, "Avenida Paulista, 1000").getByRole("button", { name: "Remover" }).click();
  await expect(page.getByText("Remover este endereço?")).toBeVisible();
  const confirmButtons = page.getByRole("listitem").filter({ hasText: "Remover este endereço?" });
  const remove = (await confirmButtons.getByRole("button", { name: "Remover" }).boundingBox())!;
  const cancel = (await confirmButtons.getByRole("button", { name: "Cancelar" }).boundingBox())!;
  expect(remove.height).toBe(cancel.height);
  await confirmButtons.getByRole("button", { name: "Cancelar" }).click();
  await expect(card(page, "Avenida Paulista, 1000")).toBeVisible();
  // Removing the favorite: the newest remaining one becomes it (review focus 1).
  await card(page, "Avenida Paulista, 1000").getByRole("button", { name: "Remover" }).click();
  await page.getByRole("listitem").filter({ hasText: "Remover este endereço?" }).getByRole("button", { name: "Remover" }).click();
  await expect(page.getByRole("status")).toHaveText("Endereço removido");
  await expect(card(page, "Avenida Paulista, 1000")).toHaveCount(0);
  await expect(card(page, "Rua Funchal, 200").getByText("Favorito", { exact: true })).toBeVisible();
  await card(page, "Rua Funchal, 200").getByRole("button", { name: "Remover" }).click();
  await page.getByRole("listitem").filter({ hasText: "Remover este endereço?" }).getByRole("button", { name: "Remover" }).click();
  await expect(page.getByText("Você ainda não tem endereços salvos")).toBeVisible();
});

test("CTA-05 at 10 addresses the limit line replaces Adicionar endereço", async ({ context, page, request }) => {
  await signIn(context, request, Array.from({ length: 10 }, (_, i) => ({ ...PAULISTA, number: String(100 + i) })));
  await open(page);
  await expect(page.getByText("Você chegou ao limite de 10 endereços. Remova um para adicionar outro.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Adicionar endereço" })).toHaveCount(0);
});

test("CTA-11 someone else's address: not found, her list unchanged", async ({ context, page, request }) => {
  const OTHERS = "0b7c5d1e-3f2a-4c8b-9e6d-1a2b3c4d5e6f";
  await request.post(`${FAKE_API}/__accounts`, { data: { email: "outra@exemplo.com", password: "outra-123", details: DETAILS, addresses: [{ ...PAULISTA, id: OTHERS, street: "Rua Alheia" }] } });
  await signIn(context, request, [PAULISTA]);
  await open(page);
  await card(page, "Avenida Paulista, 1000").getByRole("button", { name: "Remover" }).click();
  const confirm = page.getByRole("listitem").filter({ hasText: "Remover este endereço?" });
  await confirm.locator('input[name="id"]').evaluate((input, id) => ((input as HTMLInputElement).value = id), OTHERS);
  await confirm.getByRole("button", { name: "Remover" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Endereço não encontrado");
  await expect(card(page, "Avenida Paulista, 1000")).toBeVisible();
  // The other account's address is still there too.
  const session = await (await request.post(`${FAKE_API}/v1/sessions`, { data: { email: "outra@exemplo.com", password: "outra-123" } })).json();
  const theirs = await (await request.get(`${FAKE_API}/v1/account/addresses`, { headers: { authorization: `Bearer ${session.token}` } })).json();
  expect(theirs).toHaveLength(1);
});

test("CTA-05 every button in the list is at least 48px tall", async ({ context, page, request }) => {
  await signIn(context, request, [{ ...PAULISTA, favorite: true }, { ...PAULISTA, number: "2000" }]);
  await open(page);
  for (const button of await page.getByRole("main").getByRole("button").all()) {
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(48);
  }
});

test("CTA-05 signed out: /conta/enderecos goes to /conta", async ({ page }) => {
  await page.goto("/conta/enderecos");
  await expect(page).toHaveURL(/\/conta$/);
  await expect(page.getByRole("button", { name: "Receber código" })).toBeVisible();
});

// CTA-12: a bag at CEP 01310-100 with PAC chosen, and /checkout open.
const RIO_BRANCO = { cep: "69900000", street: "Rua Acre", number: "50", complement: null, neighborhood: "Centro", city: "Rio Branco", state: "AC", favorite: true };

async function openCheckout(context: BrowserContext, page: Page): Promise<string> {
  const response = await context.request.post(`${FAKE_API}/__carts`, {
    data: { lines: [{ productSizeId: JACKET_M }], cep: "01310100", chosen: "pac", verifiedEmail: "maria@exemplo.com" },
  });
  const { id } = await response.json();
  await context.addCookies([{ name: "helena_cart", value: id, url: "http://localhost:3100" }]);
  await page.goto("/checkout");
  return id;
}

const myAddresses = async (request: APIRequestContext, token: string) =>
  (await (await request.get(`${FAKE_API}/v1/account/addresses`, { headers: { authorization: `Bearer ${token}` } })).json()) as { number: string; cep: string }[];

const savedChoices = (page: Page) => page.getByRole("radiogroup", { name: "Seus endereços" });

test("CTA-12 signed in: Seus endereços as choices, favorite first, none chosen, fields empty", async ({ context, page, request }) => {
  await signIn(context, request, [PAULISTA, RIO_BRANCO]);
  await openCheckout(context, page);
  const choices = savedChoices(page).getByRole("radio");
  await expect(choices).toHaveCount(2);
  await expect(choices.first()).toHaveAccessibleName(/Favorito.*Rua Acre, 50/);
  for (const choice of await choices.all()) await expect(choice).not.toBeChecked();
  await expect(page.getByLabel("CEP", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Rua", { exact: true })).toHaveValue("");
  await expect(page.getByText("O frete mudou com o novo CEP")).toHaveCount(0);
  await expect(page.getByRole("checkbox", { name: "Salvar este endereço na minha conta" })).toBeChecked();
});

test("CTA-12 review focus 2: a saved address with another CEP recalculates the shipping only after the tap", async ({ context, page, request }) => {
  await signIn(context, request, [PAULISTA, RIO_BRANCO]);
  await openCheckout(context, page);
  await savedChoices(page).getByRole("radio", { name: /Rua Acre, 50/ }).check();
  await expect(page.getByLabel("CEP", { exact: true })).toHaveValue("69900000");
  await expect(page.getByLabel("Rua", { exact: true })).toHaveValue("Rua Acre");
  await expect(page.getByLabel("Cidade", { exact: true })).toHaveValue("Rio Branco");
  await expect(page.getByText("O frete mudou com o novo CEP")).toBeVisible();
  await expect(page.getByRole("radio", { name: /PAC.*12 dias/ })).toBeVisible();
});

test("CTA-12 review focus 3: editing after the tap clears the choice; the edited address is saved once", async ({ context, page, request }) => {
  const token = await signIn(context, request, [PAULISTA, RIO_BRANCO]);
  const cartId = await openCheckout(context, page);
  await savedChoices(page).getByRole("radio", { name: /Avenida Paulista, 1000/ }).check();
  await expect(page.getByRole("radio", { name: /PAC/ })).toBeChecked();
  await page.getByLabel("Número", { exact: true }).fill("2000");
  for (const choice of await savedChoices(page).getByRole("radio").all()) await expect(choice).not.toBeChecked();
  await page.getByRole("button", { name: "Ir para pagamento" }).click();
  await expect(page).toHaveURL(/\/checkout\/pagamento$/);
  const customer = await (await request.get(`${FAKE_API}/__customer?cartId=${cartId}`)).json();
  expect(customer.address.number).toBe("2000");
  const numbers = (await myAddresses(request, token)).map((a) => a.number).sort();
  expect(numbers).toEqual(["1000", "2000", "50"]);
  // CHK-05: the lead save never sends the box; only "Ir para pagamento" does.
  const bodies = (await (await request.get(`${FAKE_API}/__customer-bodies`)).json()) as { saveAddress?: boolean }[];
  expect(bodies.at(-1)!.saveAddress).toBe(true);
  for (const body of bodies.slice(0, -1)) expect(body).not.toHaveProperty("saveAddress");
});

test("CTA-12 the box unchecked: the account's addresses stay as they were", async ({ context, page, request }) => {
  const token = await signIn(context, request, [RIO_BRANCO]);
  await openCheckout(context, page);
  for (const [label, value] of VALID.slice(3)) await page.getByLabel(label, { exact: true }).fill(value);
  await expect(page.getByRole("radio", { name: /PAC/ })).toBeChecked();
  await page.getByRole("checkbox", { name: "Salvar este endereço na minha conta" }).uncheck();
  await page.getByRole("button", { name: "Ir para pagamento" }).click();
  await expect(page).toHaveURL(/\/checkout\/pagamento$/);
  expect(await myAddresses(request, token)).toHaveLength(1);
});

test("CTA-12 at 10 addresses the box is skipped and the purchase goes on", async ({ context, page, request }) => {
  const token = await signIn(context, request, Array.from({ length: 10 }, (_, i) => ({ ...PAULISTA, number: String(100 + i) })));
  await openCheckout(context, page);
  for (const [label, value] of VALID.slice(3)) await page.getByLabel(label, { exact: true }).fill(value);
  await expect(page.getByRole("radio", { name: /PAC/ })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Salvar este endereço na minha conta" })).toBeChecked();
  await page.getByRole("button", { name: "Ir para pagamento" }).click();
  await expect(page).toHaveURL(/\/checkout\/pagamento$/);
  expect(await myAddresses(request, token)).toHaveLength(10);
});

test("CTA-12 a guest sees neither the saved addresses nor the box", async ({ context, page }) => {
  await openCheckout(context, page);
  await expect(page.getByLabel("Nome completo", { exact: true })).toBeEditable();
  await expect(savedChoices(page)).toHaveCount(0);
  await expect(page.getByRole("checkbox", { name: "Salvar este endereço na minha conta" })).toHaveCount(0);
});
