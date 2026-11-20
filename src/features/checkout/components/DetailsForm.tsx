"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { Button } from "@/src/components/ui/Button.tsx";
import { Field } from "@/src/components/ui/Field.tsx";
import { readDetails, writeDetails, type StoredDetails } from "../checkout-storage.ts";
import { customerDetailsInput, DETAILS_FIELDS, fieldErrors, type DetailsField } from "../schemas/customerDetails.ts";

type Props = {
  total: string;
  saveLead: (formData: FormData) => Promise<{ ok: boolean }>;
};

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
export function DetailsForm({ total, saveLead }: Props) {
  const [values, setValues] = useState<StoredDetails>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<DetailsField, string>>>({});
  const [, startSaving] = useTransition();
  const lastSaved = useRef<string | null>(null);

  // CHK-23: refill from this tab's storage once mounted (the server never has her details).
  useEffect(() => {
    const stored = readDetails();
    if (!stored) return;
    const next = { ...EMPTY };
    for (const field of DETAILS_FIELDS) if (typeof stored[field] === "string") next[field] = stored[field];
    next.marketingEmail = stored.marketingEmail === true;
    next.marketingWhatsapp = stored.marketingWhatsapp === true;
    setValues(next); // eslint-disable-line react-hooks/set-state-in-effect -- storage is only readable after mount
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
      return;
    }
    const found = fieldErrors(result.error);
    setErrors(found);
    const first = DETAILS_FIELDS.find((f) => found[f]);
    if (first) document.getElementById(first)?.focus();
  }

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
        onChange={(value) => update({ [spec.name]: value })}
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
        className="fixed inset-x-0 bottom-0 z-10 flex items-center gap-4 border-t border-line bg-background p-4 md:static md:border-0 md:px-0"
      >
        <p className="flex flex-col text-sm">
          <span>Total</span>
          <span className="text-[1.0625rem] font-medium tabular-nums">{total}</span>
        </p>
        <Button variant="primary" type="submit" className="flex-1">
          Ir para pagamento
        </Button>
      </div>
    </form>
  );
}
