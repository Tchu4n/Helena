import { Suspense } from "react";
import { ErrorMessage } from "@/src/components/ui";
import { addToCart } from "@/src/features/cart";
import { BenefitsStrip, Campaign, CategoryTiles, getHome, ProductGrid } from "@/src/features/catalog";

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

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
