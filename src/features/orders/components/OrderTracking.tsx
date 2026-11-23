import type { ReactNode } from "react";
import { Button, CheckIcon } from "@/src/components/ui";
import type { OrderView } from "../views.ts";
import { CopyTrackingCode } from "./CopyTrackingCode.tsx";

const label = "font-mono text-xs font-medium uppercase tracking-[0.08em]";

// PED-03, PED-04, PED-05, PED-07, PED-08: steps, tracking or courier, city/state, support and return.
// CTA-03: the full address only when she reads her own order signed in.
export function OrderTracking({ order, summary, address = null }: { order: OrderView; summary: ReactNode; address?: string | null }) {
  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-[1.75rem] font-normal">Acompanhar pedido</h1>
        <p className="font-medium">Pedido {order.number}</p>
      </div>

      <section aria-label="Situação do pedido" className="flex flex-col gap-3 bg-card p-4">
        {order.inSupport && <p className="font-medium">Suporte em andamento</p>}
        {order.currentStep && <p>Etapa atual: {order.currentStep}</p>}
        <ol aria-label="Etapas do pedido" className="flex flex-col gap-3">
          {order.steps.map((step) => (
            <li key={step.label} className="flex items-center gap-3">
              {step.done ? (
                <CheckIcon className="size-5 shrink-0 text-success" />
              ) : (
                <span aria-hidden="true" className="size-5 shrink-0 rounded-full border border-line" />
              )}
              <span className={`flex-1 ${step.done ? "" : "text-muted"}`}>
                {step.label}
                {step.done && <span className="sr-only"> concluída</span>}
              </span>
              {step.date && <span className="text-sm tabular-nums text-muted">{step.date}</span>}
            </li>
          ))}
        </ol>
      </section>

      <section aria-label="Entrega" className="flex flex-col gap-2 bg-card p-4">
        <p>{address ?? order.place}</p>
        <p className="text-muted">{order.deliveryTime}</p>
        {order.tracking && (
          <div className="flex flex-col gap-2 pt-2">
            <h2 className={label}>Código de rastreio</h2>
            <CopyTrackingCode code={order.tracking.code} />
            {order.tracking.link && (
              <Button variant="secondary" href={order.tracking.link} className="w-full">
                Rastrear entrega
              </Button>
            )}
          </div>
        )}
      </section>

      {summary}

      {order.canReturn && (
        <Button variant="secondary" href="/devolucao" className="w-full">
          Solicitar devolução
        </Button>
      )}
    </div>
  );
}
