import Link from "next/link";
import { Button, ChevronLeftIcon, ChevronRightIcon } from "@/src/components/ui";
import type { MyOrderView } from "@/src/features/orders";

const PAGE_LINK = "inline-flex min-h-12 items-center gap-1 rounded-control border border-control bg-card px-4";

type Props = { orders: MyOrderView[]; page: number; total: number; perPage: number };

// CTA-03, CTA-04: her orders, newest first, 24 per page; each one opens tracking (PED-03).
export function MyOrders({ orders, page, total, perPage }: Props) {
  const hasPrevious = page > 1;
  const hasNext = page * perPage < total;
  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-8">
      <h1 className="font-serif text-[1.75rem] font-normal">Meus pedidos</h1>
      {orders.length === 0 ? (
        <div className="flex flex-col gap-4 bg-card p-4">
          <p>Você ainda não tem pedidos</p>
          <Button variant="primary" href="/">
            Ver novidades
          </Button>
        </div>
      ) : (
        <ul className="bg-card">
          {orders.map((order) => (
            <li key={order.number} className="border-b border-line last:border-b-0">
              <Link href={`/pedido/${order.number}`} className="flex min-h-14 items-center justify-between gap-3 px-4 py-3">
                <span className="flex flex-col gap-0.5">
                  <span className="font-medium">{order.number}</span>
                  <span className="text-sm text-muted">
                    {order.date} · {order.total}
                  </span>
                  <span className="text-sm">{order.status}</span>
                </span>
                <ChevronRightIcon className="size-5 shrink-0 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {(hasPrevious || hasNext) && (
        <nav aria-label="Páginas" className="flex justify-between gap-2">
          {hasPrevious ? (
            <Link href={`/conta/pedidos?pagina=${page - 1}`} className={PAGE_LINK}>
              <ChevronLeftIcon className="size-5" />
              Anterior
            </Link>
          ) : (
            <span />
          )}
          {hasNext && (
            <Link href={`/conta/pedidos?pagina=${page + 1}`} className={PAGE_LINK}>
              Próxima
              <ChevronRightIcon className="size-5" />
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
