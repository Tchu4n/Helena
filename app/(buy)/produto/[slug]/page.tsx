import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ErrorMessage } from "@/src/components/ui";
import { addToCart, getCartSummary, ShippingCalculator } from "@/src/features/cart";
import {
  getProduct,
  ProductColors,
  ProductDetails,
  ProductGallery,
  ProductHeading,
  ProductPurchase,
  SizeGuide,
} from "@/src/features/catalog";
import { getConsent } from "@/src/features/privacy";

async function ProductContent({ params }: { params: PageProps<"/produto/[slug]">["params"] }) {
  const { slug } = await params;
  const [result, cart, consent] = await Promise.all([getProduct(slug), getCartSummary(), getConsent()]);
  if (!result.ok) {
    if (result.problem.status === 404) notFound();
    return <ErrorMessage title={result.problem.title} retryHref={`/produto/${encodeURIComponent(slug)}`} />;
  }
  const product = result.data;
  return (
    <article className="flex flex-col gap-6 pb-8 md:grid md:grid-cols-[3fr_2fr] md:gap-8 md:px-4 md:pt-4">
      <ProductGallery photos={product.photos} />
      <div className="flex flex-col gap-6 px-4 md:px-0">
        <ProductHeading product={product} />
        <ProductColors product={product} />
        <ProductPurchase sizes={product.sizes} soldOut={product.soldOut} addToCart={addToCart} />
        <ShippingCalculator productId={product.id} savedCep={cart?.cep ?? null} remembersCeps={consent?.functional === true} />
        {product.sizeGuide && <SizeGuide guide={product.sizeGuide} />}
        <ProductDetails product={product} />
      </div>
    </article>
  );
}

export default function ProductPage({ params }: PageProps<"/produto/[slug]">) {
  return (
    <Suspense fallback={null}>
      <ProductContent params={params} />
    </Suspense>
  );
}
