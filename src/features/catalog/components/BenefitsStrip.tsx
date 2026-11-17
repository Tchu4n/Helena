const BENEFITS = ["Frete grátis a partir de R$ 300", "Até 6x sem juros", "Devolução em até 7 dias"];

// Three items in monospaced labels, no signal color (DESIGN.md, section 5).
export function BenefitsStrip() {
  return (
    <ul
      aria-label="Benefícios"
      className="grid grid-cols-1 gap-2 border-y border-line px-4 py-4 text-center font-mono text-[0.625rem] font-medium uppercase tracking-[0.08em] sm:grid-cols-3 md:text-[0.6875rem]"
    >
      {BENEFITS.map((benefit) => (
        <li key={benefit}>{benefit}</li>
      ))}
    </ul>
  );
}
