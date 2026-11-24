"use client";

import Link from "next/link";
import { startTransition, useActionState, useOptimistic, useState } from "react";
import { AlertIcon, Button } from "@/src/components/ui";
import type { PrivacyNotice } from "../types.ts";
import type { ConsentView } from "../views.ts";

type Props = {
  consents: ConsentView[];
  updateConsent: (prev: PrivacyNotice, formData: FormData) => Promise<PrivacyNotice>;
  requestCopy: (prev: PrivacyNotice, formData: FormData) => Promise<PrivacyNotice>;
  requestDeletion: (prev: PrivacyNotice, formData: FormData) => Promise<PrivacyNotice>;
};

const INVOICE = "Os dados das notas fiscais ficam guardados pelo prazo que a lei exige.";

const section = "flex flex-col gap-3 bg-card p-4";
const heading = "font-mono text-xs font-medium uppercase tracking-[0.08em]";

// CTA-08, CTA-09: news per channel (a tap saves it), my data (copy, deletion after a confirmation), and the cookie link.
export function AccountPrivacy({ consents, updateConsent, requestCopy, requestDeletion }: Props) {
  const [confirming, setConfirming] = useState(false);
  // The box follows her tap at once; if the API refuses, it goes back to what the page read (review focus 2).
  const [shown, toggle] = useOptimistic(consents, (list, change: { channel: string; accepted: boolean }) =>
    list.map((c) => (c.channel === change.channel ? { ...c, accepted: change.accepted } : c)),
  );
  // One status line for the last thing done; "intent" only picks the action, each action checks its own input.
  const [state, dispatch, pending] = useActionState<PrivacyNotice, FormData>(
    async (prev, formData) => {
      const intent = formData.get("intent");
      if (intent === "copy") return requestCopy(prev, formData);
      if (intent === "deletion") return requestDeletion(prev, formData);
      toggle({ channel: String(formData.get("channel")), accepted: formData.get("accepted") === "on" });
      return updateConsent(prev, formData);
    },
    { notice: null, error: null },
  );
  // No <form action>: React resets a form after its action, which would put the box back to its first state.
  function change(channel: string, accepted: boolean) {
    const data = new FormData();
    data.set("intent", "consent");
    data.set("channel", channel);
    if (accepted) data.set("accepted", "on");
    startTransition(() => dispatch(data));
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-8">
      <h1 className="font-serif text-[1.75rem] font-normal">Privacidade</h1>
      <p role="status" className="text-sm text-success">
        {state.notice ?? ""}
      </p>
      {state.error && (
        <p role="alert" className="flex items-start gap-2 text-sm text-error">
          <AlertIcon className="size-5 shrink-0" />
          {state.error}
        </p>
      )}

      <section aria-labelledby="news-heading" className={section}>
        <h2 id="news-heading" className={heading}>
          Novidades
        </h2>
        {shown.map((consent) => (
          <label
            key={consent.channel}
            className="grid min-h-12 cursor-pointer grid-cols-[24px_1fr] items-center gap-x-2.5 text-[0.9375rem]"
          >
            <input
              type="checkbox"
              checked={consent.accepted}
              onChange={(event) => change(consent.channel, event.target.checked)}
              className="size-5 accent-primary"
            />
            <span>{consent.label}</span>
            <span className="col-start-2 text-sm text-muted">{consent.line}</span>
          </label>
        ))}
        <p className="text-sm text-muted">As mensagens dos seus pedidos continuam chegando.</p>
      </section>

      <section aria-labelledby="data-heading" className={section}>
        <h2 id="data-heading" className={heading}>
          Meus dados
        </h2>
        <p className="text-sm">Você pode pedir uma cópia dos seus dados ou a exclusão da sua conta.</p>
        <p className="text-sm text-muted">{INVOICE}</p>
        <form action={dispatch} className="flex flex-col">
          <input type="hidden" name="intent" value="copy" />
          <Button variant="secondary" type="submit" disabled={pending}>
            Pedir cópia dos meus dados
          </Button>
        </form>
        {confirming ? (
          <form action={dispatch} role="group" aria-labelledby="deletion-heading" className="flex flex-col gap-2 border border-line p-3">
            <input type="hidden" name="intent" value="deletion" />
            <p id="deletion-heading" className="font-medium">
              Excluir minha conta?
            </p>
            <p className="text-sm">Nossa equipe exclui sua conta em até 15 dias. Você sai da conta agora, em todos os aparelhos.</p>
            <p className="text-sm">Se entrar de novo antes disso, o pedido é cancelado.</p>
            <p className="text-sm text-muted">{INVOICE}</p>
            {/* CTA-09: "Excluir" and "Cancelar" the same size and color. */}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" type="submit" disabled={pending}>
                Excluir
              </Button>
              <Button variant="secondary" onClick={() => setConfirming(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="secondary" onClick={() => setConfirming(true)}>
            Excluir minha conta
          </Button>
        )}
      </section>

      <Link href="/cookies" className="flex min-h-12 w-fit items-center text-sm text-primary underline">
        Preferências de cookies
      </Link>
    </div>
  );
}
