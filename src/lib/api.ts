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
  return request<T>(url, { method: "GET" });
}

export function apiPost<T>(path: string, body?: unknown): Promise<ApiResult<T>> {
  return request<T>(new URL(path, env.apiUrl), {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function apiPut<T>(path: string, body: unknown): Promise<ApiResult<T>> {
  return request<T>(new URL(path, env.apiUrl), { method: "PUT", body: JSON.stringify(body) });
}

async function request<T>(url: URL, init: { method: string; body?: string }): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: init.body
        ? { Accept: "application/json", "Content-Type": "application/json" }
        : { Accept: "application/json" },
    });
    // 201 without a body (for example, a saved restock alert) still counts as success.
    if (response.status === 201 || response.status === 204) {
      const text = await response.text();
      return { ok: true, data: (text ? JSON.parse(text) : null) as T };
    }
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
