"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { clearCepHistory, readCepHistory, rememberCep, type CepEntry } from "../cep-history.ts";

type Props = {
  remembers: boolean; // the "Funcionais" consent (GER-05)
  calculated: CepEntry | null; // the CEP of the last successful calculation, to keep
  children: ReactNode; // the CEP field
};

const digits = (value: string) => value.replace(/\D/g, "");
const label = (e: CepEntry) => `${e.cep.slice(0, 5)}-${e.cep.slice(5)}${e.place ? ` · ${e.place}` : ""}`;
const item = "flex min-h-12 items-center px-4 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary";

// PRO-15, SAC-18: wraps the CEP field of a form. With "Funcionais", focusing the field with fewer than 8 digits
// shows her recent CEPs; a tap fills the field and submits the form. Without it, nothing is read or kept, and
// any history left is deleted.
export function CepSuggestions({ remembers, calculated, children }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [entries, setEntries] = useState<CepEntry[]>([]);
  const [open, setOpen] = useState(false);

  // Storage is only readable after mount; keyed by the values, not the object, so a re-render keeps nothing twice.
  useEffect(() => {
    if (!remembers) clearCepHistory();
    setEntries(!remembers ? [] : calculated ? rememberCep(calculated) : readCepHistory()); // eslint-disable-line react-hooks/set-state-in-effect
  }, [remembers, calculated?.cep, calculated?.place]); // eslint-disable-line react-hooks/exhaustive-deps

  const input = () => box.current?.querySelector<HTMLInputElement>('input[name="cep"]') ?? null;
  const fewDigits = () => digits(input()?.value ?? "").length < 8;

  function pick(entry: CepEntry) {
    const field = input();
    if (!field) return;
    field.value = entry.cep;
    setOpen(false);
    field.form?.requestSubmit();
  }

  function clear() {
    clearCepHistory();
    setEntries([]);
    input()?.focus();
  }

  return (
    <div
      ref={box}
      className="relative"
      onFocus={(e) => {
        if (e.target === input()) setOpen(fewDigits());
      }}
      onInput={() => setOpen(fewDigits())}
      onKeyDown={(e) => {
        if (e.key !== "Escape" || !open) return;
        e.preventDefault();
        setOpen(false);
        input()?.focus();
      }}
      onBlur={(e) => {
        if (!box.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      {children}
      {remembers && open && entries.length > 0 && (
        // Mouse down here keeps the focus in the field, so the list doesn't close before the tap lands.
        <div
          role="group"
          aria-labelledby="cep-suggestions"
          onMouseDown={(e) => e.preventDefault()}
          className="absolute inset-x-0 top-full z-20 mt-1 flex flex-col border border-control bg-card"
        >
          <p id="cep-suggestions" className="px-4 pt-3 pb-1 font-mono text-[0.625rem] font-medium uppercase tracking-[0.08em] text-muted">
            Pesquisados recentemente
          </p>
          {entries.map((entry) => (
            <button key={entry.cep} type="button" onClick={() => pick(entry)} className={`${item} text-[0.9375rem] tabular-nums`}>
              {label(entry)}
            </button>
          ))}
          <button type="button" onClick={clear} className={`${item} border-t border-line text-sm underline`}>
            Limpar histórico
          </button>
        </div>
      )}
    </div>
  );
}
