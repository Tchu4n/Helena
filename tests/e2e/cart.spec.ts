import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { skipCookieBanner } from "./consent";

const FAKE_API = "http://localhost:4011";
// Jacket "Jaqueta sarja", Verde, size M, R$ 199,00 in the fake API.
const JACKET_M = "5a1e0000-0000-4000-8000-000000000002";
// Cap "Boné de algodão", one size, R$ 79,00.
const CAP = "5a1e0000-0000-4000-8000-000000000004";
// "Camiseta listrada", Azul, size P.
const STRIPED_P = "5a1e0000-0000-4000-8000-000000000005";

type Line = {
  productSizeId: string;
  quantity?: number;
  maxQuantity?: number;
  soldOut?: boolean;
  unitPrice?: number;
  name?: string;
  color?: string;
  size?: string;
};

test.beforeEach(async ({ context, request }) => {
  await skipCookieBanner(context);
  await request.post(`${FAKE_API}/__reset`);
});

// Builds a bag in the fake API, hands its id to the browser as the store's own cookie, and opens /sacola.
async function openBag(
  context: BrowserContext,
  page: Page,
  lines: Line[],
  extra: { cep?: string; chosen?: string } = {},
): Promise<string> {
  const response = await context.request.post(`${FAKE_API}/__carts`, { data: { lines, ...extra } });
  const { id } = await response.json();
  await context.addCookies([{ name: "helena_cart", value: id, url: "http://localhost:3100" }]);
  await page.goto("/sacola");
  return id;
}

test("SAC-02 bag page", async ({ context, page }) => {
  await openBag(context, page, [{ productSizeId: JACKET_M }]);
  const steps = page.getByRole("list", { name: "Etapas da compra" });
  await expect(steps.getByRole("listitem")).toHaveText(["Sacola", "Dados e entrega", "Pagamento"]);
  await expect(steps.getByRole("listitem").first()).toHaveAttribute("aria-current", "step");
  await expect(page.getByRole("heading", { name: "Sua sacola · 1 peça" })).toBeVisible();
  const item = page.getByRole("article", { name: "Jaqueta sarja" });
  await expect(item.getByRole("img")).toBeVisible();
  await expect(item).toContainText("Verde · M");
  await expect(item).toContainText("R$ 199,00");
  await expect(item).toContainText("1");
  await expect(page.getByText("Total", { exact: true }).first()).toBeVisible();
});

test("SAC-03 empty bag", async ({ page }) => {
  await page.goto("/sacola");
  await expect(page.getByRole("heading", { name: "Sua sacola está vazia" })).toBeVisible();
  await expect(page.getByText("As peças que você escolher aparecem aqui.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver novidades" })).toHaveAttribute("href", "/catalogo");
  await expect(page.getByRole("button", { name: "Finalizar compra" })).toHaveCount(0);
});

test("SAC-03 unknown cart shows the empty bag", async ({ context, page }) => {
  await context.addCookies([
    { name: "helena_cart", value: "00000000-0000-4000-8000-00000000dead", url: "http://localhost:3100" },
  ]);
  await page.goto("/sacola");
  await expect(page.getByRole("heading", { name: "Sua sacola está vazia" })).toBeVisible();
  // The store's error screen (GER-06) is the one with "Tentar de novo"; Next's route announcer also has role="alert".
  await expect(page.getByRole("link", { name: "Tentar de novo" })).toHaveCount(0);
});

test("SAC-06 bag persists", async ({ context, page }) => {
  await openBag(context, page, [{ productSizeId: JACKET_M }]);
  const again = await context.newPage();
  await again.goto("/sacola");
  await expect(again.getByRole("article", { name: "Jaqueta sarja" })).toBeVisible();
});

test("GER-02 bag without tabs or announcement", async ({ context, page }) => {
  await openBag(context, page, [{ productSizeId: JACKET_M }]);
  await expect(page.getByRole("complementary", { name: "Anúncio" })).toHaveCount(0);
  const header = page.getByRole("banner");
  await expect(header.getByRole("link", { name: "Buscar" })).toBeHidden();
  await expect(header.getByRole("link", { name: /^Sacola/ })).toBeHidden();
  await expect(header.getByRole("link", { name: "Helena" })).toHaveAttribute("href", "/");
  await expect(page.getByRole("navigation", { name: "Abas" })).toHaveCount(0);
});

