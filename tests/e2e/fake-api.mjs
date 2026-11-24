// Fake store API for screen tests: fixed data in the shape of contract/openapi.yaml.
// Control routes (/__fail, /__reset) exist only here, so tests can simulate an API outage.
import { createServer } from "node:http";
import { randomInt, randomUUID } from "node:crypto";
import { cartTotals } from "./fake-cart.mjs";
import { RESERVATION_MS, canReserve, isReserved, orderStatus } from "./fake-order.mjs";

const PORT = 4011;

// Catalog sizes get their own UUIDs (from 100 up), so quick buy (CAT-08) can add them to a bag.
let catalogSize = 100;
const size = (label, available, lowStock = false) => ({
  id: `5a1e0000-0000-4000-8000-${String(catalogSize++).padStart(12, "0")}`,
  label,
  available,
  lowStock,
});
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
    sizes: [size("P", true), size("M", true, true), size("G", false)],
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
const ALL_SIZES = [...Object.values(PRODUCT_DETAILS), ...PRODUCTS].flatMap((p) => p.sizes.map((s) => ({ ...s, product: p })));

const option = (type, price, deliveryTime) => ({ type, price, free: false, deliveryTime });
const QUOTES = {
  "01310100": {
    city: "São Paulo",
    state: "SP",
    options: [
      option("courier", 2500, "Chega hoje"),
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
  // Cap R$ 79,00 + PAC R$ 71,00 = an order of R$ 150,00 (CHK-19).
  "88010000": { city: "Florianópolis", state: "SC", options: [option("pac", 7100, "Chega em até 7 dias úteis")] },
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
const INVALID_COUPON = {
  type: "https://helena.example/problems/invalid-coupon",
  title: "Cupom inválido ou expirado",
  status: 422,
  code: "invalid_coupon",
};
const UNAVAILABLE_DELIVERY = {
  type: "https://helena.example/problems/delivery-unavailable",
  title: "Esta entrega não está disponível para o seu CEP",
  status: 422,
  code: "delivery_unavailable",
};
const INVALID_QUANTITY = {
  type: "https://helena.example/problems/invalid-data",
  title: "Dados inválidos",
  status: 422,
  code: "invalid_data",
};
const COUPONS = { MARIA10: 10, OUTRO15: 15 };
const INVALID_DATA = { type: "https://helena.example/problems/invalid-data", title: "Dados inválidos", status: 422, code: "invalid_data" };
const INCOMPLETE_CART = {
  type: "https://helena.example/problems/incomplete-cart",
  title: "Preencha seus dados e escolha a entrega para continuar",
  status: 422,
  code: "incomplete_cart",
};
// IDT-14: 409s of the account's details; the CPF one never says whose account has it.
const conflict = (code, title) => ({ type: `https://helena.example/problems/${code.replaceAll("_", "-")}`, title, status: 409, code });
const CPF_IN_USE = conflict("cpf_in_use", "Não foi possível usar este CPF");
const DETAILS_ALREADY_SET = conflict("details_already_set", "Os dados desta conta já foram salvos");
const DETAILS_MISSING = conflict("details_missing", "Complete seus dados para continuar");
const EMAIL_IN_USE = conflict("email_in_use", "Este e-mail já está em outra conta");
const NOT_AUTHENTICATED = {
  type: "https://helena.example/problems/not-authenticated",
  title: "Identifique-se para continuar",
  status: 401,
  code: "not_authenticated",
};
const ALREADY_PAID = {
  type: "https://helena.example/problems/order-already-paid",
  title: "Este pedido já foi pago",
  status: 409,
  code: "order_already_paid",
};
const soldOutProblem = (name) => ({ ...OUT_OF_STOCK, title: `A peça ${name} esgotou` });
const DECLINED_MESSAGE = "O banco do cartão não aprovou esta compra. Tente outro cartão ou pague com PIX.";
// Any small valid PNG stands in for the QR code the real API sends as a data URI (CHK-15).
const QR_CODE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const NOT_FOUND = { type: "https://helena.example/problems/not-found", title: "Não encontrado", status: 404, code: "not_found" };
const INVALID_CODE = { type: "https://helena.example/problems/invalid-code", title: "Código inválido ou vencido", status: 401, code: "invalid_code" };
const emailNotVerified = (status) => ({
  type: "https://helena.example/problems/email-not-verified",
  title: "Confirme seu e-mail para continuar",
  status,
  code: "email_not_verified",
});
const LOOKUP_NOT_FOUND = {
  type: "https://helena.example/problems/not-found",
  title: "Não encontramos um pedido com esses dados",
  status: 404,
  code: "not_found",
};

const carts = new Map();
const requests = [];
// What the store sent to POST …/payments, so a test can check no card data reached the API (CHK-18).
const paymentBodies = [];
// What the store sent to PUT …/customer, so a test can check a signed-in purchase never sends the CPF (IDT-11).
const customerBodies = [];
// Orders by number, and the first answer given to each Idempotency-Key (CHK-22).
const orders = new Map();
// IDT-02 to IDT-05: the pending code per e-mail, and when each code was sent (5 per hour).
const codes = new Map();
const codeTimes = new Map();
const answered = new Map();
// IDT-08 to IDT-11, IDT-14: accounts by e-mail ({ password: string | null, details: { name, cpf, phone } | null })
// and sessions by token (→ e-mail).
const accounts = new Map();
const sessions = new Map();
let nextOrder = 100001;

// Test hooks: sizes marked sold out and quantity limits apply to every cart.
const soldOutIds = new Set();
const maxById = new Map();

const quoteFor = (cart) => (cart.cep ? (QUOTES[cart.cep] ?? QUOTES["99999999"]) : null);

function newItem(size, quantity, extra = {}) {
  const product = size?.product;
  return {
    id: randomUUID(),
    productSizeId: size?.id ?? extra.productSizeId,
    slug: product?.slug ?? "produto-de-teste",
    name: product?.name ?? "Produto de teste",
    color: product?.color?.name ?? "Azul",
    size: size?.label ?? "M",
    photo: product?.photo ?? photo("tshirt", "Produto de teste"),
    unitPrice: product?.price ?? 10000,
    quantity,
    maxQuantity: 10,
    soldOut: false,
    ...extra,
  };
}

function cartBody(cart) {
  const items = cart.items.map((i) => ({
    ...i,
    maxQuantity: maxById.get(i.productSizeId) ?? i.maxQuantity,
    soldOut: i.soldOut || soldOutIds.has(i.productSizeId),
    subtotal: i.unitPrice * i.quantity,
  }));
  const couponPercent = cart.coupon ? COUPONS[cart.coupon] : 0;
  const totals = cartTotals({ lines: items, couponPercent, quote: quoteFor(cart), chosen: cart.chosen });
  return {
    id: cart.id,
    items,
    pieceCount: items.filter((i) => !i.soldOut).reduce((sum, i) => sum + i.quantity, 0),
    coupon: cart.coupon ? { code: cart.coupon, percent: couponPercent } : null,
    cep: cart.cep,
    verifiedEmail: cart.verifiedEmail ?? null,
    chosenDelivery: cart.chosen,
    reservationExpiresAt: reservedOrderEnd(cart.id),
    ...totals,
  };
}

function reservedOrderEnd(cartId) {
  const now = Date.now();
  const order = [...orders.values()].find((o) => o.cartId === cartId && isReserved(o, now));
  return order ? new Date(order.reservationEndsAt).toISOString() : null;
}

// Order lines with the stock as it is now (test hooks may have changed it since the order was made).
const liveLines = (order) =>
  order.lines.map((l) => ({
    ...l,
    soldOut: l.soldOut || soldOutIds.has(l.productSizeId),
    maxQuantity: maxById.get(l.productSizeId) ?? l.maxQuantity,
  }));
const othersThan = (order) => [...orders.values()].filter((o) => o !== order);

function maskEmail(email) {
  const [local, domain] = email.split("@");
  return `${local[0]}***${local.length > 1 ? local.at(-1) : ""}@${domain}`;
}

const ORDER_STEPS = ["payment_confirmed", "preparing", "shipped", "delivered"];

// PED-03 to PED-08: moves a paid order forward, dating every step up to `to` now.
function advanceOrder(order, to, code) {
  if (!order?.paidAt || !["preparing", "shipped", "delivered", "support_in_progress"].includes(to)) return false;
  const now = new Date();
  const last = to === "support_in_progress" ? "delivered" : to;
  order.stepDates ??= {};
  for (const step of ORDER_STEPS.slice(1, ORDER_STEPS.indexOf(last) + 1)) order.stepDates[step] ??= now.toISOString();
  order.status = to;
  if (to === "shipped" && code && order.delivery.type !== "courier") {
    order.delivery = { ...order.delivery, trackingCode: code, trackingLink: `https://rastreio.exemplo/${code}` };
  }
  if (to === "delivered") {
    order.delivery = { ...order.delivery, deliveredAt: now.toISOString() };
    const deadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    order.returnAvailability = { allowed: true, deadline, reason: null };
  }
  if (to === "support_in_progress") {
    order.return = { reason: "wrong_size", status: "in_progress", requestedAt: now.toISOString() };
    order.returnAvailability = { allowed: false, deadline: null, reason: "return_already_requested" };
  }
  return true;
}

// CTA-03: the full address goes only to the account that bought it (PED-05).
function orderBody(order, { withAddress = false } = {}) {
  const now = Date.now();
  const status = orderStatus(order, now);
  return {
    number: order.number,
    createdAt: order.createdAt,
    status,
    steps: ORDER_STEPS.map((step) => ({
      step,
      completedAt: step === "payment_confirmed" ? order.paidAt : (order.stepDates?.[step] ?? null),
    })),
    items: order.items,
    ...order.totals,
    reservationExpiresAt: isReserved(order, now) ? new Date(order.reservationEndsAt).toISOString() : null,
    payment: order.payment,
    delivery: withAddress ? { ...order.delivery, address: order.customer.address } : order.delivery,
    maskedEmail: maskEmail(order.email),
    return: order.return ?? null,
    returnAvailability: order.returnAvailability ?? { allowed: false, deadline: null, reason: "order_not_delivered" },
  };
}

const filled = (v) => typeof v === "string" && v.length > 0;
function validCustomer(body) {
  const a = body?.address;
  const c = body?.consents;
  return (
    [body?.name, body?.cpf, body?.email, body?.phone].every(filled) &&
    [a?.cep, a?.street, a?.number, a?.neighborhood, a?.city, a?.state].every(filled) &&
    typeof c?.email === "boolean" &&
    typeof c?.whatsapp === "boolean" &&
    filled(c?.textVersion)
  );
}

// CTA-05: the favorite first, then the newest first; the first address becomes the favorite, and removing
// the favorite passes it to the newest remaining one. At most 10 per account.
const ADDRESS_LIMIT = conflict("address_limit", "Você chegou ao limite de 10 endereços");
const ADDRESS_KEYS = ["cep", "street", "number", "complement", "neighborhood", "city", "state"];
let addressClock = 0; // creation order, so two addresses saved in the same millisecond still sort
function newAddress(fields, extra = {}) {
  const address = { id: randomUUID(), favorite: false, createdAt: ++addressClock };
  for (const key of ADDRESS_KEYS) address[key] = fields[key] ?? null;
  return { ...address, ...extra };
}
function addressList(account) {
  return [...account.addresses]
    .sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.createdAt - a.createdAt)
    .map((a) => ({ id: a.id, favorite: a.favorite, ...Object.fromEntries(ADDRESS_KEYS.map((key) => [key, a[key]])) }));
}
function validAddress(body) {
  return ["cep", "street", "number", "neighborhood", "city", "state"].every((key) => filled(body?.[key]));
}
async function addressRoute(req, account, id, action) {
  const list = account.addresses;
  if (!id && req.method === "GET") return [200, addressList(account)];
  if (!id && req.method === "POST") {
    const body = await readJson(req);
    if (!validAddress(body)) return [422, INVALID_DATA];
    if (list.length >= 10) return [409, ADDRESS_LIMIT];
    const address = newAddress(body, { favorite: list.length === 0 });
    list.push(address);
    return [201, addressList(account).find((a) => a.id === address.id)];
  }
  const address = list.find((a) => a.id === id);
  if (!address) return [404, NOT_FOUND];
  if (action === "favorite" && req.method === "PUT") {
    for (const a of list) a.favorite = a === address;
    return [200, addressList(account)];
  }
  if (action) return null;
  if (req.method === "PUT") {
    const body = await readJson(req);
    if (!validAddress(body)) return [422, INVALID_DATA];
    for (const key of ADDRESS_KEYS) address[key] = body[key] ?? null;
    return [200, addressList(account).find((a) => a.id === id)];
  }
  if (req.method === "DELETE") {
    list.splice(list.indexOf(address), 1);
    if (address.favorite && list.length) list.reduce((newest, a) => (a.createdAt > newest.createdAt ? a : newest)).favorite = true;
    return [204, null];
  }
  return null;
}

// Same Idempotency-Key on the same path: the first answer again, with nothing done twice.
async function once(req, path, run) {
  const key = req.headers["idempotency-key"];
  const id = `${path} ${key}`;
  if (key && answered.has(id)) return answered.get(id);
  const answer = await run();
  if (key) answered.set(id, answer);
  return answer;
}

// A code works once, for 10 minutes; 5 wrong tries kill it (IDT-04).
function takeCode(email, code) {
  const pending = codes.get(email);
  if (!pending || pending.expiresAt < Date.now() || pending.tries >= 5) return false;
  if (pending.code !== code) {
    pending.tries += 1;
    return false;
  }
  codes.delete(email);
  return true;
}

function sendCode(email) {
  const hourAgo = Date.now() - 60 * 60 * 1000;
  const times = (codeTimes.get(email) ?? []).filter((t) => t > hourAgo);
  if (email === "limite@exemplo.com" || times.length >= 5) return [429, TOO_MANY_REQUESTS];
  codeTimes.set(email, [...times, Date.now()]);
  codes.set(email, { code: String(randomInt(0, 1_000_000)).padStart(6, "0"), tries: 0, expiresAt: Date.now() + 10 * 60 * 1000 });
  return [202, null];
}

// IDT-08 to IDT-10: with `code` the account is created if missing; with `password` it must match.
// One 401 for every failure, so nobody learns which e-mails have an account.
function startSession({ email, code, password, cartId }) {
  if (typeof email !== "string") return [401, NOT_AUTHENTICATED];
  let newAccount = false;
  if (typeof code === "string") {
    if (!takeCode(email, code)) return [401, NOT_AUTHENTICATED];
    newAccount = !accounts.has(email);
    if (newAccount) accounts.set(email, { password: null, details: null, addresses: [] });
  } else if (typeof password !== "string" || !accounts.get(email)?.password || accounts.get(email).password !== password) {
    return [401, NOT_AUTHENTICATED];
  }
  const cart = cartId ? carts.get(cartId) : null;
  if (cart) cart.verifiedEmail = email;
  const token = randomUUID();
  sessions.set(token, email);
  const detailsComplete = Boolean(accounts.get(email).details);
  return [201, { token, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), newAccount, detailsComplete }];
}

// The Customer schema of an account (IDT-11, IDT-14, CTA-06).
function customerBody(email) {
  const { details, password } = accounts.get(email);
  const cpf = details?.cpf ?? "";
  return {
    name: details?.name ?? "",
    email,
    phone: details?.phone ?? "",
    maskedCpf: `***.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-**`,
    hasPassword: Boolean(password),
  };
}

// The e-mail of the bearer session; undefined without the header, null for an unknown token.
function sessionEmail(req) {
  const auth = req.headers.authorization;
  if (!auth) return undefined;
  return sessions.get(auth.replace(/^Bearer /, "")) ?? null;
}

function createOrder(cartId) {
  const cart = carts.get(cartId);
  if (!cart) return [404, NOT_FOUND];
  if (!cart.verifiedEmail) return [409, emailNotVerified(409)];
  if (!cart.customer || !cart.chosen || cart.items.length === 0) return [422, INCOMPLETE_CART];
  // Going to payment again replaces the cart's order still awaiting payment and frees its pieces.
  for (const [number, o] of orders) if (o.cartId === cartId && o.status === "awaiting_payment") orders.delete(number);
  const body = cartBody(cart);
  const lines = body.items.map((i) => ({
    productSizeId: i.productSizeId,
    quantity: i.quantity,
    maxQuantity: i.maxQuantity,
    soldOut: i.soldOut,
    name: i.name,
  }));
  const now = Date.now();
  const check = canReserve(lines, [...orders.values()], now);
  if (!check.ok) return [409, soldOutProblem(check.name)];
  const chosen = body.deliveryOptions.find((o) => o.type === cart.chosen);
  const order = {
    number: `HL-${nextOrder++}`,
    access: randomUUID(),
    cartId,
    createdAt: new Date(now).toISOString(),
    status: "awaiting_payment",
    reservationEndsAt: now + RESERVATION_MS,
    paidAt: null,
    lines,
    items: body.items.map(({ name, color, size, photo, unitPrice, quantity }) => ({ name, color, size, photo, unitPrice, quantity })),
    totals: {
      subtotal: body.subtotal,
      coupon: cart.coupon,
      discount: body.discount,
      shippingAmount: body.shippingAmount ?? 0,
      total: body.total,
      installmentPlan: body.installmentPlan,
    },
    delivery: {
      type: cart.chosen,
      deliveryTime: chosen?.deliveryTime ?? "",
      city: cart.customer.address.city,
      state: cart.customer.address.state,
      trackingCode: null,
      trackingLink: null,
      deliveredAt: null,
    },
    email: cart.customer.email,
    // The purchase keeps its own copy of the details (CHK-05), and the account it was made with (CTA-03).
    customer: structuredClone(cart.customer),
    accountEmail: cart.accountEmail ?? null,
    payment: null,
  };
  orders.set(order.number, order);
  return [201, { access: order.access, order: orderBody(order) }];
}

function pay(order, { method, cardToken, installments }) {
  const now = Date.now();
  if (orderStatus(order, now) === "payment_confirmed") return [409, ALREADY_PAID];
  if (method !== "pix" && method !== "card") return [422, INVALID_DATA];
  const max = order.totals.installmentPlan.maxInstallments;
  if (method === "card" && (!filled(cardToken) || !Number.isInteger(installments) || installments < 1 || installments > max)) {
    return [422, INVALID_DATA];
  }
  // A new attempt after a decline or an expired reservation reserves again, if there is stock (CHK-17, CHK-21).
  if (!isReserved(order, now)) {
    const check = canReserve(liveLines(order), othersThan(order), now);
    if (!check.ok) return [409, soldOutProblem(check.name)];
    order.status = "awaiting_payment";
    order.reservationEndsAt = now + RESERVATION_MS;
  }
  const base = { id: randomUUID(), method, installments: method === "card" ? installments : null, message: null, pix: null };
  if (method === "pix") {
    const expiresAt = new Date(order.reservationEndsAt).toISOString();
    const pixCode = `00020126580014br.gov.bcb.pix0136${order.number}52040000530398654${order.totals.total}5802BR6304ABCD`;
    order.payment = { ...base, status: "pending", pix: { pixCode, qrCode: QR_CODE, expiresAt } };
  } else if (cardToken.endsWith("0002")) {
    order.payment = { ...base, status: "declined", message: DECLINED_MESSAGE };
    order.reservationEndsAt = null; // a decline releases the reservation right away
  } else {
    order.payment = { ...base, status: "approved" };
    order.status = "payment_confirmed";
    order.paidAt = new Date(now).toISOString();
  }
  return [201, order.payment];
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
    const cart = { id: randomUUID(), items: [], cep: null, chosen: null, coupon: null, customer: null };
    carts.set(cart.id, cart);
    return [201, cartBody(cart)];
  }
  if (req.method === "POST" && url.pathname === "/v1/email-codes") return sendCode((await readJson(req)).email);
  if (req.method === "POST" && url.pathname === "/v1/sessions") return startSession(await readJson(req));
  // CTA-10: the token stops working at once.
  if (req.method === "DELETE" && url.pathname === "/v1/sessions/current") {
    const token = req.headers.authorization?.replace(/^Bearer /, "");
    return token && sessions.delete(token) ? [204, null] : [401, NOT_AUTHENTICATED];
  }
  if (req.method === "PUT" && url.pathname === "/v1/account/password") {
    const email = sessionEmail(req);
    if (!email) return [401, NOT_AUTHENTICATED];
    const { password } = await readJson(req);
    if (typeof password !== "string" || password.length < 8 || password.length > 72) return [422, INVALID_DATA];
    accounts.get(email).password = password;
    return [204, null];
  }
  // IDT-11, CTA-06: the account's details, with the CPF partly hidden.
  if (req.method === "GET" && url.pathname === "/v1/account") {
    const email = sessionEmail(req);
    if (!email) return [401, NOT_AUTHENTICATED];
    return [200, customerBody(email)];
  }
  // CTA-06: name and phone; a new e-mail only with its code, checked before saying it has another account.
  if (req.method === "PATCH" && url.pathname === "/v1/account") {
    const email = sessionEmail(req);
    if (!email) return [401, NOT_AUTHENTICATED];
    const { name, phone, email: newEmail, code } = await readJson(req);
    const account = accounts.get(email);
    if ((name !== undefined && !filled(name)) || (phone !== undefined && !filled(phone))) return [422, INVALID_DATA];
    if (newEmail !== undefined) {
      if (!filled(code)) return [422, emailNotVerified(422)];
      if (!takeCode(newEmail, code)) return [401, INVALID_CODE];
      if (newEmail !== email && accounts.has(newEmail)) return [409, EMAIL_IN_USE];
      accounts.delete(email);
      accounts.set(newEmail, account);
      for (const [token, owner] of sessions) if (owner === email) sessions.set(token, newEmail);
      for (const order of orders.values()) if (order.accountEmail === email) order.accountEmail = newEmail;
    }
    if (account.details) account.details = { ...account.details, ...(name !== undefined ? { name } : {}), ...(phone !== undefined ? { phone } : {}) };
    return [200, customerBody(newEmail ?? email)];
  }
  // CTA-05, CTA-11: the account's addresses; another account's id is a 404, like one that doesn't exist.
  if (parts[1] === "account" && parts[2] === "addresses") {
    const email = sessionEmail(req);
    if (!email) return [401, NOT_AUTHENTICATED];
    return addressRoute(req, accounts.get(email), parts[3] ? decodeURIComponent(parts[3]) : null, parts[4]);
  }
  // CTA-03, CTA-04: the account's orders, newest first.
  if (req.method === "GET" && url.pathname === "/v1/account/orders") {
    const email = sessionEmail(req);
    if (!email) return [401, NOT_AUTHENTICATED];
    const pageNumber = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const perPage = Math.min(48, Math.max(1, Number(url.searchParams.get("perPage")) || 24));
    const mine = [...orders.values()].filter((o) => o.accountEmail === email).reverse(); // inserted oldest first
    const now = Date.now();
    const items = mine
      .slice((pageNumber - 1) * perPage, pageNumber * perPage)
      .map((o) => ({ number: o.number, createdAt: o.createdAt, status: orderStatus(o, now), total: o.totals.total }));
    return [200, { items, total: mine.length, page: pageNumber, perPage }];
  }
  // IDT-14: once per account, one CPF per account.
  if (req.method === "PUT" && url.pathname === "/v1/account/details") {
    const email = sessionEmail(req);
    if (!email) return [401, NOT_AUTHENTICATED];
    const { name, cpf, phone } = await readJson(req);
    if (![name, cpf, phone].every(filled)) return [422, INVALID_DATA];
    const account = accounts.get(email);
    if (account.details) return [409, DETAILS_ALREADY_SET];
    if ([...accounts.entries()].some(([other, a]) => other !== email && a.details?.cpf === cpf)) return [409, CPF_IN_USE];
    account.details = { name, cpf, phone };
    return [200, customerBody(email)];
  }
  // PED-05, PED-06: same 404 for any wrong pair; limite@exemplo.com hits the attempt limit.
  if (req.method === "POST" && url.pathname === "/v1/orders/access") {
    const { number, email } = await readJson(req);
    if (email === "limite@exemplo.com") return [429, TOO_MANY_REQUESTS];
    const order = orders.get(number);
    if (!order || order.email.toLowerCase() !== String(email).toLowerCase()) return [404, LOOKUP_NOT_FOUND];
    return [201, { access: order.access, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() }];
  }
  if (req.method === "POST" && url.pathname === "/v1/orders") {
    const { cartId } = await readJson(req);
    return once(req, url.pathname, () => createOrder(cartId));
  }
  if (parts[1] === "orders" && parts.length >= 3) {
    const order = orders.get(decodeURIComponent(parts[2]));
    if (!order) return [404, NOT_FOUND];
    // CTA-03, CTA-11: with a session, only the account's own orders, with the address; another's is a 404.
    if (req.method === "GET" && parts.length === 3 && req.headers.authorization) {
      const email = sessionEmail(req);
      if (!email) return [401, NOT_AUTHENTICATED];
      return order.accountEmail === email ? [200, orderBody(order, { withAddress: true })] : [404, NOT_FOUND];
    }
    if (req.headers["x-order-access"] !== order.access) return [401, NOT_AUTHENTICATED];
    if (req.method === "GET" && parts.length === 3) return [200, orderBody(order)];
    if (req.method === "POST" && parts[3] === "payments") {
      const body = await readJson(req);
      paymentBodies.push(body);
      return once(req, url.pathname, () => pay(order, body));
    }
    return null;
  }
  if (parts[1] === "carts" && parts.length >= 3) {
    const cart = carts.get(parts[2]);
    if (!cart) return [404, NOT_FOUND];
    if (req.method === "GET" && parts.length === 3) return [200, cartBody(cart)];
    if (req.method === "PUT" && parts[3] === "cep") {
      cart.cep = (await readJson(req)).cep;
      if (!quoteFor(cart)?.options.some((o) => o.type === cart.chosen)) cart.chosen = null;
      return [200, cartBody(cart)];
    }
    if (req.method === "PUT" && parts[3] === "customer") {
      const sent = await readJson(req);
      customerBodies.push(sent);
      const signedIn = sessionEmail(req);
      if (signedIn === null) return [401, NOT_AUTHENTICATED];
      const details = signedIn ? accounts.get(signedIn)?.details : null;
      if (signedIn && !details) return [409, DETAILS_MISSING]; // IDT-14
      // IDT-11: signed in, the purchase gets a copy of the account's name, CPF and phone.
      const body = details ? { ...sent, ...details } : sent;
      if (!validCustomer(body)) return [422, INVALID_DATA];
      // IDT-11: a session whose e-mail is the body's confirms it for this bag.
      if (signedIn === body.email) cart.verifiedEmail = body.email;
      if (body.email !== cart.verifiedEmail) return [422, emailNotVerified(422)];
      const { saveAddress, ...customer } = body;
      cart.customer = customer;
      cart.accountEmail = signedIn ?? null;
      // CTA-12: signed in and asked, the address also goes to the account, unless an equal one is there or it has 10.
      const account = signedIn ? accounts.get(signedIn) : null;
      const a = customer.address;
      const same = (b) => ["cep", "street", "number"].every((k) => a[k] === b[k]) && (a.complement ?? null) === (b.complement ?? null);
      if (saveAddress === true && account && account.addresses.length < 10 && !account.addresses.some(same)) {
        account.addresses.push(newAddress(a, { favorite: account.addresses.length === 0 }));
      }
      return [200, cartBody(cart)];
    }
    if (parts[3] === "email-verification") {
      if (req.method === "DELETE") {
        cart.verifiedEmail = null;
        return [204, null];
      }
      const { email, code } = await readJson(req);
      if (!takeCode(email, code)) return [401, INVALID_CODE];
      cart.verifiedEmail = email;
      return [204, null];
    }
    if (req.method === "PUT" && parts[3] === "delivery") {
      const { type } = await readJson(req);
      if (!quoteFor(cart)?.options.some((o) => o.type === type)) return [422, UNAVAILABLE_DELIVERY];
      cart.chosen = type;
      return [200, cartBody(cart)];
    }
    if (parts[3] === "coupon") {
      if (req.method === "DELETE") cart.coupon = null;
      else if (req.method === "PUT") {
        const code = String((await readJson(req)).code ?? "").toUpperCase();
        if (!COUPONS[code]) return [422, INVALID_COUPON];
        cart.coupon = code;
      } else return null;
      return [200, cartBody(cart)];
    }
    if (req.method === "POST" && parts[3] === "items") {
      const { productSizeId, quantity } = await readJson(req);
      const size = ALL_SIZES.find((s) => s.id === productSizeId);
      if (!size) return [404, NOT_FOUND];
      if (!size.available || soldOutIds.has(productSizeId)) return [409, OUT_OF_STOCK];
      if (!Number.isInteger(quantity) || quantity < 1) return [422, INVALID_QUANTITY];
      const item = cart.items.find((i) => i.productSizeId === productSizeId);
      const max = maxById.get(productSizeId) ?? item?.maxQuantity ?? 10;
      if ((item?.quantity ?? 0) + quantity > max) return [409, OUT_OF_STOCK];
      if (item) item.quantity += quantity;
      else cart.items.push(newItem(size, quantity));
      return [200, cartBody(cart)];
    }
    if (parts[3] === "items" && parts.length === 5) {
      const index = cart.items.findIndex((i) => i.id === parts[4]);
      if (index < 0) return [404, NOT_FOUND];
      if (req.method === "DELETE") cart.items.splice(index, 1);
      else if (req.method === "PATCH") {
        const { quantity } = await readJson(req);
        if (!Number.isInteger(quantity) || quantity < 1) return [422, INVALID_QUANTITY];
        const line = cart.items[index];
        const max = maxById.get(line.productSizeId) ?? line.maxQuantity;
        if (line.soldOut || soldOutIds.has(line.productSizeId) || quantity > max) return [409, OUT_OF_STOCK];
        cart.items[index].quantity = quantity;
      } else return null;
      return [200, cartBody(cart)];
    }
  }
  return null;
}

