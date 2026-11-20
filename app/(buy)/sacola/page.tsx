import type { Metadata } from "next";
import { Suspense } from "react";
import { PurchaseSteps } from "@/src/components/layout";
import { ErrorMessage } from "@/src/components/ui";
import {
  applyCoupon,
  CartItemList,
  CartShipping,
  chooseDelivery,
  CartSummary,
  CheckoutBar,
  CouponForm,
  EmptyCart,
  getCart,
  goToCheckout,
  removeCoupon,
  removeItem,
  restoreItem,
  saveCartCep,
  updateQuantity,
} from "@/src/features/cart";

export const metadata: Metadata = { title: "Sacola · Helena" };

async function CartContent() {
  const result = await getCart();
  if (!result.ok) return <ErrorMessage title={result.title} retryHref="/sacola" />;
  const cart = result.cart;
  if (!cart || cart.items.length === 0) return <EmptyCart />;
  return (
    <div className="flex flex-col gap-3 px-4 pt-2 pb-6">
      <h1 className="my-1 font-mono text-xs font-medium uppercase tracking-[0.08em]">
        Sua sacola · {cart.pieceCount} {cart.pieceCount === 1 ? "peça" : "peças"}
      </h1>
      <CartItemList items={cart.items} updateQuantity={updateQuantity} removeItem={removeItem} restoreItem={restoreItem} />
      <CartShipping
        cep={cart.cep}
        deliveryOptions={cart.deliveryOptions}
        chosenDelivery={cart.chosenDelivery}
        freeShipping={cart.freeShipping}
        saveCartCep={saveCartCep}
        chooseDelivery={chooseDelivery}
      />
      <CouponForm coupon={cart.coupon} applyCoupon={applyCoupon} removeCoupon={removeCoupon} />
      <CartSummary cart={cart} />
      <CheckoutBar total={cart.total} goToCheckout={goToCheckout} />
    </div>
  );
}

// SAC-02, SAC-03. Reading the cookie and the API goes inside Suspense (cacheComponents).
export default function CartPage() {
  return (
    <>
      <PurchaseSteps current="cart" />
      <Suspense fallback={null}>
        <CartContent />
      </Suspense>
    </>
  );
}
