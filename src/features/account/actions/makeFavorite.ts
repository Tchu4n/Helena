"use server";

import type { AddressNotice } from "../types.ts";
import { changeAddress } from "./changeAddress.ts";

// CTA-05: "Tornar favorito" makes this address the account's only favorite.
export async function makeFavorite(_prev: AddressNotice, formData: FormData): Promise<AddressNotice> {
  return changeAddress(formData, "favorite", "Endereço favorito atualizado");
}
