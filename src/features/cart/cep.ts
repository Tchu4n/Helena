// PRO-09: "01310-100" and "01.310 100" count as "01310100"; letters or fewer than 8 numbers are invalid.
export function normalizeCep(input: string): string | null {
  const cep = input.replace(/[\s.-]/g, "");
  return /^\d{8}$/.test(cep) ? cep : null;
}
