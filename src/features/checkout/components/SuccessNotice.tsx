"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckIcon, CloseIcon } from "@/src/components/ui/icons.tsx";
import { clearDetails } from "../checkout-storage.ts";

type Props = { notice: { number: string; maskedEmail: string } | null; finishPurchase: () => Promise<void> };

// CHK-16, CHK-20: the box stays until she closes it; the purchase is over, so the bag and the typed details go.
export function SuccessNotice({ notice, finishPurchase }: Props) {
  const router = useRouter();
  // The first verified notice is kept: the page renders again with null once the cookies are gone.
  const [shown] = useState(notice);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!shown) return;
    clearDetails();
    void finishPurchase();
  }, [shown, finishPurchase]);

  if (!shown || !open) return null;
  const { number, maskedEmail } = shown;
  return (
    <div role="status" className="mx-4 mt-4 flex items-start gap-3 border border-success bg-card p-4">
      <CheckIcon className="mt-0.5 size-5 shrink-0 text-success" />
      <div className="flex flex-1 flex-col gap-1">
        <p className="font-medium">Pagamento concluído com sucesso</p>
        <p className="text-sm">
          Pedido {number}. Os detalhes foram para {maskedEmail}.
        </p>
      </div>
      <button
        type="button"
        aria-label="Fechar mensagem"
        onClick={() => {
          setOpen(false);
          router.replace("/");
          router.refresh();
        }}
        className="-m-3 flex size-12 shrink-0 items-center justify-center rounded-control focus-visible:outline-2 focus-visible:outline-primary"
      >
        <CloseIcon className="size-5" />
      </button>
    </div>
  );
}
