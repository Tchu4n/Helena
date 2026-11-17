// GER-06: every API failure reaches the screen as a Problem (RFC 9457) the screen can show.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";

let lastUrl = "";
const server = createServer((req, res) => {
  lastUrl = req.url;
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

let apiGet;
before(async () => {
  await new Promise((resolve) => server.listen(0, resolve));
  process.env.API_URL = `http://localhost:${server.address().port}`;
  ({ apiGet } = await import("../src/lib/api.ts"));
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
