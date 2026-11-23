import "server-only";
import { headers } from "next/headers";

// Plain server module, not "use server": every export of a "use server" file becomes a public endpoint.
// CHK-07, PED-06: the back end records the IP of each consent and limits lookups by IP; the first hop of X-Forwarded-For is the customer.
export async function forwardedFor(): Promise<Record<string, string>> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim();
  return ip ? { "X-Forwarded-For": ip } : {};
}
