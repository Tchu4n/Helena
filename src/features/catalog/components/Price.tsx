import { formatPrice } from "@/src/lib/format";

// Old price struck through, then the sale price in `sale` (DESIGN.md, section 4). Used by the card and the product screen.
export function Price({ price, originalPrice, className = "" }: { price: number; originalPrice: number | null; className?: string }) {
  return (
    <p className={`flex flex-wrap items-baseline gap-x-2 ${className}`}>
      {originalPrice !== null ? (
        <>
          <span className="sr-only">Preço anterior</span>
          <s className="text-muted">{formatPrice(originalPrice)}</s>
          <span className="sr-only">Preço atual</span>
          <span className="font-medium text-sale">{formatPrice(price)}</span>
        </>
      ) : (
        <span className="font-medium">{formatPrice(price)}</span>
      )}
    </p>
  );
}
