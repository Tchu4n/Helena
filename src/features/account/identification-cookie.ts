import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";

// IDT-07: the e-mail waiting for a code and the way she chose survive a reload (the Instagram browser
// may reload the page when she comes back from the e-mail app). Written only from Server Actions.
const IDENTIFICATION_COOKIE = "helena_identification";
const MAX_AGE = 10 * 60; // the code's own life

const Pending = z.object({ email: z.email(), way: z.enum(["guest", "account"]), sentAt: z.number().int().positive() });
export type PendingIdentification = z.infer<typeof Pending>;

export async function readIdentification(): Promise<PendingIdentification | null> {
  const raw = (await cookies()).get(IDENTIFICATION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = Pending.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function saveIdentification(value: PendingIdentification): Promise<void> {
  (await cookies()).set(IDENTIFICATION_COOKIE, JSON.stringify(value), {
    maxAge: MAX_AGE,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export async function clearIdentification(): Promise<void> {
  (await cookies()).delete(IDENTIFICATION_COOKIE);
}
