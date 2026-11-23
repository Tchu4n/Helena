import { test, expect, type Page } from "@playwright/test";
import { get } from "node:http";
import { skipCookieBanner } from "./consent";

const JACKET = "/produto/jaqueta-sarja-verde";
const CAP = "/produto/bone-de-algodao-cru";
const FAKE_API = "http://localhost:4011";

test.beforeEach(async ({ context, request }) => {
  await skipCookieBanner(context);
  await request.post(`${FAKE_API}/__reset`);
});

function rawGet(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    get({ host: "localhost", port: 3100, path }, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => resolve(body));
    }).on("error", reject);
  });
}

const sizes = (page: Page) => page.getByRole("group", { name: "Tamanho" });

test("PRO-01 content", async ({ page }) => {
  await page.goto(JACKET);
  await expect(page.getByRole("heading", { level: 1, name: "Jaqueta sarja" })).toBeVisible();
  await expect(page.getByText("R$ 199,00").first()).toBeVisible();
  await expect(page.getByText("Verde", { exact: true })).toBeVisible();
  await expect(page.getByText("Guia de medidas")).toBeVisible();
  await expect(page.getByText("Tecido")).toBeVisible();
  await expect(page.getByText("100% algodão")).toBeVisible();
  await expect(page.getByText("Coleção")).toBeVisible();
  await expect(page.getByText("Peça de corte reto para o dia a dia.")).toBeVisible();
  for (const label of ["P", "M", "G"]) await expect(sizes(page).getByText(label, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Adicionar à sacola" })).toBeVisible();
});

test("PRO-02 installments", async ({ page }) => {
  await page.goto(JACKET);
  await expect(page.getByText("até 3x de R$ 66,33 sem juros")).toBeVisible();
  await page.goto(CAP);
  await expect(page.getByRole("heading", { level: 1, name: "Boné de algodão" })).toBeVisible();
  await expect(page.getByText("sem juros")).toHaveCount(0);
});

test("PRO-06 size guide", async ({ page }) => {
  await page.goto(JACKET);
  await page.getByText("Guia de medidas").click();
  await expect(page.getByRole("table")).toContainText("Busto (cm)");
  await expect(page).toHaveURL(JACKET);
  await page.goto(CAP);
  await expect(page.getByRole("heading", { level: 1, name: "Boné de algodão" })).toBeVisible();
  await expect(page.getByText("Guia de medidas")).toHaveCount(0);
});

test("GER-02 product screen has no tabs", async ({ page }) => {
  await page.goto(JACKET);
  await expect(page.getByRole("heading", { level: 1, name: "Jaqueta sarja" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Abas" })).toHaveCount(0);
  await expect(page.getByRole("complementary", { name: "Anúncio" })).toBeVisible();
});

test("product not found", async ({ page, request }) => {
  // With notFound() inside <Suspense> the response has already started, so the status stays 200 (not-found.md).
  for (const path of ["/produto/nao-existe", "/produto/..%2Fcarts"]) {
    await page.goto(path);
    await expect(page.getByText("Não encontramos esta página")).toBeVisible();
    expect(await page.locator('meta[name="robots"][content="noindex"]').count()).toBeGreaterThan(0);
  }
  // Browsers turn "%2E%2E" into "..", and drop it, before sending; other clients send it as is.
  for (const path of ["/produto/%2E%2E", "/produto/%2E%2E%2Fcarts"]) {
    expect(await rawGet(path)).toContain("Não encontramos esta página");
  }
  await page.goto("/produto/nao-existe");
  await expect(page.locator("main")).toHaveCount(1);
  const paths: string[] = await (await request.get(`${FAKE_API}/__requests`)).json();
  expect(paths.filter((p) => !p.startsWith("/v1/products/") && p !== "/v1/home")).toEqual([]);
});

test("GER-06 product with API down", async ({ page }) => {
  await page.goto("/produto/erro");
  const alert = page.getByRole("alert").filter({ hasText: "Tentar de novo" });
  await expect(alert).toContainText("Não foi possível concluir. Tente de novo");
  await expect(alert.getByRole("link", { name: "Tentar de novo" })).toHaveAttribute("href", "/produto/erro");
});

const addButton = (page: Page) => page.getByRole("button", { name: "Adicionar à sacola" });
const headerBag = (page: Page) => page.getByRole("banner").getByRole("link", { name: /^Sacola/ });

async function chooseSize(page: Page, label: string) {
  await sizes(page).getByText(label, { exact: true }).click();
}

test("PRO-03 sold-out size", async ({ page }) => {
  await page.goto(JACKET);
  await expect(sizes(page).getByRole("radio", { name: "P, esgotado" })).toBeAttached();
  const decoration = await sizes(page).getByText("P", { exact: true }).evaluate((el) => getComputedStyle(el).textDecorationLine);
  expect(decoration).toContain("line-through");
  await chooseSize(page, "P");
  await expect(page.getByRole("button", { name: "Esgotado" })).toBeDisabled();
  await chooseSize(page, "G");
  await expect(addButton(page)).toBeEnabled();
});

test("PRO-04 selected size", async ({ page }) => {
  await page.goto(JACKET);
  await chooseSize(page, "M");
  await expect(page.getByText("Tamanho: M")).toBeVisible();
  const border = await sizes(page).locator("label").filter({ hasText: "M" }).evaluate((el) => getComputedStyle(el).borderTopStyle);
  expect(border).toBe("double");
});

test("PRO-05 add without size", async ({ page }) => {
  await page.goto(JACKET);
  await addButton(page).click();
  await expect(page.getByText("Escolha um tamanho")).toBeVisible();
  await expect(sizes(page).getByRole("radio", { name: "M" })).toBeFocused();
  await expect(headerBag(page)).toHaveAccessibleName("Sacola");
});

test("PRO-07 add to cart", async ({ page }) => {
  await page.goto(JACKET);
  await chooseSize(page, "M");
  await addButton(page).click();
  await expect(page.getByRole("dialog", { name: "Peça adicionada à sacola" })).toBeVisible();
  await expect(headerBag(page)).toHaveAccessibleName("Sacola, 1 peça");
  await page.getByRole("button", { name: "Fechar" }).click();
  await addButton(page).click();
  await expect(headerBag(page)).toHaveAccessibleName("Sacola, 2 peças");
  await page.reload();
  await expect(headerBag(page)).toHaveAccessibleName("Sacola, 2 peças");
});

test("PRO-07 chosen size stays checked after adding", async ({ page }) => {
  await page.goto(JACKET);
  await chooseSize(page, "M");
  await addButton(page).click();
  await expect(headerBag(page)).toHaveAccessibleName("Sacola, 1 peça");
  await expect(sizes(page).getByRole("radio", { name: "M", exact: true })).toBeChecked();
});

test("PRO-07 add with the API down asks for a new cart once", async ({ page, request }) => {
  await request.post(`${FAKE_API}/__fail?path=/v1/carts`);
  await page.goto(JACKET);
  await chooseSize(page, "M");
  await addButton(page).click();
  await expect(page.getByText("Não foi possível concluir. Tente de novo")).toBeVisible();
  const paths: string[] = await (await request.get(`${FAKE_API}/__requests`)).json();
  expect(paths.filter((p) => p === "/v1/carts")).toHaveLength(1);
});

test("PRO-13 low stock", async ({ page }) => {
  await page.goto(JACKET);
  await chooseSize(page, "M");
  await expect(page.getByText("Últimas peças")).toBeVisible();
  await chooseSize(page, "G");
  await expect(page.getByText("Últimas peças")).toHaveCount(0);
});

test("PRO-14 all sold out", async ({ page }) => {
  await page.goto("/produto/camiseta-listrada-azul");
  await expect(page.getByRole("button", { name: "Esgotado" })).toBeDisabled();
});

test("double tap adds one piece", async ({ page }) => {
  await page.goto(JACKET);
  await chooseSize(page, "M");
  await addButton(page).dblclick();
  await expect(headerBag(page)).toHaveAccessibleName("Sacola, 1 peça");
  await page.reload();
  await expect(headerBag(page)).toHaveAccessibleName("Sacola, 1 peça");
});

test("stale cart cookie", async ({ page, context }) => {
  await context.addCookies([
    { name: "helena_cart", value: "00000000-0000-4000-8000-00000000dead", url: "http://localhost:3100" },
  ]);
  await page.goto(JACKET);
  await chooseSize(page, "M");
  await addButton(page).click();
  await expect(headerBag(page)).toHaveAccessibleName("Sacola, 1 peça");
});

test("PRO-07 failed add keeps the pieces already in the cart", async ({ page }) => {
  await page.goto(JACKET);
  await chooseSize(page, "M");
  await addButton(page).click();
  await expect(headerBag(page)).toHaveAccessibleName("Sacola, 1 peça");
  await page.getByRole("button", { name: "Fechar" }).click();
  // A size the API does not know also answers 404, like an unknown cart.
  await page.locator('input[name="productSizeId"]:checked').evaluate((el: HTMLInputElement) => {
    el.value = "00000000-0000-4000-8000-0000000beef0";
  });
  await addButton(page).click();
  await expect(page.getByText("Não encontrado")).toBeVisible();
  await page.reload();
  await expect(headerBag(page)).toHaveAccessibleName("Sacola, 1 peça");
});

test("PRO-07 cart lookup failing after a 404 keeps the cart", async ({ page, context, request }) => {
  await page.goto(JACKET);
  await chooseSize(page, "M");
  await addButton(page).click();
  await expect(headerBag(page)).toHaveAccessibleName("Sacola, 1 peça");
  const cartId = (await context.cookies()).find((c) => c.name === "helena_cart")!.value;
  await request.post(`${FAKE_API}/__fail?path=/v1/carts/${cartId}`);
  await page.getByRole("button", { name: "Fechar" }).click();
  await page.locator('input[name="productSizeId"]:checked').evaluate((el: HTMLInputElement) => {
    el.value = "00000000-0000-4000-8000-0000000beef0";
  });
  await addButton(page).click();
  await expect(page.getByText("Não encontrado")).toBeVisible();
  expect((await context.cookies()).find((c) => c.name === "helena_cart")!.value).toBe(cartId);
});

test("GER-01 tab count", async ({ page }) => {
  await page.goto(JACKET);
  await chooseSize(page, "M");
  await addButton(page).click();
  await expect(headerBag(page)).toHaveAccessibleName("Sacola, 1 peça");
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Abas" }).getByRole("link", { name: "Sacola, 1 peça" })).toBeVisible();
});

const restock = (page: Page) => page.getByRole("form", { name: "Avise-me quando estiver disponível" });
const notifyButton = (page: Page) => page.getByRole("button", { name: "Avise-me quando estiver disponível" });

async function openRestock(page: Page, size: string) {
  await chooseSize(page, size);
  await notifyButton(page).click();
}

test("PRO-12 notify me", async ({ page }) => {
  await page.goto(JACKET);
  await chooseSize(page, "P");
  await expect(page.getByRole("heading", { name: "Tamanho P esgotado" })).toBeVisible();
  await expect(page.getByText("Garanta sua unidade assim que o estoque voltar.")).toBeVisible();
  await expect(restock(page)).toHaveCount(0);
  await notifyButton(page).click();
  await expect(restock(page)).toBeVisible();
  await expect(restock(page).getByRole("radio", { name: "E-mail" })).toBeChecked();
  await restock(page).getByLabel("E-mail", { exact: true }).last().fill("maria@exemplo.com");
  await restock(page).getByRole("button", { name: "Avisar" }).click();
  await expect(page.getByText("Pronto! Vamos avisar quando o tamanho P estiver disponível. Usaremos seu contato só para esse aviso.")).toBeVisible();
});

test("PRO-14 notify me when all sold out", async ({ page }) => {
  await page.goto("/produto/camiseta-listrada-azul");
  await expect(page.getByRole("heading", { name: "Produto esgotado" })).toBeVisible();
  await notifyButton(page).click();
  await expect(page.getByText("Escolha o tamanho para receber o aviso.")).toBeVisible();
  await expect(sizes(page).getByRole("radio").first()).toBeFocused();
  await chooseSize(page, "M");
  await expect(restock(page)).toBeVisible();
});

test("restock too many requests", async ({ page }) => {
  await page.goto(JACKET);
  await openRestock(page, "P");
  const field = restock(page).getByRole("textbox");
  await field.fill("limite@exemplo.com");
  await restock(page).getByRole("button", { name: "Avisar" }).click();
  await expect(restock(page)).toContainText("Muitas tentativas. Aguarde um pouco e tente de novo");
  await expect(field).toHaveValue("limite@exemplo.com");
});

test("PRO-12 invalid email shows the store's message", async ({ page }) => {
  await page.goto(JACKET);
  await openRestock(page, "P");
  const field = restock(page).getByRole("textbox");
  await field.fill("maria@");
  await restock(page).getByRole("button", { name: "Avisar" }).click();
  await expect(restock(page)).toContainText("Digite um e-mail válido");
  await expect(field).toHaveValue("maria@");
});

test("restock rejected input keeps the chosen channel and what was typed", async ({ page }) => {
  await page.goto(JACKET);
  await openRestock(page, "P");
  await restock(page).getByRole("radio", { name: "WhatsApp" }).check();
  const field = restock(page).getByRole("textbox");
  // Longer than the field allows, as a paste or a post without the page script could send.
  await field.evaluate((el: HTMLInputElement) => (el.value = "9".repeat(250)));
  await restock(page).getByRole("button", { name: "Avisar" }).click();
  await expect(restock(page)).toContainText("Não foi possível concluir. Tente de novo");
  await expect(restock(page).getByRole("radio", { name: "WhatsApp" })).toBeChecked();
  await expect(restock(page).getByLabel("WhatsApp com DDD")).not.toHaveValue("");
});

test("restock invalid contact keeps what was typed", async ({ page }) => {
  await page.goto(JACKET);
  await openRestock(page, "P");
  await restock(page).getByRole("radio", { name: "WhatsApp" }).check();
  const field = restock(page).getByRole("textbox");
  await field.fill("98765");
  await restock(page).getByRole("button", { name: "Avisar" }).click();
  await expect(restock(page)).toContainText("Digite o WhatsApp com DDD, só números");
  await expect(field).toHaveValue("98765");
  await expect(restock(page).getByRole("radio", { name: "WhatsApp" })).toBeChecked();
});

const shipping = (page: Page) => page.getByRole("form", { name: "Frete e prazo" });

async function quote(page: Page, cep: string) {
  await shipping(page).getByLabel("CEP").fill(cep);
  await shipping(page).getByRole("button", { name: "Calcular" }).click();
}

test("PRO-08 shipping", async ({ page }) => {
  await page.goto(JACKET);
  await quote(page, "01310-100");
  const options = shipping(page).getByRole("list", { name: "Modalidades de entrega" });
  await expect(options).toContainText("Entrega Helena");
  await expect(options).toContainText("PAC");
  await expect(options).toContainText("Sedex");
  await expect(options).toContainText("R$ 20,00");
  await expect(options).toContainText("Chega em até 5 dias úteis");
  await page.goto(CAP);
  await expect(shipping(page).getByLabel("CEP")).toHaveValue("01310100");
});

test("PRO-09 invalid cep", async ({ page }) => {
  await page.goto(JACKET);
  for (const cep of ["0131010", "0131a100"]) {
    await quote(page, cep);
    await expect(shipping(page)).toContainText("Digite um CEP com 8 números");
    await expect(shipping(page).getByRole("list", { name: "Modalidades de entrega" })).toHaveCount(0);
  }
});

test("PRO-09 dots and hyphen are ignored", async ({ page }) => {
  await page.goto(JACKET);
  await quote(page, "01.310-100");
  await expect(shipping(page).getByRole("list", { name: "Modalidades de entrega" })).toContainText("PAC");
});

test("PRO-10 courier only in metro area", async ({ page }) => {
  await page.goto(JACKET);
  await quote(page, "69900000");
  const options = shipping(page).getByRole("list", { name: "Modalidades de entrega" });
  await expect(options).toContainText("PAC");
  await expect(options).toContainText("Sedex");
  await expect(options).not.toContainText("Entrega Helena");
});

test("PRO-11 fixed rate", async ({ page }) => {
  await page.goto(JACKET);
  await quote(page, "99999999");
  const options = shipping(page).getByRole("list", { name: "Modalidades de entrega" });
  await expect(options).toContainText("R$ 30,00");
  await expect(options).toContainText("Chega em até 10 dias úteis");
  await chooseSize(page, "M");
  await addButton(page).click();
  await expect(headerBag(page)).toHaveAccessibleName("Sacola, 1 peça");
});

test("shipping API error keeps cep and purchase", async ({ page, request }) => {
  await request.post(`${FAKE_API}/__fail?path=/v1/shipping/quotes`);
  await page.goto(JACKET);
  await quote(page, "01310-100");
  await expect(shipping(page)).toContainText("Não foi possível concluir. Tente de novo");
  await expect(shipping(page).getByLabel("CEP")).toHaveValue("01310-100");
  await chooseSize(page, "M");
  await addButton(page).click();
  await expect(headerBag(page)).toHaveAccessibleName("Sacola, 1 peça");
});

test("GER-06 shipping API failure is not shown as a field error", async ({ page, request }) => {
  await request.post(`${FAKE_API}/__fail?path=/v1/shipping/quotes`);
  await page.goto(JACKET);
  await quote(page, "01310-100");
  await expect(shipping(page).getByRole("alert")).toContainText("Não foi possível concluir. Tente de novo");
  await expect(shipping(page).getByLabel("CEP")).not.toHaveAttribute("aria-invalid", "true");
  await expect(shipping(page).getByRole("button", { name: "Tentar de novo" })).toBeVisible();
});

test.describe("narrow phone", () => {
  test.use({ viewport: { width: 360, height: 780 } });

test("shipping row stays inside the 16px gutter, also with an error", async ({ page, request }) => {
  await page.goto(JACKET);
  const right = async (name: string) => (await shipping(page).getByRole("button", { name }).boundingBox())!;
  const width = page.viewportSize()!.width;
  let box = await right("Calcular");
  expect(box.x + box.width).toBeLessThanOrEqual(width - 16);
  await request.post(`${FAKE_API}/__fail?path=/v1/shipping/quotes`);
  await quote(page, "01310100");
  box = await right("Tentar de novo");
  expect(box.x + box.width).toBeLessThanOrEqual(width - 16);
  expect(box.height).toBeLessThanOrEqual(56);
});
});

// VIT-06: an Instagram ad link opens its own screen, with no home page or sign-up in between.
test("VIT-06 a product or category link from an ad lands right on that screen", async ({ page }) => {
  await page.goto(JACKET);
  await expect(page).toHaveURL(JACKET);
  await expect(page.getByRole("heading", { level: 1, name: "Jaqueta sarja" })).toBeVisible();
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await page.goto("/catalogo?categoria=jaquetas");
  await expect(page).toHaveURL("/catalogo?categoria=jaquetas");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
});
