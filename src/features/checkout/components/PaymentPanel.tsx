"use client";

import { useRouter } from "next/navigation";
import { startTransition, useActionState, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/src/components/ui/Button.tsx";
import { AlertIcon } from "@/src/components/ui/icons.tsx";
import type { PayState } from "../types.ts";
import type { InstallmentOption } from "../views.ts";
import { SimulatedCardFields, type CardGateway } from "./gateway/SimulatedCardFields.tsx";
import { ReservationTimer } from "./ReservationTimer.tsx";

type Method = "pix" | "card";

type Props = {
  total: string;
  reservationExpiresAt: string | null;
  expired: boolean; // the reservation had already ended when the page loaded
  pix: { pixCode: string; qrCode: string } | null; // a PIX still waiting, when she reloads the page
  installmentOptions: InstallmentOption[];
  summary: ReactNode;
  payWithPix: (prev: PayState, formData: FormData) => Promise<PayState>;
  payWithCard: (prev: PayState, formData: FormData) => Promise<PayState>;
  checkPayment: () => Promise<{ status: "waiting" | "paid" | "expired"; number: string | null }>;
};

const heading = "font-mono text-xs font-medium uppercase tracking-[0.08em]";
const POLL_MS = 3000;

// CHK-17: when the reservation ends (timer at zero or the API says so) the PIX goes away; "Tentar de novo"
// starts a new attempt, and the next payment reserves the pieces again.
export function PaymentPanel({
  total,
  reservationExpiresAt,
  expired: expiredAtLoad,
  pix,
  installmentOptions,
  summary,
  payWithPix,
  payWithCard,
  checkPayment,
}: Props) {
  const [expired, setExpired] = useState(expiredAtLoad);
  const [endedAt, setEndedAt] = useState<string | null>(null); // the reservation end that already passed
  const [attempt, setAttempt] = useState(0);
  const end = useCallback(() => {
    setExpired(true);
    setEndedAt(reservationExpiresAt);
  }, [reservationExpiresAt]);
  const timer = !expired && reservationExpiresAt && reservationExpiresAt !== endedAt ? reservationExpiresAt : null;

  return (
    <div className="flex flex-col gap-3">
      {timer && (
        <div className="bg-card px-4 py-3">
          <ReservationTimer expiresAt={timer} onEnd={end} />
        </div>
      )}
      {summary}
      {expired ? (
        <section aria-label="Reserva" className="flex flex-col gap-3 bg-card p-4">
          <div role="alert" className="flex flex-col gap-1">
            <p className="flex items-center gap-2 font-medium text-error">
              <AlertIcon className="size-4 shrink-0" />
              Reserva encerrada
            </p>
            <p className="text-sm">Os 15 minutos acabaram e as peças voltaram para o estoque. O código PIX não vale mais.</p>
          </div>
          <Button
            variant="primary"
            onClick={() => {
              setExpired(false);
              setAttempt((n) => n + 1);
            }}
            className="w-full"
          >
            Tentar de novo
          </Button>
        </section>
      ) : (
        // A new key per attempt: the old PIX and the action's answer don't come back.
        <PaymentMethods
          key={attempt}
          retry={attempt > 0}
          total={total}
          savedPix={attempt === 0 ? pix : null}
          installmentOptions={installmentOptions}
          payWithPix={payWithPix}
          payWithCard={payWithCard}
          checkPayment={checkPayment}
          onExpired={end}
        />
      )}
    </div>
  );
}

type MethodsProps = Pick<Props, "total" | "installmentOptions" | "payWithPix" | "payWithCard" | "checkPayment"> & {
  retry: boolean;
  savedPix: Props["pix"];
  onExpired: () => void;
};

// CHK-14 to CHK-22: the method, then the PIX code (asked for until confirmed) or the card.
function PaymentMethods({ total, retry, savedPix, installmentOptions, payWithPix, payWithCard, checkPayment, onExpired }: MethodsProps) {
  const router = useRouter();
  const [method, setMethod] = useState<Method | null>(savedPix ? "pix" : null);
  const [state, dispatch, pending] = useActionState(payWithPix, { status: "idle", pix: null, message: null });
  const attemptKey = useRef<string | null>(null);
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLParagraphElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const pix = state.pix ?? savedPix;

  // After "Tentar de novo" the button is gone: focus goes to the choice of method.
  useEffect(() => {
    if (retry) headingRef.current?.focus();
  }, [retry]);

  // One Idempotency-Key per attempt: a double tap makes one payment; a new one after each answer.
  useEffect(() => {
    attemptKey.current = null;
  }, [state]);

  useEffect(() => {
    if (method !== "pix" || !pix) return;
    const id = setInterval(async () => {
      const answer = await checkPayment();
      if (answer.status === "paid" && answer.number) {
        clearInterval(id);
        router.push(`/?pedido=${answer.number}`);
      } else if (answer.status === "expired") {
        clearInterval(id);
        onExpired();
      }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [method, pix, checkPayment, router, onExpired]);

  function generatePix() {
    attemptKey.current ??= crypto.randomUUID();
    const data = new FormData();
    data.set("idempotencyKey", attemptKey.current);
    startTransition(() => dispatch(data));
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(pix?.pixCode ?? "");
      setCopied(true);
    } catch {
      // No clipboard: select the code so she can copy it herself.
      const range = document.createRange();
      if (codeRef.current) range.selectNodeContents(codeRef.current);
      getSelection()?.removeAllRanges();
      getSelection()?.addRange(range);
    }
  }

  return (
    <>
      <fieldset aria-labelledby="payment-method" className="flex flex-col gap-3 bg-card p-4">
        <h2 id="payment-method" ref={headingRef} tabIndex={-1} className={heading}>
          Forma de pagamento
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["pix", "PIX"],
              ["card", "Cartão de crédito"],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className="relative flex min-h-14 cursor-pointer items-center justify-center border border-line px-3 text-center text-[0.9375rem] has-checked:border-double has-checked:border-4 has-checked:border-primary has-focus-visible:outline-2 has-focus-visible:outline-primary"
            >
              <input
                type="radio"
                name="method"
                value={value}
                checked={method === value}
                onChange={() => setMethod(value)}
                className="absolute inset-0 cursor-pointer appearance-none opacity-0"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      {method === "pix" && (
        <section aria-label="PIX" className="flex flex-col items-center gap-3 bg-card p-4 text-center">
          {pix ? (
            <>
              <p className="text-[1.0625rem] font-medium tabular-nums">PIX · {total}</p>
              {/* eslint-disable-next-line @next/next/no-img-element -- a data URI from the API, nothing to optimize */}
              <img src={pix.qrCode} alt="QR code do PIX" width={200} height={200} className="size-50 bg-background" />
              <p ref={codeRef} className="w-full break-all bg-surface p-3 text-left font-mono text-xs">
                {pix.pixCode}
              </p>
              <Button variant="primary" onClick={copy} className="w-full">
                Copiar código PIX
              </Button>
              <p role="status" className="text-sm text-success">
                {copied ? "Código PIX copiado" : ""}
              </p>
              <p className="text-sm text-muted">Aguardando pagamento</p>
            </>
          ) : (
            <Button variant="primary" onClick={generatePix} disabled={pending} className="w-full">
              {pending ? "Processando" : "Gerar código PIX"}
            </Button>
          )}
          {state.status === "failed" && state.message && (
            <p role="alert" className="flex items-center gap-2 text-sm text-error">
              <AlertIcon className="size-4 shrink-0" />
              {state.message}
            </p>
          )}
        </section>
      )}

      {method === "card" && (
        <CardPayment total={total} installmentOptions={installmentOptions} payWithCard={payWithCard} onPix={() => setMethod("pix")} />
      )}
    </>
  );
}

type CardProps = Pick<Props, "total" | "installmentOptions" | "payWithCard"> & { onPix: () => void };

// CHK-18 to CHK-22: the gateway makes a token in the browser; only the token and the installments are sent.
function CardPayment({ total, installmentOptions, payWithCard, onPix }: CardProps) {
  const gateway = useRef<CardGateway>(null);
  const [installments, setInstallments] = useState(installmentOptions[0]?.value ?? 1);
  const [state, dispatch, pending] = useActionState(payWithCard, { status: "idle", pix: null, message: null });
  const attemptKey = useRef<string | null>(null);

  // One Idempotency-Key per attempt: a double tap makes one charge; a new one after each answer (CHK-22).
  useEffect(() => {
    attemptKey.current = null;
  }, [state]);

  function pay() {
    const card = gateway.current?.createToken();
    if (!card) return;
    attemptKey.current ??= crypto.randomUUID();
    const data = new FormData();
    data.set("cardToken", card.token);
    data.set("installments", String(installments));
    data.set("idempotencyKey", attemptKey.current);
    startTransition(() => dispatch(data));
  }

  return (
    <section aria-label="Cartão de crédito" className="flex flex-col gap-3 bg-card p-4">
      <SimulatedCardFields ref={gateway} />
      <div className="flex flex-col gap-1">
        <label htmlFor="card-installments" className="text-sm font-medium">
          Parcelas
        </label>
        <select
          id="card-installments"
          value={installments}
          onChange={(e) => setInstallments(Number(e.target.value))}
          className="min-h-12 w-full rounded-control border border-control bg-card px-4 text-base"
        >
          {installmentOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.text}
            </option>
          ))}
        </select>
      </div>
      {state.status === "declined" && (
        <div role="alert" className="flex flex-col gap-1">
          <p className="flex items-center gap-2 font-medium text-error">
            <AlertIcon className="size-4 shrink-0" />
            Pagamento não aprovado
          </p>
          <p className="text-sm">{state.message}</p>
        </div>
      )}
      {state.status === "failed" && state.message && (
        <p role="alert" className="flex items-center gap-2 text-sm text-error">
          <AlertIcon className="size-4 shrink-0" />
          {state.message}
        </p>
      )}
      <Button variant="primary" onClick={pay} disabled={pending} className="w-full">
        {pending ? "Processando" : `Pagar ${total}`}
      </Button>
      {state.status === "declined" && (
        <Button variant="secondary" onClick={onPix} className="w-full">
          Pagar com PIX
        </Button>
      )}
    </section>
  );
}
