"use server";

import { fetchOrder, isPaid } from "../queries/getPaymentOrder.ts";

// CHK-16: the PIX screen asks every few seconds; any failure just means "still waiting".
export async function checkPayment(): Promise<{ status: "waiting" | "paid" | "expired"; number: string | null }> {
  const result = await fetchOrder(); // authorization: the order cookie
  if (!result?.ok) return { status: "waiting", number: null };
  const { status, number } = result.data;
  if (isPaid(status)) return { status: "paid", number };
  return { status: status === "reservation_expired" ? "expired" : "waiting", number };
}
