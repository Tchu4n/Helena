import type { CartView } from "../views.ts";

// SAC-11, SAC-16: the amounts come ready from the API.
export function CartSummary({ cart }: { cart: CartView }) {
  return (
    <section aria-label="Resumo" className="flex flex-col gap-2 bg-card p-4 text-[0.9375rem]">
      <p className="flex justify-between gap-3">
        <span>Subtotal</span>
        <span className="tabular-nums">{cart.subtotal}</span>
      </p>
      {cart.discount && cart.coupon && (
        <p className="flex justify-between gap-3">
          <span>Desconto ({cart.coupon.code})</span>
          <span className="tabular-nums">{cart.discount}</span>
        </p>
      )}
      {cart.shipping && (
        <p className="flex justify-between gap-3">
          <span>Frete ({cart.shippingLabel})</span>
          <span className="tabular-nums">{cart.shipping}</span>
        </p>
      )}
      <p className="flex justify-between gap-3 border-t border-line pt-2.5 text-[1.0625rem] font-medium">
        <span>Total</span>
        <span className="tabular-nums">{cart.total}</span>
      </p>
      <p className="text-sm text-muted">{cart.installments}</p>
    </section>
  );
}
