import { Suspense } from "react";
import { ErrorMessage } from "@/src/components/ui";
import { addToCart } from "@/src/features/cart";
import { BenefitsStrip, Campaign, CategoryTiles, getHome, ProductGrid } from "@/src/features/catalog";
import { PaymentSuccess } from "@/src/features/checkout";

// VIT-01 order: campaign, benefits, categories, "Em destaque" (bar and header come from the layout).
async function HomeContent() {
  const home = await getHome();
  if (!home.ok) return <ErrorMessage title={home.problem.title} retryHref="/" />;
  return (
    <div className="flex flex-col gap-8 pb-8">
      <Campaign campaign={home.data.campaign} />
      <BenefitsStrip />
      <CategoryTiles />
      <section aria-labelledby="featured-title" className="flex flex-col gap-4 px-4">
        <h2 id="featured-title" className="font-serif text-2xl font-normal md:text-[2rem]">
          Em destaque
        </h2>
        <ProductGrid products={home.data.featured} addToCart={addToCart} />
      </section>
    </div>
  );
}

// CHK-16, CHK-20: "?pedido=HL-…" after a payment; PaymentSuccess checks it against her order cookie.
async function Success({ searchParams }: { searchParams: Promise<{ pedido?: string | string[] }> }) {
  const { pedido } = await searchParams;
  return typeof pedido === "string" && /^HL-\d{1,12}$/.test(pedido) ? <PaymentSuccess orderNumber={pedido} /> : null;
}

// The success box has its own Suspense, so the campaign (the LCP) never waits for it.
export default function HomePage({ searchParams }: { searchParams: Promise<{ pedido?: string | string[] }> }) {
  return (
    <>
      <Suspense fallback={null}>
        <Success searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={null}>
        <HomeContent />
      </Suspense>
    </>
  );
}
