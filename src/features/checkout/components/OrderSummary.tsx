import Image from "next/image";
import { ChevronRightIcon } from "@/src/components/ui";
import type { SummaryView } from "../views.ts";

const pieces = (n: number) => `${n} ${n === 1 ? "peça" : "peças"}`;

function Line({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex justify-between gap-3">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </p>
  );
}

// CHK-11: closed by default to keep the form close; opens to items, discount, shipping, delivery time and total.
// PED-01: the confirmation opens it, since there it is the content itself.
export function OrderSummary({ summary, open = false }: { summary: SummaryView; open?: boolean }) {
  return (
    <details open={open} className="group bg-card">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 text-[0.9375rem] [&::-webkit-details-marker]:hidden">
        <span>Resumo · {pieces(summary.pieceCount)}</span>
        <span className="flex items-center gap-2">
          <strong className="font-medium tabular-nums">{summary.total}</strong>
          <ChevronRightIcon className="size-4 rotate-90 transition-transform group-open:-rotate-90 motion-reduce:transition-none" />
        </span>
      </summary>
      <div className="flex flex-col gap-2 px-4 pb-4 text-[0.9375rem]">
        <ul className="flex flex-col gap-2">
          {summary.items.map((item, index) => (
            <li key={index} className="grid grid-cols-[40px_1fr_auto] items-center gap-2.5 text-sm">
              <Image src={item.photoUrl} alt={item.photoAlt} width={40} height={53} className="aspect-[3/4] bg-surface object-cover" />
              <span>
                {item.name}
                <span className="block text-muted">
                  {item.details}
                  {item.quantity > 1 && ` · Qtd. ${item.quantity}`}
                </span>
              </span>
              <span className="tabular-nums">{item.price}</span>
            </li>
          ))}
        </ul>
        <Line label="Subtotal" value={summary.subtotal} />
        {summary.discount && summary.coupon && <Line label={`Desconto (${summary.coupon})`} value={summary.discount} />}
        {summary.shippingLabel && summary.shipping && (
          <>
            <Line label={summary.shippingLabel} value={summary.shipping} />
            {summary.deliveryTime && <span className="text-sm text-success">{summary.deliveryTime}</span>}
          </>
        )}
        <p className="flex justify-between gap-3 border-t border-line pt-2.5 text-[1.0625rem] font-medium">
          <span>Total</span>
          <span className="tabular-nums">{summary.total}</span>
        </p>
        <p className="text-sm text-muted">{summary.installments}</p>
      </div>
    </details>
  );
}
