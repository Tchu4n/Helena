// The API types are generated from the contract, never written by hand (CLAUDE.md).
// This fails when contract/openapi.yaml changes and `npm run types` was not run.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import openapiTS, { astToString } from "openapi-typescript";

test("src/lib/api-types.ts matches contract/openapi.yaml", async () => {
  const ast = await openapiTS(new URL("../contract/openapi.yaml", import.meta.url));
  const current = readFileSync(new URL("../src/lib/api-types.ts", import.meta.url), "utf8");
  assert.equal(current.trim().endsWith(astToString(ast).trim()), true, "run `npm run types`");
});
