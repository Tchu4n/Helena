const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

// GER-09: money travels in cents and is shown as R$ 1.234,56.
export function formatPrice(cents: number): string {
  return brl.format(cents / 100);
}

// PRO-02, SAC-16: the API already applies the rule (up to 6x, minimum R$ 50,00); 1 means no installments.
export function installmentText(plan: { maxInstallments: number; installmentAmount: number }): string | null {
  if (plan.maxInstallments <= 1) return null;
  return `até ${plan.maxInstallments}x de ${formatPrice(plan.installmentAmount)} sem juros`;
}
