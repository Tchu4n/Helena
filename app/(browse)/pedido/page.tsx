import type { Metadata } from "next";
import { lookUpOrder, OrderLookupForm } from "@/src/features/orders";

export const metadata: Metadata = { title: "Acompanhar pedido · Helena" };

// PED-05, PED-06: lookup without an account, linked from the footer.
export default function OrderLookupPage() {
  return <OrderLookupForm lookUpOrder={lookUpOrder} />;
}
