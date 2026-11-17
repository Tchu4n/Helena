// Fake store API for screen tests: fixed data in the shape of contract/openapi.yaml.
// Control routes (/__fail, /__reset) exist only here, so tests can simulate an API outage.
import { createServer } from "node:http";

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
  res.end(JSON.stringify(body));
}

createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname === "/__health") return send(res, 200, { ok: true });
  if (req.method === "POST" && url.pathname === "/__fail") {
    failing.add(url.searchParams.get("path"));
    return send(res, 200, { ok: true });
  }
  if (req.method === "POST" && url.pathname === "/__reset") {
    failing.clear();
    return send(res, 200, { ok: true });
  }
  if (failing.has(url.pathname)) return send(res, 500, INTERNAL_ERROR);
  if (req.method === "GET" && url.pathname === "/v1/home") return send(res, 200, HOME);
  if (req.method === "GET" && url.pathname === "/v1/products") return send(res, ...listProducts(url.searchParams));
  send(res, 404, { type: "about:blank", title: "Não encontrado", status: 404, code: "not_found" });
}).listen(PORT, () => console.log(`fake API on http://localhost:${PORT}`));
