import type { DetailsField } from "./schemas/customerDetails.ts";

export type GoToPaymentState = { errors: Partial<Record<DetailsField | "delivery", string>>; error: string | null };

export type PayState = {
  status: "idle" | "pix" | "declined" | "failed";
  pix: { pixCode: string; qrCode: string } | null;
  message: string | null;
};
