const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

// GER-09: money travels in cents and is shown as R$ 1.234,56.
export function formatPrice(cents: number): string {
  return brl.format(cents / 100);
}