const jacketCard = (page: Page) => page.getByRole("article", { name: "Jaqueta sarja" });
const plus = (page: Page) => jacketCard(page).getByRole("button", { name: "Aumentar" });
const minus = (page: Page) => jacketCard(page).getByRole("button", { name: "Diminuir" });
const quantity = (page: Page) => jacketCard(page).getByRole("status");

test("SAC-04 change quantity", async ({ context, page }) => {
  await openBag(context, page, [{ productSizeId: JACKET_M, maxQuantity: 3 }]);
  await expect(minus(page)).toBeDisabled();
  await plus(page).click();
  await expect(quantity(page)).toHaveText("2");
  await plus(page).click();
  await expect(quantity(page)).toHaveText("3");
  await expect(page.getByRole("region", { name: "Resumo" })).toContainText("R$ 597,00");
  await expect(plus(page)).toBeDisabled();
  await expect(jacketCard(page)).toContainText("Apenas 3 unidades restantes");
  await minus(page).click();
  await expect(quantity(page)).toHaveText("2");
  await expect(jacketCard(page)).not.toContainText("Apenas 3 unidades restantes");
});

test("SAC-04 stock dropped while the bag was open (409)", async ({ context, page, request }) => {
  await openBag(context, page, [{ productSizeId: JACKET_M, maxQuantity: 3 }]);
  await request.post(`${FAKE_API}/__max?productSizeId=${JACKET_M}&max=1`);
  await plus(page).click();
  await expect(jacketCard(page)).toContainText("Uma peça da sua sacola esgotou");
  await expect(quantity(page)).toHaveText("1");
  await expect(jacketCard(page)).toContainText("Apenas 1 unidade restante");
});

test("SAC-04 double tap adds one", async ({ context, page }) => {
  await openBag(context, page, [{ productSizeId: JACKET_M, maxQuantity: 5 }]);
  await plus(page).dblclick();
  await expect(quantity(page)).toHaveText("2");
  await page.reload();
  await expect(quantity(page)).toHaveText("2");
});

test("SAC-05 remove and undo", async ({ context, page }) => {
  await openBag(context, page, [
    { productSizeId: JACKET_M },
    { productSizeId: CAP },
  ]);
  await expect(page.getByRole("heading", { name: "Sua sacola · 2 peças" })).toBeVisible();
  await jacketCard(page).getByRole("button", { name: "Remover" }).click();
  await expect(page.getByRole("heading", { name: "Sua sacola · 1 peça" })).toBeVisible();
  const notice = page.getByRole("status").filter({ hasText: "Jaqueta sarja removida" });
  await expect(notice).toBeVisible();
  await notice.getByRole("button", { name: "Desfazer" }).click();
  await expect(page.getByRole("heading", { name: "Sua sacola · 2 peças" })).toBeVisible();
  await expect(notice).toHaveCount(0);
});

test("SAC-05 undo notice leaves after 10 seconds", async ({ context, page }) => {
  await page.clock.install();
  await openBag(context, page, [
    { productSizeId: JACKET_M },
    { productSizeId: CAP },
  ]);
  await jacketCard(page).getByRole("button", { name: "Remover" }).click();
  const notice = page.getByRole("status").filter({ hasText: "Jaqueta sarja removida" });
  await expect(notice).toBeVisible();
  await page.clock.runFor(9_000);
  await expect(notice).toBeVisible();
  await page.clock.runFor(1_500);
  await expect(notice).toHaveCount(0);
});

test("SAC-05 undo after the piece sold out", async ({ context, page, request }) => {
  await openBag(context, page, [
    { productSizeId: JACKET_M },
    { productSizeId: CAP },
  ]);
  await jacketCard(page).getByRole("button", { name: "Remover" }).click();
  await request.post(`${FAKE_API}/__sold-out?productSizeId=${JACKET_M}`);
  await page.getByRole("button", { name: "Desfazer" }).click();
  await expect(page.getByText("Não foi possível desfazer: Uma peça da sua sacola esgotou")).toBeVisible();
  await expect(jacketCard(page)).toHaveCount(0);
});

