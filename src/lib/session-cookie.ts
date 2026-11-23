import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";

// The customer's session (IDT-08 to IDT-11, CTA-01): the API token and the e-mail she signed in with,
// so pages know it without an extra call. Shared by checkout, orders and account, like the order cookie.
// Written only from Server Actions; never reaches the browser's JavaScript (httpOnly).
const SESSION_COOKIE = "helena_session";

const Session = z.object({ token: z.string().min(1), email: z.email() });
export type SessionValue = z.infer<typeof Session>;

export async function readSession(): Promise<SessionValue | null> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = Session.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function saveSession(value: SessionValue, expiresAt: string): Promise<void> {
  const seconds = Math.floor((Date.parse(expiresAt) - Date.now()) / 1000);
  (await cookies()).set(SESSION_COOKIE, JSON.stringify({ token: value.token, email: value.email }), {
    maxAge: Number.isFinite(seconds) ? Math.max(seconds, 60) : 60,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

export const bearer = (session: SessionValue | null): Record<string, string> =>
  session ? { Authorization: `Bearer ${session.token}` } : {};