const failing = new Set();
// Paths ending with one of these answer 2 s late, so a test can act while the store waits (/__slow?suffix=).
const slowSuffixes = new Set();

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
  if (req.method === "POST" && url.pathname === "/__slow") {
    slowSuffixes.add(url.searchParams.get("suffix"));
    return send(res, 200, { ok: true });
  }
  if (req.method === "POST" && url.pathname === "/__reset") {
    failing.clear();
    slowSuffixes.clear();
    carts.clear();
    soldOutIds.clear();
    maxById.clear();
    orders.clear();
    codes.clear();
    codeTimes.clear();
    accounts.clear();
    sessions.clear();
    answered.clear();
    requests.length = 0;
    paymentBodies.length = 0;
    customerBodies.length = 0;
    return send(res, 200, { ok: true });
  }
  if (req.method === "POST" && url.pathname === "/__carts") {
    const { lines = [], cep = null, chosen = null, coupon = null, verifiedEmail = null } = await readJson(req);
    const cart = { id: randomUUID(), cep, chosen, coupon, verifiedEmail, customer: null, items: [] };
    for (const { productSizeId, ...extra } of lines) {
      const size = ALL_SIZES.find((s) => s.id === productSizeId);
      cart.items.push(newItem(size, extra.quantity ?? 1, { productSizeId, ...extra }));
    }
    carts.set(cart.id, cart);
    return send(res, 200, { id: cart.id });
  }
  if (req.method === "POST" && url.pathname === "/__sold-out") {
    soldOutIds.add(url.searchParams.get("productSizeId"));
    return send(res, 200, { ok: true });
  }
  if (req.method === "POST" && url.pathname === "/__max") {
    maxById.set(url.searchParams.get("productSizeId"), Number(url.searchParams.get("max")));
    return send(res, 200, { ok: true });
  }
  // Checkout hooks: mark a PIX paid (CHK-16), end a reservation now (CHK-17), read the saved lead (CHK-05, CHK-07).
  if (req.method === "POST" && url.pathname === "/__pay") {
    const order = orders.get(url.searchParams.get("number"));
    if (order?.payment?.method === "pix" && order.payment.status === "pending") {
      order.payment = { ...order.payment, status: "approved", pix: null };
      order.status = "payment_confirmed";
      order.paidAt = new Date().toISOString();
    }
    return send(res, 200, { ok: Boolean(order) });
  }
  if (req.method === "POST" && url.pathname === "/__advance") {
    const order = orders.get(url.searchParams.get("number"));
    return send(res, 200, { ok: advanceOrder(order, url.searchParams.get("to"), url.searchParams.get("code")) });
  }
  if (req.method === "POST" && url.pathname === "/__expire") {
    const order = orders.get(url.searchParams.get("number"));
    if (order) order.reservationEndsAt = Date.now();
    return send(res, 200, { ok: Boolean(order) });
  }
  // IDT-*: the pending code of an e-mail, and a bag losing its confirmation behind the screen's back.
  if (url.pathname === "/__codes") return send(res, 200, codes.get(url.searchParams.get("email")) ?? null);
  if (req.method === "POST" && url.pathname === "/__unverify") {
    const cart = carts.get(url.searchParams.get("cartId"));
    if (cart) cart.verifiedEmail = null;
    return send(res, 200, { ok: Boolean(cart) });
  }
  if (req.method === "POST" && url.pathname === "/__accounts") {
    const { email, password = null, details = null, addresses = [] } = await readJson(req);
    // Listed oldest first; the first becomes the favorite unless one says otherwise (CTA-05).
    const saved = addresses.map((a) => newAddress(a, a.id ? { id: a.id } : {}));
    if (saved.length) (addresses.some((a) => a.favorite) ? saved[addresses.findIndex((a) => a.favorite)] : saved[0]).favorite = true;
    accounts.set(email, { password, details, addresses: saved });
    return send(res, 200, { ok: true });
  }
  if (req.method === "POST" && url.pathname === "/__end-session") {
    return send(res, 200, { ok: sessions.delete(url.searchParams.get("token")) });
  }
  if (url.pathname === "/__customer") return send(res, 200, carts.get(url.searchParams.get("cartId"))?.customer ?? null);
  // Lets a test check which API paths the store called.
  if (url.pathname === "/__requests") return send(res, 200, requests);
  if (url.pathname === "/__payment-bodies") return send(res, 200, paymentBodies);
  if (url.pathname === "/__customer-bodies") return send(res, 200, customerBodies);
  requests.push(url.pathname);
  if ([...slowSuffixes].some((suffix) => url.pathname.endsWith(suffix))) await new Promise((r) => setTimeout(r, 2000));
  if (failing.has(url.pathname)) return send(res, 500, INTERNAL_ERROR);
  if (req.method === "GET" && url.pathname === "/v1/home") return send(res, 200, HOME);
  if (req.method === "GET" && url.pathname === "/v1/products") return send(res, ...listProducts(url.searchParams));
  const answer = await route(req, url);
  if (answer) return send(res, ...answer);
  send(res, 404, NOT_FOUND);
}).listen(PORT, () => console.log(`fake API on http://localhost:${PORT}`));
