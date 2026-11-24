"use server";

import type { AddressNotice } from "../types.ts";
import { changeAddress } from "./changeAddress.ts";

// CTA-05: "Remover", after "Remover este endereço?"; removing the favorite passes it on (the API does it).
export async function removeAddress(_prev: AddressNotice, formData: FormData): Promise<AddressNotice> {
  return changeAddress(formData, "remove", "Endereço removido");
}
