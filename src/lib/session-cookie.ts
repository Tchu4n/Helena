import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";

// The customer's session (IDT-08 to IDT-11, IDT-14, CTA-01): the API token, the e-mail she signed in with,
// whether the account has name, CPF and phone, and when it ends, so pages know it without an extra call. Shared by checkout, orders and account, like the order cookie.
// Written only from Server Actions; never reaches the browser's JavaScript (httpOnly).
const SESSION_COOKIE = "helena_session";

const Session = z.object({
  token: z.string().min(1),
  email: z.email(),
  detailsComplete: z.boolean().catch(false), // a cookie from before IDT-14 reads as "not complete"
  expiresAt: z.string().min(1),
});
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

export async function saveSession(value: SessionValue): Promise<void> {
  const seconds = Math.floor((Date.parse(value.expiresAt) - Date.now()) / 1000);
  const { token, email, detailsComplete, expiresAt } = value;
  (await cookies()).set(SESSION_COOKIE, JSON.stringify({ token, email, detailsComplete, expiresAt }), {
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
