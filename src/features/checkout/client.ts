// Public entry of the checkout domain for client components of other domains: only what runs in the browser.
export { clearDetails } from "./checkout-storage.ts";
export { ADDRESS_FIELDS, addressInput, CONTACT_FIELDS, contactInput } from "./schemas/customerDetails.ts";
export type { AddressField } from "./schemas/customerDetails.ts";
export { ADDRESS_FIELD_SPECS } from "./address-fields.ts";
export type { AddressFieldSpec } from "./address-fields.ts";
