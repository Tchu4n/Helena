"use client";

import { useActionState, useEffect, useState } from "react";
import { AlertIcon, Button, CheckIcon, Field } from "@/src/components/ui";
import { ADDRESS_FIELD_SPECS, type AddressField } from "@/src/features/checkout/client";
import { ADDRESS_LIMIT, type AddressFormState, type AddressNotice } from "../types.ts";
import type { AddressView } from "../views.ts";

type Props = {
  addresses: AddressView[];
  limit: number;
  saveAddress: (prev: AddressFormState, formData: FormData) => Promise<AddressFormState>;
  removeAddress: (prev: AddressNotice, formData: FormData) => Promise<AddressNotice>;
  makeFavorite: (prev: AddressNotice, formData: FormData) => Promise<AddressNotice>;
};

const EMPTY_FIELDS: Record<AddressField, string> = { cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "" };

function Alert({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="flex items-start gap-2 text-sm text-error">
      <AlertIcon className="size-5 shrink-0" />
      {children}
    </p>
  );
}

// CTA-05: the checkout's address fields (CHK-02, CHK-03), filled in for "Editar". Remounted for each opening,
// so no error of an earlier opening stays.
function AddressForm({ address, saveAddress, onDone }: { address: AddressView | null; saveAddress: Props["saveAddress"]; onDone: (saved: boolean) => void }) {
  // Kept here, since React resets a form after each action.
  const [values, setValues] = useState(address?.fields ?? EMPTY_FIELDS);
  const [state, submit, saving] = useActionState<AddressFormState, FormData>(
    async (prev, formData) => {
      const next = await saveAddress(prev, formData);
      if (next.saved) onDone(true);
      return next;
    },
    { errors: {}, error: null, saved: false },
  );
  // Focus goes to the first wrong field (DESIGN.md: errors with border, icon and text).
  useEffect(() => {
    const first = ADDRESS_FIELD_SPECS.find((spec) => state.errors[spec.name]);
    if (first) document.getElementById(first.name)?.focus();
  }, [state.errors]);

  return (
    <form action={submit} noValidate className="flex flex-col gap-4 bg-card p-4">
      {address && <input type="hidden" name="id" value={address.id} />}
      <div className="grid grid-cols-3 gap-3">
        {ADDRESS_FIELD_SPECS.map((spec) => (
          <div key={spec.name} className={`min-w-0 ${spec.span === "short" ? "" : spec.span === "wide" ? "col-span-2" : "col-span-3"}`}>
            <Field
              label={spec.label}
              name={spec.name}
              autoComplete={spec.autoComplete}
              maxLength={spec.maxLength}
              inputMode={spec.inputMode}
              value={values[spec.name]}
              onChange={(value) => setValues((v) => ({ ...v, [spec.name]: value }))}
              error={state.errors[spec.name]}
            />
          </div>
        ))}
      </div>
      {state.error && <Alert>{state.error}</Alert>}
      <Button variant="primary" type="submit" disabled={saving}>
        {saving ? "Processando" : "Salvar endereço"}
      </Button>
      <Button variant="secondary" onClick={() => onDone(false)}>
        Cancelar
      </Button>
    </form>
  );
}

// CTA-05, CTA-11: her addresses, the favorite first; add, edit, remove (with a confirmation) and "Tornar favorito".
export function MyAddresses({ addresses, limit, saveAddress, removeAddress, makeFavorite }: Props) {
  const [editing, setEditing] = useState<"new" | string | null>(null); // "new", an address id, or closed
  const [confirming, setConfirming] = useState<string | null>(null);
  // One line for the last thing done: "Endereço salvo", "Endereço removido", "Endereço favorito atualizado".
  const [message, setMessage] = useState<AddressNotice>({ notice: null, error: null });
  const [, change, changing] = useActionState<AddressNotice, FormData>(async (prev, formData) => {
    const next = await (formData.get("intent") === "remove" ? removeAddress : makeFavorite)(prev, formData);
    setMessage(next);
    setConfirming(null);
    return next;
  }, message);

  const open = (which: string) => {
    setEditing(which);
    setConfirming(null);
    setMessage({ notice: null, error: null });
  };
  const done = (saved: boolean) => {
    setEditing(null);
    setMessage({ notice: saved ? "Endereço salvo" : null, error: null });
  };

  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-8">
      <h1 className="font-serif text-[1.75rem] font-normal">Meus endereços</h1>
      <p role="status" className="text-sm text-success">
        {message.notice ?? ""}
      </p>
      {message.error && <Alert>{message.error}</Alert>}

      {addresses.length === 0 && editing !== "new" && <p>Você ainda não tem endereços salvos</p>}

      {addresses.length > 0 && (
        <ul className="flex flex-col gap-3">
          {addresses.map((address) =>
            editing === address.id ? (
              <li key={address.id}>
                <AddressForm address={address} saveAddress={saveAddress} onDone={done} />
              </li>
            ) : (
              <li key={address.id} className="flex flex-col gap-3 bg-card p-4">
                {address.favorite && (
                  <p className="flex items-center gap-1.5 font-mono text-xs font-medium uppercase tracking-[0.08em]">
                    <CheckIcon className="size-4" />
                    Favorito
                  </p>
                )}
                <div className="flex flex-col gap-0.5">
                  <p>{address.line}</p>
                  <p className="text-sm text-muted">{address.place}</p>
                  <p className="text-sm text-muted">CEP {address.cep}</p>
                </div>
                {confirming === address.id ? (
                  <form action={change} className="flex flex-col gap-2">
                    <p className="font-medium">Remover este endereço?</p>
                    <input type="hidden" name="id" value={address.id} />
                    <input type="hidden" name="intent" value="remove" />
                    {/* CTA-05: "Remover" and "Cancelar" the same size and color. */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="secondary" type="submit" disabled={changing}>
                        Remover
                      </Button>
                      <Button variant="secondary" onClick={() => setConfirming(null)}>
                        Cancelar
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => open(address.id)}>
                      Editar
                    </Button>
                    <Button variant="secondary" onClick={() => setConfirming(address.id)}>
                      Remover
                    </Button>
                    {!address.favorite && (
                      <form action={change}>
                        <input type="hidden" name="id" value={address.id} />
                        <input type="hidden" name="intent" value="favorite" />
                        <Button variant="secondary" type="submit" disabled={changing}>
                          Tornar favorito
                        </Button>
                      </form>
                    )}
                  </div>
                )}
              </li>
            ),
          )}
        </ul>
      )}

      {editing === "new" ? (
        <AddressForm address={null} saveAddress={saveAddress} onDone={done} />
      ) : addresses.length >= limit ? (
        <p>{ADDRESS_LIMIT}</p>
      ) : (
        <Button variant="primary" onClick={() => open("new")}>
          Adicionar endereço
        </Button>
      )}
    </div>
  );
}
