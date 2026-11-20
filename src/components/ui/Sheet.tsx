"use client";

import { useEffect, useId, useRef } from "react";
import { CloseIcon } from "./icons.tsx";

type Props = { title: string; onClose: () => void; children: React.ReactNode };

// A native modal dialog, so Esc, the focus trap and the backdrop come from the browser.
// Phone: slides up from the bottom. From md: opens from the right, full height, 400px (SAC-01).
// It closes only when she asks: "Fechar", a tap outside it or Esc; never by itself.
export function Sheet({ title, onClose, children }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onClose={onClose}
      // Only a tap outside the box is a tap on the backdrop; blank space inside also has the dialog as target.
      onClick={(event) => {
        const box = event.currentTarget.getBoundingClientRect();
        const outside =
          event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
        if (event.target === event.currentTarget && outside) event.currentTarget.close();
      }}
      className="fixed inset-x-0 top-auto bottom-0 m-0 mt-auto w-full max-w-none rounded-t-2xl bg-background p-0 text-primary transition-transform duration-300 backdrop:bg-primary/45 starting:open:translate-y-full motion-reduce:transition-none md:inset-y-0 md:right-0 md:left-auto md:h-full md:max-h-none md:w-[400px] md:rounded-none md:starting:open:translate-x-full md:starting:open:translate-y-0"
    >
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 id={titleId} className="font-mono text-xs font-medium uppercase tracking-[0.08em]">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => dialog.current?.close()}
            className="-mr-3 flex size-12 items-center justify-center rounded-control"
          >
            <CloseIcon className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
