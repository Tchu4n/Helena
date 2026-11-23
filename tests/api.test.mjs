// GER-06: every API failure reaches the screen as a Problem (RFC 9457) the screen can show.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";

let lastUrl = "";
let lastRequest = null;
const server = createServer(async (req, res) => {
  lastUrl = req.url;
  let raw = "";
  for await (const chunk of req) raw += chunk;
  lastRequest = { method: req.method, type: req.headers["content-type"], body: raw, headers: req.headers };
  if (req.url.startsWith("/accepted")) {
    res.writeHead(202);
    return res.end();
  }
  if (req.url.startsWith("/created")) {
    res.writeHead(201);
    return res.end();
  }
  if (req.url.startsWith("/ok")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ hello: "world" }));
  }
  if (req.url.startsWith("/invalid")) {
    res.writeHead(422, { "Content-Type": "application/problem+json" });
    return res.end(JSON.stringify({ type: "about:blank", title: "Dados inválidos", status: 422, code: "invalid_data" }));
  }
  if (req.url.startsWith("/broken")) {
    res.writeHead(500, { "Content-Type": "text/html" });
    return res.end("<h1>oops</h1>");
  }
  // /slow never answers
});

let apiGet, apiPost, apiPut, apiPatch, apiDelete;
before(async () => {
  await new Promise((resolve) => server.listen(0, resolve));
  process.env.API_URL = `http://localhost:${server.address().port}`;
  ({ apiGet, apiPost, apiPut, apiPatch, apiDelete } = await import("../src/lib/api.ts"));
});
after(() => server.close());

const INTERNAL_ERROR_TITLE = "Não foi possível concluir. Tente de novo";

test("200 with JSON returns the data", async () => {
  assert.deepEqual(await apiGet("/ok"), { ok: true, data: { hello: "world" } });
});

test("problem+json error returns the received problem", async () => {
  const result = await apiGet("/invalid");
  assert.equal(result.ok, false);
  assert.equal(result.problem.code, "invalid_data");
});

test("GER-06 a server that does not answer in 5 s becomes internal_error", { timeout: 10_000 }, async () => {
  const result = await apiGet("/slow");
  assert.equal(result.ok, false);
  assert.equal(result.problem.code, "internal_error");
  assert.equal(result.problem.title, INTERNAL_ERROR_TITLE);
});

test("GER-06 a 500 without JSON becomes internal_error", async () => {
  const result = await apiGet("/broken");
  assert.equal(result.ok, false);
  assert.equal(result.problem.code, "internal_error");
  assert.equal(result.problem.title, INTERNAL_ERROR_TITLE);
});

test("undefined query values are left out of the URL", async () => {
  await apiGet("/ok", { category: "pants", size: undefined, page: 2 });
  assert.equal(lastUrl, "/ok?category=pants&page=2");
});

test("apiPost sends JSON and returns data", async () => {
  const result = await apiPost("/ok", { cep: "01310100" });
  assert.deepEqual(result, { ok: true, data: { hello: "world" } });
  assert.equal(lastRequest.method, "POST");
  assert.equal(lastRequest.type, "application/json");
  assert.deepEqual(JSON.parse(lastRequest.body), { cep: "01310100" });
});

test("apiPost maps problem+json", async () => {
  const result = await apiPost("/invalid", {});
  assert.equal(result.ok, false);
  assert.equal(result.problem.code, "invalid_data");
});

test("apiPost accepts 201 without body", async () => {
  assert.deepEqual(await apiPost("/created", {}), { ok: true, data: null });
});

test("IDT-02 apiPost accepts 202 without body (a code sent)", async () => {
  assert.deepEqual(await apiPost("/accepted", {}), { ok: true, data: null });
});

test("GER-06 apiPost timeout becomes internal_error", { timeout: 10_000 }, async () => {
  const result = await apiPost("/slow", {});
  assert.equal(result.ok, false);
  assert.equal(result.problem.code, "internal_error");
});

test("apiPut sends PUT with JSON", async () => {
  await apiPut("/ok", { cep: "01310100" });
  assert.equal(lastRequest.method, "PUT");
  assert.deepEqual(JSON.parse(lastRequest.body), { cep: "01310100" });
});

test("SAC-04 apiPatch sends PATCH with JSON", async () => {
  await apiPatch("/ok", { quantity: 2 });
  assert.equal(lastRequest.method, "PATCH");
  assert.deepEqual(JSON.parse(lastRequest.body), { quantity: 2 });
});

test("SAC-05 apiDelete sends DELETE without body", async () => {
  const result = await apiDelete("/ok");
  assert.equal(lastRequest.method, "DELETE");
  assert.equal(lastRequest.body, "");
  assert.deepEqual(result, { ok: true, data: { hello: "world" } });
});

test("apiPost without body sends no body (createCart has no request body)", async () => {
  await apiPost("/ok");
  assert.equal(lastRequest.method, "POST");
  assert.equal(lastRequest.body, "");
  assert.equal(lastRequest.type, undefined);
});

test("CHK-12 extra headers (Idempotency-Key, X-Order-Access) reach the API with the JSON type kept", async () => {
  await apiPost("/ok", { a: 1 }, { "Idempotency-Key": "k-1", "X-Order-Access": "acc" });
  assert.equal(lastRequest.headers["idempotency-key"], "k-1");
  assert.equal(lastRequest.headers["x-order-access"], "acc");
  assert.equal(lastRequest.type, "application/json");
  await apiGet("/ok", {}, { "X-Order-Access": "acc-2" });
  assert.equal(lastRequest.headers["x-order-access"], "acc-2");
  await apiPut("/ok", { b: 2 }, { "X-Forwarded-For": "203.0.113.7" });
  assert.equal(lastRequest.headers["x-forwarded-for"], "203.0.113.7");
});
