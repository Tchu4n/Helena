import type { BrowserContext } from "@playwright/test";

// Screen tests that are not about cookies start with a choice made, so the banner does not cover the page.
export async function skipCookieBanner(context: BrowserContext) {
  await context.addCookies([
    {
      name: "helena_consent",
      value: encodeURIComponent(JSON.stringify({ v: 1, analytics: false, marketing: false })),
      url: "http://localhost:3100",
    },
  ]);
}
