"use client";

import { startTransition, useActionState, useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { Button } from "@/src/components/ui/Button.tsx";
import { Field } from "@/src/components/ui/Field.tsx";
import { AlertIcon } from "@/src/components/ui/icons.tsx";
import type { DeliveryOptionView } from "@/src/features/cart/client.ts";
import { readDetails, writeDetails, type StoredDetails } from "../checkout-storage.ts";
import { customerDetailsInput, DETAILS_FIELDS, digits, fieldErrors, type DetailsField } from "../schemas/customerDetails.ts";
import type { GoToPaymentState } from "../types.ts";

type Props = {
  total: string;
  // The bag's CEP, options and choice, as the API last calculated them.
  cep: string | null;
  deliveryOptions: DeliveryOptionView[];
  chosenDelivery: DeliveryOptionView["type"] | null;
  saveLead: (formData: FormData) => Promise<{ ok: boolean }>;
  saveCheckoutCep: (cep: string) => Promise<{ ok: boolean; message: string | null }>;
  chooseDelivery: (prev: { message: string | null }, formData: FormData) => Promise<{ message: string | null }>;
  goToPayment: (prev: GoToPaymentState, formData: FormData) => Promise<GoToPaymentState>;
};

function Alert({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="flex items-center gap-2 text-sm text-error">
      <AlertIcon className="size-4 shrink-0" />
      {children}
    </p>
  );
}

type FieldSpec = {
  name: DetailsField;
  label: string;
  autoComplete: string;
  maxLength: number;
  type?: "email" | "tel";
  inputMode?: "numeric" | "email" | "tel";
  span?: "short" | "wide"; // address grid: 1 or 2 of 3 columns; otherwise the full row
};

// CHK-02: label above, matching autocomplete, contract limits widened for typed separators.
const CONTACT: FieldSpec[] = [
  { name: "name", label: "Nome completo", autoComplete: "name", maxLength: 100 },
  { name: "cpf", label: "CPF", autoComplete: "off", maxLength: 14, inputMode: "numeric" },
  { name: "email", label: "E-mail", autoComplete: "email", maxLength: 150, type: "email", inputMode: "email" },
  { name: "phone", label: "Celular", autoComplete: "tel-national", maxLength: 15, type: "tel", inputMode: "tel" },
];
const ADDRESS: FieldSpec[] = [
  { name: "cep", label: "CEP", autoComplete: "postal-code", maxLength: 9, inputMode: "numeric", span: "wide" },
  { name: "street", label: "Rua", autoComplete: "address-line1", maxLength: 100 },
  { name: "number", label: "Número", autoComplete: "off", maxLength: 10, inputMode: "numeric", span: "short" },
  { name: "complement", label: "Complemento (opcional)", autoComplete: "address-line2", maxLength: 40, span: "wide" },
  { name: "neighborhood", label: "Bairro", autoComplete: "address-level3", maxLength: 60 },
  { name: "city", label: "Cidade", autoComplete: "address-level2", maxLength: 60, span: "wide" },
  { name: "state", label: "UF", autoComplete: "address-level1", maxLength: 2, span: "short" },
];

const EMPTY: StoredDetails = {
  ...(Object.fromEntries(DETAILS_FIELDS.map((f) => [f, ""])) as Record<DetailsField, string>),
  marketingEmail: false,
  marketingWhatsapp: false,
};

// What the schema and the server actions read: the text fields, and a box only when checked (like a real form post).
function toFormData(values: StoredDetails): FormData {
  const data = new FormData();
  for (const field of DETAILS_FIELDS) data.set(field, values[field]);
  if (values.marketingEmail) data.set("marketingEmail", "on");
  if (values.marketingWhatsapp) data.set("marketingWhatsapp", "on");
  return data;
}

const heading = "font-mono text-xs font-medium uppercase tracking-[0.08em]";

// CHK-02 to CHK-08, CHK-23. Nothing is ever filled in from an earlier purchase (CHK-08): only what she typed in this tab.
export function DetailsForm(props: Props) {
  const { total, cep, deliveryOptions, chosenDelivery, saveLead, saveCheckoutCep, chooseDelivery } = props;
  const [values, setValues] = useState<StoredDetails>(EMPTY);
  const [errors, setErrors] = useState<GoToPaymentState["errors"]>({});
  const [, startSaving] = useTransition();
  const lastSaved = useRef<string | null>(null);

  // CHK-09, CHK-10: a valid CEP other than the cart's is saved right away; the note keeps the total from before.
  const requestedCep = useRef<string | null>(null);
  const [cepMessage, setCepMessage] = useState<string | null>(null);
  const [totalBefore, setTotalBefore] = useState<string | null>(null);
  const [picked, setPicked] = useState<DeliveryOptionView["type"] | null>(null);
  const [deliveryMessage, setDeliveryMessage] = useState<string | null>(null);

  // CHK-12: one Idempotency-Key per attempt, so a second tap or a retry of the same request makes one order.
  const [state, dispatch, pending] = useActionState(props.goToPayment, { errors: {}, error: null });
  const sending = useRef(false);
  const attemptKey = useRef<string | null>(null);
  useEffect(() => {
    sending.current = false;
    attemptKey.current = null;
    if (Object.keys(state.errors).length === 0) return;
    setErrors(state.errors); // eslint-disable-line react-hooks/set-state-in-effect -- the server's answer to this attempt
    const first = DETAILS_FIELDS.find((f) => state.errors[f]);
    if (first) document.getElementById(first)?.focus();
  }, [state]);

  function watchCep(typed: string) {
    const next = digits(typed);
    if (!/^\d{8}$/.test(next) || next === cep || next === requestedCep.current) return;
    requestedCep.current = next;
    // Only a bag that already had shipping has a "before" worth showing (CHK-10).
    if (cep) setTotalBefore(total);
    setCepMessage(null);
    startSaving(async () => {
      const saved = await saveCheckoutCep(next);
      if (!saved.ok) {
        requestedCep.current = null;
        setCepMessage(saved.message);
      }
    });
  }

  function pick(type: DeliveryOptionView["type"]) {
    setPicked(type);
    setDeliveryMessage(null);
    setErrors((current) => ({ ...current, delivery: undefined }));
    const data = new FormData();
    data.set("type", type);
    startSaving(async () => {
      const answer = await chooseDelivery({ message: null }, data);
      setDeliveryMessage(answer.message);
      setPicked(null); // the page now has the cart's own choice: the new one, or the old one if refused
    });
  }

  // CHK-23: refill from this tab's storage once mounted (the server never has her details).
  useEffect(() => {
    const stored = readDetails();
    if (!stored) return;
    const next = { ...EMPTY };
    for (const field of DETAILS_FIELDS) if (typeof stored[field] === "string") next[field] = stored[field];
    next.marketingEmail = stored.marketingEmail === true;
    next.marketingWhatsapp = stored.marketingWhatsapp === true;
    setValues(next); // eslint-disable-line react-hooks/set-state-in-effect -- storage is only readable after mount
    watchCep(next.cep);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount
  }, []);

  function update(change: Partial<StoredDetails>) {
    setValues((current) => {
      const next = { ...current, ...change };
      writeDetails(next);
      return next;
    });
  }

  // Errors show once she leaves a field she typed in, or one already marked; nothing typed is cleared (CHK-04).
  // CHK-05: when everything required is valid, the lead is saved, once per change.
  function leave(field: DetailsField) {
    const result = customerDetailsInput.safeParse(Object.fromEntries(toFormData(values)));
    if (values[field] !== "" || errors[field]) {
      setErrors((current) => ({ ...current, [field]: result.success ? undefined : fieldErrors(result.error)[field] }));
    }
    if (!result.success) return;
    const snapshot = JSON.stringify(values);
    if (snapshot === lastSaved.current) return;
    lastSaved.current = snapshot;
    startSaving(async () => {
      const saved = await saveLead(toFormData(values));
      if (!saved.ok) lastSaved.current = null; // try again on the next field she leaves
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = customerDetailsInput.safeParse(Object.fromEntries(toFormData(values)));
    if (result.success) {
      setErrors({});
      if (sending.current) return;
      sending.current = true;
      setTotalBefore(null); // the note stays until she moves on
      attemptKey.current ??= crypto.randomUUID();
      const data = toFormData(values);
      data.set("idempotencyKey", attemptKey.current);
      startTransition(() => dispatch(data));
      return;
    }
    const found = fieldErrors(result.error);
    setErrors(found);
    const first = DETAILS_FIELDS.find((f) => found[f]);
    if (first) document.getElementById(first)?.focus();
  }

  const showOptions = deliveryOptions.length > 0 && cep !== null && digits(values.cep) === cep;

  const field = (spec: FieldSpec) => (
    <div key={spec.name} className={`min-w-0 ${spec.span === "short" ? "" : spec.span === "wide" ? "col-span-2" : "col-span-3"}`}>
      <Field
        label={spec.label}
        name={spec.name}
        type={spec.type}
        inputMode={spec.inputMode}
        autoComplete={spec.autoComplete}
        maxLength={spec.maxLength}
        value={values[spec.name]}
        onChange={(value) => {
          update({ [spec.name]: value });
          if (spec.name === "cep") watchCep(value);
        }}
        onBlur={() => leave(spec.name)}
        error={errors[spec.name]}
      />
    </div>
  );

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-3">
      <fieldset aria-labelledby="details-contact" className="flex flex-col gap-3 bg-card p-4">
        <h2 id="details-contact" className={heading}>
          Seus dados
        </h2>
        <div className="grid grid-cols-3 gap-3">{CONTACT.map(field)}</div>
        {/* CHK-06 (LGPD) */}
        <p className="text-[0.8125rem] text-muted">
          Podemos usar seu e-mail e celular para lembrar você desta compra, se ela não for concluída. Cada lembrete traz
          a opção de parar de receber.
        </p>
        <a href="/privacidade" className="-mt-3 flex min-h-12 w-fit items-center text-[0.8125rem] text-primary underline">
          Política de privacidade
        </a>
      </fieldset>

      <fieldset aria-labelledby="details-address" className="flex flex-col gap-3 bg-card p-4">
        <h2 id="details-address" className={heading}>
          Endereço de entrega
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {field(ADDRESS[0])}
          <div aria-hidden />
          {ADDRESS.slice(1).map(field)}
        </div>
      </fieldset>

      {/* CHK-09: options only for the CEP she typed, once the cart has it. */}
      <fieldset aria-labelledby="details-delivery" className="flex flex-col gap-3 bg-card p-4">
        <h2 id="details-delivery" className={heading}>
          Entrega
        </h2>
        {showOptions ? (
          <div className="flex flex-col border-t border-line">
            {deliveryOptions.map((option) => (
              <label
                key={option.type}
                className="grid min-h-14 cursor-pointer grid-cols-[1.5rem_1fr_auto] items-center gap-2.5 border-b border-line py-2.5 text-[0.9375rem] has-focus-visible:outline-2 has-focus-visible:outline-primary"
              >
                <input
                  type="radio"
                  name="delivery"
                  value={option.type}
                  checked={option.type === (picked ?? chosenDelivery)}
                  onChange={() => pick(option.type)}
                  className="size-5 accent-primary"
                />
                <span className="flex flex-col">
                  <span>{option.label}</span>
                  <span className="text-sm text-success">{option.deliveryTime}</span>
                </span>
                <span className={`tabular-nums ${option.free ? "font-medium text-success" : ""}`}>{option.price}</span>
              </label>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">Digite o CEP para ver as opções de entrega.</p>
        )}
        {cepMessage && <Alert>{cepMessage}</Alert>}
        {deliveryMessage && <Alert>{deliveryMessage}</Alert>}
        {errors.delivery && <Alert>{errors.delivery}</Alert>}
        {/* CHK-10: the change in the total, said in words before payment. */}
        {totalBefore && totalBefore !== total && (
          <div role="status" className="flex flex-col gap-0.5 border border-line p-3 text-sm">
            <strong className="font-medium">O frete mudou com o novo CEP</strong>
            <span className="tabular-nums">
              Total: {totalBefore} → {total}
            </span>
          </div>
        )}
      </fieldset>

      {/* CHK-07 (LGPD): one box per channel, both unchecked; the purchase goes on either way. */}
      <fieldset aria-labelledby="details-news" className="flex flex-col gap-1 bg-card p-4">
        <h2 id="details-news" className={heading}>
          Novidades
        </h2>
        {(
          [
            ["marketingEmail", "Quero receber novidades por e-mail"],
            ["marketingWhatsapp", "Quero receber novidades por WhatsApp"],
          ] as const
        ).map(([name, label]) => (
          <label key={name} className="grid min-h-12 cursor-pointer grid-cols-[24px_1fr] items-center gap-2.5 text-[0.9375rem]">
            <input
              type="checkbox"
              name={name}
              checked={values[name]}
              onChange={(e) => update({ [name]: e.target.checked })}
              className="size-5 accent-primary"
            />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>

      {/* GER-02: total and the main button fixed at the bottom on phones. */}
      <div
        data-purchase-bar
        className="fixed inset-x-0 bottom-0 z-10 flex flex-col gap-3 border-t border-line bg-background p-4 md:static md:border-0 md:px-0"
      >
        {state.error && <Alert>{state.error}</Alert>}
        <div className="flex items-center gap-4">
          <p className="flex flex-col text-sm">
            <span>Total</span>
            <span className="text-[1.0625rem] font-medium tabular-nums">{total}</span>
          </p>
          <Button variant="primary" type="submit" disabled={pending} className="flex-1">
            {pending ? "Processando" : "Ir para pagamento"}
          </Button>
        </div>
      </div>
    </form>
  );
}
