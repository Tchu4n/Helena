// Field checks of the simulated gateway only; the real gateway brings its own (plan decision table).
export type CardFields = { number: string; name: string; validity: string; cvv: string };
export type CardErrors = Partial<Record<keyof CardFields, string>>;

const digits = (value: string) => value.replace(/\s/g, "");

export function checkCard(card: CardFields, now = new Date()): CardErrors {
  const errors: CardErrors = {};
  if (!/^\d{13,19}$/.test(digits(card.number))) errors.number = "Confira o número do cartão";
  if (!card.name.trim()) errors.name = "Campo obrigatório";
  const [, month, year] = /^(\d{2})\/(\d{2})$/.exec(card.validity.trim()) ?? [];
  const lastMonth = Number(year) * 12 + Number(month); // a card works until the end of its month
  const thisMonth = (now.getFullYear() - 2000) * 12 + now.getMonth() + 1;
  if (!month || Number(month) < 1 || Number(month) > 12 || lastMonth < thisMonth) errors.validity = "Confira a validade";
  if (!/^\d{3,4}$/.test(card.cvv.trim())) errors.cvv = "Confira o CVV";
  return errors;
}

// shortcut: a fake token from the last 4 digits; the real gateway's script makes the token when it replaces this component.
export const cardToken = (number: string) => `tok_test_${digits(number).slice(-4)}`;
