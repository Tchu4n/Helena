// Reservation rules of the fake API (CHK-12, CHK-13, CHK-17), as pure functions.
import { test } from "node:test";
import assert from "node:assert/strict";
import { RESERVATION_MS, canReserve, isReserved, orderStatus, reservedQuantity } from "./e2e/fake-order.mjs";

const line = (extra = {}) => ({ productSizeId: "a", quantity: 1, maxQuantity: 2, soldOut: false, name: "Jaqueta sarja", ...extra });
const other = { status: "awaiting_payment", reservationEndsAt: 10_000, lines: [{ productSizeId: "a", quantity: 2 }] };

test("reservation ends after 15 minutes", () => {
  const order = { status: "awaiting_payment", reservationEndsAt: 1000 + RESERVATION_MS, lines: [] };
  assert.equal(orderStatus(order, 1000 + RESERVATION_MS - 1), "awaiting_payment");
  assert.equal(isReserved(order, 1000 + RESERVATION_MS - 1), true);
  assert.equal(orderStatus(order, 1000 + RESERVATION_MS), "reservation_expired");
  assert.equal(isReserved(order, 1000 + RESERVATION_MS), false);
});

test("a paid order keeps its status and holds no reservation", () => {
  const paid = { ...other, status: "payment_confirmed" };
  assert.equal(orderStatus(paid, 20_000), "payment_confirmed");
  assert.equal(isReserved(paid, 0), false);
});

test("CHK-13 another order's reservation counts against stock", () => {
  assert.equal(reservedQuantity([other], "a", 0), 2);
  assert.deepEqual(canReserve([line()], [other], 0), { ok: false, name: "Jaqueta sarja" });
  assert.deepEqual(canReserve([line({ maxQuantity: 3 })], [other], 0), { ok: true });
});

test("an expired reservation no longer holds stock", () => {
  assert.equal(reservedQuantity([other], "a", 10_000), 0);
  assert.deepEqual(canReserve([line()], [other], 10_000), { ok: true });
});

test("a sold-out line cannot be reserved", () => {
  assert.deepEqual(canReserve([line({ soldOut: true })], [], 0), { ok: false, name: "Jaqueta sarja" });
});
