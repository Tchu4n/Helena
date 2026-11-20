// Bag rules of docs/SPEC-CLIENT.md section 2, as a pure function the fake API uses.
const FREE_SHIPPING_FROM = 30000;
const MIN_INSTALLMENT = 5000;

export function cartTotals({ lines, couponPercent, quote, chosen }) {
  const kept = lines.filter((l) => !l.soldOut);
  const subtotal = kept.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const discount = Math.round((subtotal * couponPercent) / 100);
  const afterCoupon = subtotal - discount;
  const prices = (quote?.options ?? []).map((o) => o.price);
  const cheapest = Math.min(...prices);
  const free = afterCoupon >= FREE_SHIPPING_FROM;
  const deliveryOptions = (quote?.options ?? []).map((o) => {
    const isFree = free && o.price === cheapest;
    return { ...o, price: isFree ? 0 : o.price, free: isFree };
  });
  const shippingAmount = deliveryOptions.find((o) => o.type === chosen)?.price ?? null;
  const total = afterCoupon + (shippingAmount ?? 0);
  const maxInstallments = Math.max(1, Math.min(6, Math.floor(total / MIN_INSTALLMENT)));
  return {
    subtotal,
    discount,
    amountToFreeShipping: Math.max(0, FREE_SHIPPING_FROM - afterCoupon),
    deliveryOptions,
    shippingAmount,
    total,
    installmentPlan: { maxInstallments, installmentAmount: Math.floor(total / maxInstallments) },
    canCheckout: kept.length > 0 && kept.length === lines.length,
  };
}