test("SAC-07 sold-out piece shows marked, without quantity", async ({ context, page }) => {
  await openBag(context, page, [
    { productSizeId: JACKET_M },
    { productSizeId: STRIPED_P, soldOut: true },
  ]);
  const striped = page.getByRole("article", { name: "Camiseta listrada" });
  await expect(striped).toContainText("Esgotada");
  await expect(striped).toContainText("Esgotou depois que entrou na sacola. Fica fora do total.");
  await expect(striped.getByRole("button", { name: "Aumentar" })).toHaveCount(0);
  await expect(striped.getByRole("button", { name: "Remover" })).toBeVisible();
});

const shippingBox = (page: Page) => page.getByRole("region", { name: "Frete e prazo" });
const deliveryOptions = (page: Page) => shippingBox(page).getByRole("group", { name: "Modalidade de entrega" });
const summary = (page: Page) => page.getByRole("region", { name: "Resumo" });

async function changeCep(page: Page, cep: string) {
  await shippingBox(page).getByLabel("CEP").fill(cep);
  await shippingBox(page).getByRole("button", { name: /Calcular|Alterar|Tentar de novo/ }).click();
}

test("SAC-08 CEP from the product page", async ({ context, page }) => {
  await openBag(context, page, [{ productSizeId: JACKET_M }]);
  await page.goto("/produto/jaqueta-sarja-verde");
  const productShipping = page.getByRole("form", { name: "Frete e prazo" });
  await productShipping.getByLabel("CEP").fill("01310-100");
  await productShipping.getByRole("button", { name: "Calcular" }).click();
  await expect(productShipping).toContainText("Entrega para São Paulo/SP");

  await page.goto("/sacola");
  await expect(shippingBox(page).getByLabel("CEP")).toHaveValue("01310100");
  await expect(deliveryOptions(page).getByRole("radio")).toHaveCount(3);
  await expect(deliveryOptions(page).getByRole("radio", { name: /PAC/ })).toBeChecked();
  await expect(deliveryOptions(page)).toContainText("Chega em até 5 dias úteis");
  await expect(summary(page)).toContainText("Frete (PAC)");
  await expect(summary(page)).toContainText("R$ 20,00");
});

test("SAC-08 choose and change", async ({ context, page }) => {
  await openBag(context, page, [{ productSizeId: JACKET_M }], { cep: "01310100", chosen: "pac" });
  await deliveryOptions(page).getByRole("radio", { name: /Sedex/ }).check();
  await expect(summary(page)).toContainText("Frete (Sedex)");
  await expect(summary(page)).toContainText("R$ 35,00");
  await changeCep(page, "69900-000");
  await expect(deliveryOptions(page)).toContainText("Chega em até 12 dias úteis");
  await expect(deliveryOptions(page).getByRole("radio")).toHaveCount(2);
  await expect(deliveryOptions(page).getByRole("radio", { name: /Sedex/ })).toBeChecked();
});

test("SAC-08 first CEP in the bag chooses the cheapest", async ({ context, page }) => {
  await openBag(context, page, [{ productSizeId: JACKET_M }]);
  await changeCep(page, "01310-100");
  await expect(deliveryOptions(page).getByRole("radio", { name: /PAC/ })).toBeChecked();
  await expect(summary(page)).toContainText("Frete (PAC)");
});

test("SAC-08 invalid CEP keeps what she typed", async ({ context, page }) => {
  await openBag(context, page, [{ productSizeId: JACKET_M }]);
  await changeCep(page, "123");
  await expect(shippingBox(page)).toContainText("Digite um CEP com 8 números");
  await expect(shippingBox(page).getByLabel("CEP")).toHaveValue("123");
  await expect(shippingBox(page).getByLabel("CEP")).toHaveAttribute("aria-invalid", "true");
});

test("SAC-08 shipping API down keeps the CEP and the bag", async ({ context, page, request }) => {
  const id = await openBag(context, page, [{ productSizeId: JACKET_M }]);
  await request.post(`${FAKE_API}/__fail?path=/v1/carts/${id}/cep`);
  await changeCep(page, "01310-100");
  await expect(shippingBox(page).getByRole("alert")).toContainText("Não foi possível concluir. Tente de novo");
  await expect(shippingBox(page).getByLabel("CEP")).toHaveValue("01310-100");
  await expect(jacketCard(page)).toBeVisible();
});

