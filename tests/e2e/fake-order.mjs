// Reservation rules of docs/SPEC-CLIENT.md (CHK-12, CHK-13, CHK-17), as pure functions the fake API uses.
// `now` is passed in (ms), so the tests can move the clock.
export const RESERVATION_MS = 15 * 60 * 1000;

export function isReserved(order, now) {
  return order.status === "awaiting_payment" && order.reservationEndsAt !== null && now < order.reservationEndsAt;
}

export function orderStatus(order, now) {
  if (order.status === "awaiting_payment" && !isReserved(order, now)) return "reservation_expired";
  return order.status;
}

export function reservedQuantity(orders, productSizeId, now) {
  return orders
    .filter((o) => isReserved(o, now))
    .flatMap((o) => o.lines)
    .filter((l) => l.productSizeId === productSizeId)
    .reduce((sum, l) => sum + l.quantity, 0);
}

// `orders` must leave out the order being reserved, so her own old reservation never blocks her.
export function canReserve(lines, orders, now) {
  const blocked = lines.find(
    (l) => l.soldOut || reservedQuantity(orders, l.productSizeId, now) + l.quantity > l.maxQuantity,
  );
  return blocked ? { ok: false, name: blocked.name } : { ok: true };
}
