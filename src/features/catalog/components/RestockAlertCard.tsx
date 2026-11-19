"use client";

import { useState } from "react";
import { Button } from "@/src/components/ui/Button.tsx";
import type { SizeOption } from "../views.ts";
import { RestockAlertForm } from "./RestockAlertForm.tsx";

type Props = {
  // The chosen sold-out size, or null when the whole product is sold out and no size was chosen.
  size: SizeOption | null;
  focusSizes: () => void;
};

// PRO-12, PRO-14. Not keyed by size: once open, choosing another sold-out size goes straight to the form.
export function RestockAlertCard({ size, focusSizes }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <section aria-labelledby="restock-title" className="flex flex-col gap-4 border border-line bg-card p-4">
      <div className="flex flex-col gap-1">
        <h2 id="restock-title" className="font-serif text-xl font-normal">
          {size ? `Tamanho ${size.label} esgotado` : "Produto esgotado"}
        </h2>
        <p className="text-sm text-muted">Garanta sua unidade assim que o estoque voltar.</p>
      </div>
      <hr className="border-line" />
      {open && size ? (
        <RestockAlertForm key={size.id} productSizeId={size.id} sizeLabel={size.label} />
      ) : open ? (
        <p className="text-sm">Escolha o tamanho para receber o aviso.</p>
      ) : (
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => {
            setOpen(true);
            if (!size) focusSizes();
          }}
        >
          Avise-me quando estiver disponível
        </Button>
      )}
    </section>
  );
}
