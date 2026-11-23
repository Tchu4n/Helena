// CHK-02, CTA-05: the address fields as checkout shows them (label above, matching autocomplete, contract
// limits widened for typed separators), shared with Meus endereços. No server-only: both forms run in the browser.
import type { AddressField } from "./schemas/customerDetails.ts";

export type AddressFieldSpec = {
  name: AddressField;
  label: string;
  autoComplete: string;
  maxLength: number;
  inputMode?: "numeric";
  span?: "short" | "wide"; // address grid: 1 or 2 of 3 columns; otherwise the full row
};

export const ADDRESS_FIELD_SPECS: AddressFieldSpec[] = [
  { name: "cep", label: "CEP", autoComplete: "postal-code", maxLength: 9, inputMode: "numeric", span: "wide" },
  { name: "street", label: "Rua", autoComplete: "address-line1", maxLength: 100 },
  { name: "number", label: "Número", autoComplete: "off", maxLength: 10, inputMode: "numeric", span: "short" },
  { name: "complement", label: "Complemento (opcional)", autoComplete: "address-line2", maxLength: 40, span: "wide" },
  { name: "neighborhood", label: "Bairro", autoComplete: "address-level3", maxLength: 60 },
  { name: "city", label: "Cidade", autoComplete: "address-level2", maxLength: 60, span: "wide" },
  { name: "state", label: "UF", autoComplete: "address-level1", maxLength: 2, span: "short" },
];
