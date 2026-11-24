// CTA-05: Meus endereços gets only the fields it shows, with the texts ready. Pure, so the unit tests import it.
import type { AddressField } from "@/src/features/checkout/client";
import type { components } from "@/src/lib/api-types";

type SavedAddress = components["schemas"]["SavedAddress"];

export type AddressView = {
  id: string;
  favorite: boolean;
  line: string; // "Avenida Paulista, 1000, Apto 12"
  place: string; // "Bela Vista · São Paulo/SP"
  cep: string; // "01310-100"
  fields: Record<AddressField, string>; // as stored, for "Editar"; complement "" when there is none
};

export function toAddressView(saved: SavedAddress): AddressView {
  const { id, favorite, cep, street, number, complement, neighborhood, city, state } = saved;
  return {
    id,
    favorite,
    line: [street, number, complement].filter(Boolean).join(", "),
    place: `${neighborhood} · ${city}/${state}`,
    cep: `${cep.slice(0, 5)}-${cep.slice(5)}`,
    fields: { cep, street, number, complement: complement ?? "", neighborhood, city, state },
  };
}