test("SAC-09 amount left for free shipping", async ({ context, page }) => {
  await openBag(context, page, [{ productSizeId: JACKET_M, unitPrice: 25000 }], { cep: "01310100", chosen: "pac" });
  await expect(shippingBox(page)).toContainText("Faltam R$ 50,00 para o frete grátis");
});

test("SAC-10 free shipping applied", async ({ context, page }) => {
  await openBag(context, page, [{ productSizeId: JACKET_M, unitPrice: 32000 }], { cep: "01310100", chosen: "pac" });
  await expect(deliveryOptions(page).getByRole("radio", { name: /PAC/ })).toBeChecked();
  await expect(deliveryOptions(page).getByText("Grátis")).toHaveCount(1);
  await expect(deliveryOptions(page)).toContainText("R$ 25,00");
  await expect(deliveryOptions(page)).toContainText("R$ 35,00");
  await expect(shippingBox(page)).not.toContainText("para o frete grátis");
  await expect(summary(page)).toContainText("R$ 320,00");
});

const couponBox = (page: Page) => page.getByRole("region", { name: "Cupom" });

async function applyCoupon(page: Page, code: string) {
  await couponBox(page).getByLabel("Código do cupom").fill(code);
  await couponBox(page).getByRole("button", { name: "Aplicar" }).click();
}

test("SAC-11 valid coupon", async ({ context, page }) => {
  await openBag(context, page, [{ productSizeId: JACKET_M, unitPrice: 25000 }], { cep: "01310100", chosen: "pac" });
  await applyCoupon(page, "maria10");
  await expect(summary(page)).toContainText("Desconto (MARIA10)");
  await expect(summary(page)).toContainText("− R$ 25,00");
  await expect(summary(page)).toContainText("R$ 245,00");
  await expect(couponBox(page)).toContainText("MARIA10 · 10% de desconto");
  await expect(couponBox(page).getByRole("button", { name: "Remover" })).toBeVisible();
});

test("SAC-12 invalid coupon", async ({ context, page }) => {
  await openBag(context, page, [{ productSizeId: JACKET_M, unitPrice: 25000 }], { cep: "01310100", chosen: "pac" });
  await applyCoupon(page, "NAOEXISTE");
  await expect(couponBox(page)).toContainText("Cupom inválido ou expirado");
  const field = couponBox(page).getByLabel("Código do cupom");
  await expect(field).toHaveAttribute("aria-invalid", "true");
  await expect(field).toHaveValue("NAOEXISTE");
  await expect(summary(page)).toContainText("R$ 270,00");
  await expect(summary(page)).not.toContainText("Desconto");
});

test("SAC-13 coupon and free shipping together", async ({ context, page }) => {
  await openBag(context, page, [{ productSizeId: JACKET_M, unitPrice: 40000 }], { cep: "01310100", chosen: "pac" });
  await applyCoupon(page, "MARIA10");
  await expect(summary(page)).toContainText("− R$ 40,00");
  await expect(deliveryOptions(page).getByText("Grátis")).toHaveCount(1);
  await expect(summary(page)).toContainText("R$ 360,00");
});

test("SAC-14 coupon drops the amount below free shipping", async ({ context, page }) => {
  await openBag(context, page, [{ productSizeId: JACKET_M, unitPrice: 32000 }], { cep: "01310100", chosen: "pac" });
  await applyCoupon(page, "MARIA10");
  await expect(summary(page)).toContainText("R$ 308,00");
  await expect(deliveryOptions(page).getByText("Grátis")).toHaveCount(0);
  await expect(shippingBox(page)).toContainText("Com o cupom, faltam R$ 12,00 para o frete grátis");

  await couponBox(page).getByRole("button", { name: "Remover" }).click();
  await expect(deliveryOptions(page).getByText("Grátis")).toHaveCount(1);
  await expect(summary(page)).toContainText("R$ 320,00");
  await expect(summary(page)).not.toContainText("Desconto");
});

