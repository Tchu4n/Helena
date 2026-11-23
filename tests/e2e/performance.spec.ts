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

for (const path of ["/", "/catalogo", "/produto/jaqueta-sarja-verde", "/pedido", "/conta"]) {
  test(`GER-08 main content of ${path} under 3 s on slow 4G`, async ({ page }) => {
    test.setTimeout(60_000);
    const lcp = await largestContentfulPaint(page, path);
    console.log(`LCP ${path}: ${Math.round(lcp)} ms`);
    expect(lcp).toBeLessThan(3000);
  });
}

// /sacola needs a bag with pieces, or it measures the empty bag.
test("GER-08 main content of /sacola under 3 s on slow 4G", async ({ context, page }) => {
  test.setTimeout(60_000);
  const response = await context.request.post("http://localhost:4011/__carts", {
    data: {
      lines: [
        { productSizeId: "5a1e0000-0000-4000-8000-000000000002" },
        { productSizeId: "5a1e0000-0000-4000-8000-000000000004" },
      ],
      cep: "01310100",
      chosen: "pac",
    },
  });
  const { id } = await response.json();
  await context.addCookies([{ name: "helena_cart", value: id, url: "http://localhost:3100" }]);
  const lcp = await largestContentfulPaint(page, "/sacola");
  console.log(`LCP /sacola: ${Math.round(lcp)} ms`);
  expect(lcp).toBeLessThan(3000);
});

// /checkout needs a bag with pieces, or it goes back to the bag.
test("GER-08 main content of /checkout under 3 s on slow 4G", async ({ context, page }) => {
  test.setTimeout(60_000);
  const response = await context.request.post("http://localhost:4011/__carts", {
    data: {
      lines: [{ productSizeId: "5a1e0000-0000-4000-8000-000000000002" }],
      cep: "01310100",
      chosen: "pac",
      verifiedEmail: "maria@exemplo.com",
    },
  });
  const { id } = await response.json();
  await context.addCookies([{ name: "helena_cart", value: id, url: "http://localhost:3100" }]);
  const lcp = await largestContentfulPaint(page, "/checkout");
  console.log(`LCP /checkout: ${Math.round(lcp)} ms`);
  expect(lcp).toBeLessThan(3000);
});

// /checkout/identificacao needs a bag with pieces, or it goes back to the bag.
test("GER-08 main content of /checkout/identificacao under 3 s on slow 4G", async ({ context, page }) => {
  test.setTimeout(60_000);
  const response = await context.request.post("http://localhost:4011/__carts", {
    data: { lines: [{ productSizeId: "5a1e0000-0000-4000-8000-000000000002" }] },
  });
  const { id } = await response.json();
  await context.addCookies([{ name: "helena_cart", value: id, url: "http://localhost:3100" }]);
  const lcp = await largestContentfulPaint(page, "/checkout/identificacao");
  console.log(`LCP /checkout/identificacao: ${Math.round(lcp)} ms`);
  expect(lcp).toBeLessThan(3000);
});
