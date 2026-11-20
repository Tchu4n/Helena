// PRO-01, PRO-02: the product screen gets only the fields it shows, with the installment text ready.
import { test } from "node:test";
import assert from "node:assert/strict";
import { installmentText } from "../src/lib/format.ts";
import { toProductView } from "../src/features/catalog/views.ts";

const product = {
  id: "9b2f6a10-0000-4000-8000-000000000101",
  slug: "jaqueta-sarja-verde",
  name: "Jaqueta sarja",
  category: "jackets",
  photo: { url: "/placeholders/jacket.svg", altText: "Jaqueta" },
  price: 19900,
  originalPrice: null,
  discountBadge: null,
  soldOut: false,
  soldOutInSize: false,
  sizes: [{ id: "5a1e0000-0000-4000-8000-000000000002", label: "M", available: true, lowStock: true }],
  description: "Peça de corte reto.",
  fabric: "100% algodão",
  collection: "Verão 2027",
  color: { name: "Verde", hex: "#4A5A3C" },
  otherColors: [],
  photos: [{ url: "/placeholders/jacket.svg", altText: "Jaqueta" }],
  installmentPlan: { maxInstallments: 3, installmentAmount: 6633 },
  sizeGuide: null,
};

test("PRO-02 installmentText shows installments", () => {
  assert.equal(installmentText({ maxInstallments: 3, installmentAmount: 6633 }), "até 3x de R$\u00a066,33 sem juros");
});

test("PRO-02 installmentText hides single payment", () => {
  assert.equal(installmentText({ maxInstallments: 1, installmentAmount: 7900 }), null);
});

test("toProductView keeps only screen fields", () => {
  const view = toProductView(product);
  assert.equal("category" in view, false);
  assert.equal("installmentPlan" in view, false);
  assert.deepEqual(Object.keys(view.sizes[0]).sort(), ["available", "id", "label", "lowStock"]);
  assert.equal(view.installmentText, "até 3x de R$\u00a066,33 sem juros");
  assert.deepEqual(view.photos, [{ url: "/placeholders/jacket.svg", alt: "Jaqueta" }]);
});

test("CAT-08 card carries sizes", async () => {
  const { toCardProduct } = await import("../src/features/catalog/views.ts");
  const card = toCardProduct({ ...product, sizes: [{ ...product.sizes[0], extra: "x" }] });
  assert.deepEqual(card.sizes, [{ id: "5a1e0000-0000-4000-8000-000000000002", label: "M", available: true, lowStock: true }]);
});
