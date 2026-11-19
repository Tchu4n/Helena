// Fake store API for screen tests: fixed data in the shape of contract/openapi.yaml.
// Control routes (/__fail, /__reset) exist only here, so tests can simulate an API outage.
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

const PORT = 4011;

const size = (label, available) => ({ id: `${label}-id`, label, available, lowStock: false });
const photo = (file, altText) => ({ url: `/placeholders/${file}.svg`, altText });

const PRODUCTS = [
  {
    id: "9b2f6a10-0000-4000-8000-000000000001",
    slug: "jaqueta-jeans-azul",
    name: "Jaqueta jeans",
    category: "jackets",
    photo: photo("jacket", "Jaqueta jeans azul vista de frente"),
    price: 15900,
    originalPrice: 19900,
    discountBadge: "-20%",
    soldOut: false,
    soldOutInSize: false,
    sizes: [size("P", true), size("M", true), size("G", false)],
  },
  {
    id: "9b2f6a10-0000-4000-8000-000000000002",
    slug: "camiseta-basica-branca",
    name: "Camiseta básica",
    category: "tshirts",
    photo: photo("tshirt", "Camiseta básica branca vista de frente"),
    price: 7990,
    originalPrice: null,
    discountBadge: null,
    soldOut: false,
    soldOutInSize: false,
    sizes: [size("P", true), size("M", false), size("G", true)],
  },
  {
    id: "9b2f6a10-0000-4000-8000-000000000003",
    slug: "calca-wide-de-alfaiataria-em-linho-lavado-cor-areia",
    name: "Calça wide de alfaiataria em linho lavado cor areia",
    category: "pants",
    photo: photo("pants", "Calça wide cor areia vista de frente"),
    price: 24900,
    originalPrice: null,
    discountBadge: null,
    soldOut: true,
    soldOutInSize: false,
    sizes: [size("P", false), size("M", false), size("G", false)],
  },
];

const HOME = {
  announcement: "Frete grátis a partir de R$ 300",
  campaign: {
    title: "Coleção Verão 2027",
    text: "Peças leves para os dias longos.",
    image: photo("tshirt", "Camiseta da coleção Verão 2027"),
    link: "/catalogo?categoria=camisetas",
  },
  featured: PRODUCTS,
};

const INTERNAL_ERROR = {
  type: "https://helena.example/problems/internal-error",
  title: "Não foi possível concluir. Tente de novo",
  status: 500,
  code: "internal_error",
};

