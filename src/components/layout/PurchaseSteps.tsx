const STEPS = [
  { key: "cart", label: "Sacola" },
  { key: "identification", label: "Identificação" },
  { key: "details", label: "Dados e entrega" },
  { key: "payment", label: "Pagamento" },
] as const;

// SAC-02: the 4-step progress of bag and checkout. Its presence also hides the announcement,
// the search and the bag icon of the header (GER-02, rule in app/globals.css).
export function PurchaseSteps({ current }: { current: (typeof STEPS)[number]["key"] }) {
  return (
    <ol data-purchase-steps aria-label="Etapas da compra" className="relative grid grid-cols-4 px-4 pt-4 pb-2">
      <span aria-hidden className="absolute inset-x-[12.5%] top-[1.3rem] border-t border-control" />
      {STEPS.map((step) => {
        const on = step.key === current;
        return (
          <li
            key={step.key}
            aria-current={on ? "step" : undefined}
            className="relative flex flex-col items-center gap-1.5 text-center"
          >
            <span
              aria-hidden
              className={`size-[11px] rounded-full border ${on ? "border-primary bg-primary" : "border-control bg-background"}`}
            />
            <span
              className={`font-mono text-[0.625rem] font-medium uppercase tracking-[0.08em] ${on ? "text-primary" : "text-muted"}`}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
