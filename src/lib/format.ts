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

// PRO-10, SAC-08, CHK-09: delivery names the customer sees (owner renamed "Motoboy" on 2026-11-20).
const DELIVERY_LABELS = { courier: "Entrega Helena", pac: "PAC", sedex: "Sedex" } as const;

export function deliveryLabel(type: keyof typeof DELIVERY_LABELS): string {
  return DELIVERY_LABELS[type];
}
