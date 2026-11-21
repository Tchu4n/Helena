import type { DetailsField } from "./schemas/customerDetails.ts";

export type GoToPaymentState = { errors: Partial<Record<DetailsField | "delivery", string>>; error: string | null };