// Product screen data (PRO-*), kept apart from PRODUCTS so the catalog tests keep their order.
const sizeId = (n) => `5a1e0000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const detail = (base) => ({
  originalPrice: null,
  discountBadge: null,
  soldOutInSize: false,
  fabric: "100% algodão",
  collection: "Verão 2027",
  description: "Peça de corte reto para o dia a dia.",
  otherColors: [],
  sizeGuide: null,
  ...base,
  photo: base.photos[0],
});

const PRODUCT_DETAILS = Object.fromEntries(
  [
    detail({
      id: "9b2f6a10-0000-4000-8000-000000000101",
      slug: "jaqueta-sarja-verde",
      name: "Jaqueta sarja",
      category: "jackets",
      price: 19900,
      soldOut: false,
      color: { name: "Verde", hex: "#4A5A3C" },
      otherColors: [{ slug: "jaqueta-sarja-preta", name: "Preta", hex: "#1A1A1A" }],
      installmentPlan: { maxInstallments: 3, installmentAmount: 6633 },
      photos: [1, 2, 3, 4].map((n) => photo("jacket", `Jaqueta sarja verde, foto ${n}`)),
      sizes: [
        { id: sizeId(1), label: "P", available: false, lowStock: false },
        { id: sizeId(2), label: "M", available: true, lowStock: true },
        { id: sizeId(3), label: "G", available: true, lowStock: false },
      ],
      sizeGuide: {
        columns: ["Tamanho", "Busto (cm)", "Comprimento (cm)"],
        rows: [["P", "92", "58"], ["M", "96", "60"], ["G", "102", "62"]],
      },
    }),
    detail({
      id: "9b2f6a10-0000-4000-8000-000000000102",
      slug: "bone-de-algodao-cru",
      name: "Boné de algodão",
      category: "accessories",
      price: 7900,
      soldOut: false,
      color: { name: "Cru", hex: "#E8DFCC" },
      installmentPlan: { maxInstallments: 1, installmentAmount: 7900 },
      photos: [photo("accessory", "Boné de algodão cru")],
      sizes: [{ id: sizeId(4), label: "Único", available: true, lowStock: false }],
    }),
    detail({
      id: "9b2f6a10-0000-4000-8000-000000000103",
      slug: "camiseta-listrada-azul",
      name: "Camiseta listrada",
      category: "tshirts",
      price: 8990,
      soldOut: true,
      color: { name: "Azul", hex: "#3B5B7A" },
      installmentPlan: { maxInstallments: 1, installmentAmount: 8990 },
      photos: [photo("tshirt", "Camiseta listrada azul")],
      sizes: [
        { id: sizeId(5), label: "P", available: false, lowStock: false },
        { id: sizeId(6), label: "M", available: false, lowStock: false },
      ],
    }),
  ].map((p) => [p.slug, p]),
);
const ALL_SIZES = Object.values(PRODUCT_DETAILS).flatMap((p) => p.sizes.map((s) => ({ ...s, product: p })));

const option = (type, price, deliveryTime) => ({ type, price, free: false, deliveryTime });
const QUOTES = {
  "01310100": {
    city: "São Paulo",
    state: "SP",
    options: [
      option("courier", 1500, "Chega hoje"),
      option("pac", 2000, "Chega em até 5 dias úteis"),
      option("sedex", 3500, "Chega em até 2 dias úteis"),
    ],
  },
  "69900000": {
    city: "Rio Branco",
    state: "AC",
    options: [option("pac", 4500, "Chega em até 12 dias úteis"), option("sedex", 6500, "Chega em até 6 dias úteis")],
  },
  // Fixed rate the real API answers with when the shipping provider is down (PRO-11).
  "99999999": { city: "Salvador", state: "BA", options: [option("pac", 3000, "Chega em até 10 dias úteis")] },
};

const TOO_MANY_REQUESTS = {
  type: "https://helena.example/problems/too-many-requests",
  title: "Muitas tentativas. Aguarde um pouco e tente de novo",
  status: 429,
  code: "too_many_requests",
};
const OUT_OF_STOCK = {
  type: "https://helena.example/problems/out-of-stock",
  title: "Uma peça da sua sacola esgotou",
  status: 409,
  code: "out_of_stock",
};
const NOT_FOUND = { type: "about:blank", title: "Não encontrado", status: 404, code: "not_found" };

const carts = new Map();
const requests = [];

function cartBody(cart) {
  const items = cart.items.map((i) => ({
    id: i.id,
    productSizeId: i.size.id,
    slug: i.size.product.slug,
    name: i.size.product.name,
    color: i.size.product.color.name,
    size: i.size.label,
    photo: i.size.product.photo,
    unitPrice: i.size.product.price,
    quantity: i.quantity,
    maxQuantity: 10,
    subtotal: i.size.product.price * i.quantity,
    soldOut: false,
  }));
  const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0);
  const maxInstallments = Math.max(1, Math.min(6, Math.floor(subtotal / 5000)));
  return {
    id: cart.id,
    items,
    pieceCount: items.reduce((sum, i) => sum + i.quantity, 0),
    subtotal,
    coupon: null,
    discount: 0,
    amountToFreeShipping: Math.max(0, 30000 - subtotal),
    cep: cart.cep,
    deliveryOptions: [],
    chosenDelivery: null,
    shippingAmount: null,
    total: subtotal,
    installmentPlan: { maxInstallments, installmentAmount: Math.floor(subtotal / maxInstallments) },
    reservationExpiresAt: null,
    canCheckout: items.length > 0,
  };
}

async function readJson(req) {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function route(req, url) {
  const parts = url.pathname.split("/").filter(Boolean);
  if (req.method === "GET" && parts[1] === "products" && parts.length === 3) {
    const slug = decodeURIComponent(parts[2]);
    if (slug === "erro") return [500, INTERNAL_ERROR];
    return PRODUCT_DETAILS[slug] ? [200, PRODUCT_DETAILS[slug]] : [404, NOT_FOUND];
  }
  if (req.method === "POST" && url.pathname === "/v1/shipping/quotes") {
    const { cep } = await readJson(req);
    return [200, { cep, ...(QUOTES[cep] ?? QUOTES["99999999"]) }];
  }
  if (req.method === "POST" && url.pathname === "/v1/restock-alerts") {
    const { contact } = await readJson(req);
    return contact === "limite@exemplo.com" ? [429, TOO_MANY_REQUESTS] : [201, null];
  }
  if (req.method === "POST" && url.pathname === "/v1/carts") {
    // The contract defines no request body here; Prism rejects one, so this fake does too.
    let raw = "";
    for await (const chunk of req) raw += chunk;
    if (raw) return [415, { type: "about:blank", title: "Invalid content type", status: 415, code: "invalid_data" }];
    const cart = { id: randomUUID(), items: [], cep: null };
    carts.set(cart.id, cart);
    return [201, cartBody(cart)];
  }
  if (parts[1] === "carts" && parts.length >= 3) {
    const cart = carts.get(parts[2]);
    if (!cart) return [404, NOT_FOUND];
    if (req.method === "GET" && parts.length === 3) return [200, cartBody(cart)];
    if (req.method === "PUT" && parts[3] === "cep") {
      cart.cep = (await readJson(req)).cep;
      return [200, cartBody(cart)];
    }
    if (req.method === "POST" && parts[3] === "items") {
      const { productSizeId, quantity } = await readJson(req);
      const size = ALL_SIZES.find((s) => s.id === productSizeId);
      if (!size) return [404, NOT_FOUND];
      if (!size.available) return [409, OUT_OF_STOCK];
      const item = cart.items.find((i) => i.size.id === productSizeId);
      if (item) item.quantity += quantity;
      else cart.items.push({ id: randomUUID(), size, quantity });
      return [200, cartBody(cart)];
    }
  }
  return null;
}

const failing = new Set();

function listProducts(query) {
  const search = query.get("search");
  if (search === "erro") return [500, INTERNAL_ERROR];
  if (search === "nada") return [200, page([])];

  const wantedSize = query.get("size");
  let items = PRODUCTS.map((p) => ({
    ...p,
    soldOutInSize: Boolean(wantedSize) && !p.soldOut && !p.sizes.some((s) => s.label === wantedSize && s.available),
  }));
  const category = query.get("category");
  if (category) items = items.filter((p) => p.category === category);
  // Sold-out products always last (VIT-05, CAT-05).
  const last = (p) => (p.soldOut || p.soldOutInSize ? 1 : 0);
  items.sort((a, b) => last(a) - last(b));
  return [200, page(items)];
}

function page(items) {
  return {
    items,
    total: items.length,
    page: 1,
    perPage: 24,
    filters: { sizes: ["P", "M", "G", "GG"], colors: [], minPrice: 7990, maxPrice: 24900 },
  };
}

function send(res, status, body) {
  const type = status >= 400 ? "application/problem+json" : "application/json";
  res.writeHead(status, { "Content-Type": type, "X-Request-Id": "fake" });
  res.end(body === null ? "" : JSON.stringify(body));
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname === "/__health") return send(res, 200, { ok: true });
  if (req.method === "POST" && url.pathname === "/__fail") {
    failing.add(url.searchParams.get("path"));
    return send(res, 200, { ok: true });
  }
  if (req.method === "POST" && url.pathname === "/__reset") {
    failing.clear();
    carts.clear();
    requests.length = 0;
    return send(res, 200, { ok: true });
  }
  // Lets a test check which API paths the store called.
  if (url.pathname === "/__requests") return send(res, 200, requests);
  requests.push(url.pathname);
  if (failing.has(url.pathname)) return send(res, 500, INTERNAL_ERROR);
  if (req.method === "GET" && url.pathname === "/v1/home") return send(res, 200, HOME);
  if (req.method === "GET" && url.pathname === "/v1/products") return send(res, ...listProducts(url.searchParams));
  const answer = await route(req, url);
  if (answer) return send(res, ...answer);
  send(res, 404, NOT_FOUND);
}).listen(PORT, () => console.log(`fake API on http://localhost:${PORT}`));