test("SAC-15 one coupon per purchase", async ({ context, page }) => {
  await openBag(context, page, [{ productSizeId: JACKET_M }]);
  await applyCoupon(page, "MARIA10");
  await expect(couponBox(page)).toContainText("MARIA10 · 10% de desconto");
  await applyCoupon(page, "OUTRO15");
  await expect(couponBox(page)).toContainText("OUTRO15 · 15% de desconto");
  await expect(couponBox(page)).not.toContainText("MARIA10");
  await expect(summary(page)).toContainText("Desconto (OUTRO15)");
});

test("GER-06 coupon API down keeps the code", async ({ context, page, request }) => {
  const id = await openBag(context, page, [{ productSizeId: JACKET_M }]);
  await request.post(`${FAKE_API}/__fail?path=/v1/carts/${id}/coupon`);
  await applyCoupon(page, "MARIA10");
  await expect(couponBox(page).getByRole("alert")).toContainText("Não foi possível concluir. Tente de novo");
  await expect(couponBox(page).getByLabel("Código do cupom")).toHaveValue("MARIA10");
  await expect(summary(page)).not.toContainText("Desconto");
});

const checkoutButton = (page: Page) => page.getByRole("button", { name: "Finalizar compra" });
const SOLD_OUT_TEXT = "A peça Camiseta listrada (Azul · P) esgotou. Remova da sacola para finalizar a compra.";

test("SAC-07 sold-out piece blocks checkout until removed", async ({ context, page }) => {
  await openBag(context, page, [
    { productSizeId: JACKET_M },
    { productSizeId: STRIPED_P, soldOut: true },
  ]);
  const striped = page.getByRole("article", { name: "Camiseta listrada" });
  await expect(striped).toContainText("Esgotada");
  await expect(summary(page)).toContainText("R$ 199,00");
  await expect(checkoutButton(page)).toBeEnabled();

  await checkoutButton(page).click();
  await expect(page.getByRole("alert").filter({ hasText: SOLD_OUT_TEXT })).toBeVisible();
  await expect(page).toHaveURL(/\/sacola$/);
  await expect(striped).toBeInViewport();
  await expect(striped.getByRole("button", { name: "Remover" })).toBeFocused();

  await striped.getByRole("button", { name: "Remover" }).click();
  await expect(striped).toHaveCount(0);
  await checkoutButton(page).click();
  await expect(page).toHaveURL(/\/checkout$/);
});

test("SAC-07 sold out after the page opened", async ({ context, page, request }) => {
  await openBag(context, page, [{ productSizeId: JACKET_M }, { productSizeId: STRIPED_P }]);
  await request.post(`${FAKE_API}/__sold-out?productSizeId=${STRIPED_P}`);
  await checkoutButton(page).click();
  await expect(page.getByRole("alert").filter({ hasText: SOLD_OUT_TEXT })).toBeVisible();
  await expect(page).toHaveURL(/\/sacola$/);
  await expect(page.getByRole("article", { name: "Camiseta listrada" })).toContainText("Esgotada");
});

test("SAC-16 installments follow the total", async ({ context, page }) => {
  await openBag(context, page, [{ productSizeId: JACKET_M, unitPrice: 15000, quantity: 2 }]);
  await expect(summary(page)).toContainText("ou até 6x de R$ 50,00 sem juros");
  await minus(page).click();
  await expect(summary(page)).toContainText("ou até 3x de R$ 50,00 sem juros");
});

test("focus never under the purchase bar", async ({ context, page }) => {
  await openBag(context, page, [
    { productSizeId: JACKET_M },
    { productSizeId: CAP },
    { productSizeId: STRIPED_P },
  ]);
  const bar = (await checkoutButton(page).locator("xpath=ancestor::*[@data-purchase-bar]").boundingBox())!;
  const last = page.getByRole("article").last().getByRole("button", { name: "Remover" });
  await page.getByRole("article").first().getByRole("button", { name: "Remover" }).focus();
  for (let i = 0; i < 20 && !(await last.evaluate((el) => el === document.activeElement)); i++) {
    await page.keyboard.press("Tab");
  }
  await expect(last).toBeFocused();
  const box = (await last.boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(bar.y);
});
