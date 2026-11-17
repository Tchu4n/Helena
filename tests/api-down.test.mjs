// GER-06: with nothing listening on the API port, the screen still gets a Problem to show.
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.API_URL = "http://localhost:1";
const { apiGet } = await import("../src/lib/api.ts");

test("GER-06 a closed port becomes internal_error", async () => {
  const result = await apiGet("/v1/home");
  assert.equal(result.ok, false);
  assert.equal(result.problem.code, "internal_error");
});
