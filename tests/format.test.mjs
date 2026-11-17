// GER-09: every amount appears as R$ 1.234,56. The space after R$ is a no-break space (U+00A0),
// so the price never splits across two lines.
import { test } from "node:test";
import assert from "node:assert/strict";
import { formatPrice } from "../src/lib/format.ts";

test("GER-09 formats thousands and cents", () => assert.equal(formatPrice(123456), "R$ 1.234,56"));
test("GER-09 formats a round price", () => assert.equal(formatPrice(15900), "R$ 159,00"));
test("GER-09 formats zero", () => assert.equal(formatPrice(0), "R$ 0,00"));
