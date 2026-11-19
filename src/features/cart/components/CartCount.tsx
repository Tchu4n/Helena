import { getCartSummary } from "../queries/getCart.ts";

// GER-01, PRO-07: the "Sacola" link name with the piece count ("Sacola, 1 peça"), plus the visible number.
// The whole name is one hidden text: two separate hidden texts would be read with an extra space.
// `visibleLabel` is for the tab bar, where "Sacola" is also written on screen.
export async function CartCount({ label, visibleLabel = false }: { label: string; visibleLabel?: boolean }) {
  const cart = await getCartSummary();
  const count = cart?.pieceCount ?? 0;
  if (count === 0) return visibleLabel ? label : <span className="sr-only">{label}</span>;
  return (
    <>
      {visibleLabel && <span aria-hidden>{label}</span>}
      <span className="sr-only">{`${label}, ${count} ${count === 1 ? "peça" : "peças"}`}</span>
      <span
        aria-hidden
        className="absolute right-1 top-1 inline-flex min-w-4 items-center justify-center rounded-control bg-primary px-1 font-mono text-[0.625rem] leading-4 text-background"
      >
        {count}
      </span>
    </>
  );
}
