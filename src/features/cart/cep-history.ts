// PRO-15, SAC-18: the CEPs whose shipping she calculated, only on her device and only with "Funcionais".
// Browser only; every storage access is in a try (private mode, storage full or blocked).
export type CepEntry = { cep: string; place: string | null }; // cep: 8 digits; place: "São Paulo/SP" when known

const KEY = "helena_ceps";
const MAX = 5;

// Newest first, no repeats, at most 5; a CEP without a place keeps the one already known.
export function addCep(list: CepEntry[], entry: CepEntry): CepEntry[] {
  const place = entry.place ?? list.find((e) => e.cep === entry.cep)?.place ?? null;
  return [{ cep: entry.cep, place }, ...list.filter((e) => e.cep !== entry.cep)].slice(0, MAX);
}

function isEntry(value: unknown): value is CepEntry {
  const e = value as CepEntry;
  return typeof e === "object" && e !== null && /^\d{8}$/.test(String(e.cep)) && (e.place === null || typeof e.place === "string");
}

export function readCepHistory(): CepEntry[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(value) ? value.filter(isEntry).slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function rememberCep(entry: CepEntry): CepEntry[] {
  const next = addCep(readCepHistory(), entry);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // not kept: the calculator works the same
  }
  return next;
}

export function clearCepHistory(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nothing to delete
  }
}
