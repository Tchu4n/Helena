import type { ReactNode } from "react";

const TONES = {
  sale: "bg-sale text-card",
  neutral: "bg-card text-primary border border-control",
};

// A badge always carries text, so color is never the only signal (GER-07).
export function Badge({ tone, children }: { tone: "sale" | "neutral"; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-control px-2 py-0.5 font-mono text-[0.625rem] font-medium uppercase tracking-[0.08em] ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
