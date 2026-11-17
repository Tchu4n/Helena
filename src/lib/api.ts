import "server-only";
import { env } from "./env.ts";
import type { components } from "./api-types.ts";

export type Problem = components["schemas"]["Problem"];
export type ApiResult<T> = { ok: true; data: T } | { ok: false; problem: Problem };

const TIMEOUT_MS = 5000;

// GER-06: any failure without a usable problem+json body becomes this generic message.
const INTERNAL_ERROR: Problem = {
  type: "about:blank",
  title: "Não foi possível concluir. Tente de novo",
  status: 500,
  code: "internal_error",
};

export async function apiGet<T>(
  path: string,
  query: Record<string, string | number | undefined> = {},
): Promise<ApiResult<T>> {
  const url = new URL(path, env.apiUrl);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });
    const body: unknown = await response.json().catch(() => null);
    if (response.ok && body !== null) return { ok: true, data: body as T };
    if (isProblem(body)) return { ok: false, problem: body };
    return { ok: false, problem: INTERNAL_ERROR };
  } catch {
    return { ok: false, problem: INTERNAL_ERROR };
  }
}

function isProblem(body: unknown): body is Problem {
  return typeof body === "object" && body !== null && "code" in body && "title" in body;
}
