"use client";

import { useActionState } from "react";
import { Button } from "@/src/components/ui/Button.tsx";
import { Field } from "@/src/components/ui/Field.tsx";
import { AlertIcon } from "@/src/components/ui/icons.tsx";
import type { CouponState } from "../types.ts";
import type { CartView } from "../views.ts";

type Props = {
  coupon: CartView["coupon"];
  applyCoupon: (prev: CouponState, formData: FormData) => Promise<CouponState>;
  removeCoupon: (prev: CouponState) => Promise<CouponState>;
};

const IDLE: CouponState = { status: "idle", code: "", message: null };

function Alert({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="flex items-center gap-2 text-sm text-error">
      <AlertIcon className="size-4 shrink-0" />
      {children}
    </p>
  );
}

// SAC-02, SAC-11 to SAC-15: the field is always open; a new code replaces the one applied.
export function CouponForm({ coupon, applyCoupon, removeCoupon }: Props) {
  const [applyState, applyAction, applying] = useActionState(applyCoupon, IDLE);
  const [removeState, removeAction, removing] = useActionState(removeCoupon, IDLE);

  return (
    <section aria-label="Cupom" className="flex flex-col gap-3 bg-card p-4">
      <h2 className="font-mono text-xs font-medium uppercase tracking-[0.08em]">Cupom</h2>
      <form action={applyAction} className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <Field
            label="Código do cupom"
            name="code"
            autoComplete="off"
            maxLength={20}
            // React resets the form after the action: the typed code comes back in the state.
            defaultValue={applyState.code}
            error={applyState.status === "invalid" ? applyState.message : null}
          />
        </div>
        <div className={`shrink-0 ${applyState.status === "invalid" ? "self-start pt-6" : ""}`}>
          <Button variant="secondary" type="submit" disabled={applying}>
            Aplicar
          </Button>
        </div>
      </form>
      {applyState.status === "failed" && <Alert>{applyState.message}</Alert>}

      {coupon && (
        <form action={removeAction} className="flex items-center justify-between gap-2 text-[0.9375rem]">
          <span>{coupon.text}</span>
          <Button variant="secondary" type="submit" disabled={removing}>
            Remover
          </Button>
        </form>
      )}
      {removeState.status === "failed" && <Alert>{removeState.message}</Alert>}
    </section>
  );
}
