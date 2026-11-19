import { test, expect, type Page } from "@playwright/test";
import { skipCookieBanner } from "./consent";

// GER-08: main content visible (LCP) in up to 3 s on slow 4G, mid-range phone.
// Throttling close to Lighthouse's "slow 4G": 400 kbit/s down, 400 ms latency, CPU 4x slower.
async function largestContentfulPaint(page: Page, path: string): Promise<number> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 400,
    downloadThroughput: (400 * 1024) / 8,
    uploadThroughput: (400 * 1024) / 8,
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

  await page.goto(path, { waitUntil: "load" });
  return page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          resolve(entries[entries.length - 1].startTime);
        }).observe({ type: "largest-contentful-paint", buffered: true });
      }),
  );
}

test.beforeEach(async ({ context }) => skipCookieBanner(context));

for (const path of ["/", "/catalogo", "/produto/jaqueta-sarja-verde"]) {
  test(`GER-08 main content of ${path} under 3 s on slow 4G`, async ({ page }) => {
    test.setTimeout(60_000);
    const lcp = await largestContentfulPaint(page, path);
    console.log(`LCP ${path}: ${Math.round(lcp)} ms`);
    expect(lcp).toBeLessThan(3000);
  });
}
