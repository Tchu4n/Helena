import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/src/components/ui";
import { formatPrice } from "@/src/lib/format";
import type { CardProduct } from "../views.ts";

// Photo 3:4 on `surface`, badge, name and price (DESIGN.md, section 5). Square corners.
// `eager` is for the first cards on screen, which hold the largest image (GER-08).
export function ProductCard({ product, size, eager = false }: { product: CardProduct; size?: string; eager?: boolean }) {
  const onSale = product.originalPrice !== null;
  return (
    <Link href={`/produto/${product.slug}`} className="flex flex-col gap-2">
      <div className="relative aspect-[3/4] bg-surface">
        <Image
          src={product.photoUrl}
          alt={product.photoAlt}
          fill
          sizes="(min-width: 48rem) 25vw, 50vw"
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          className="object-cover"
        />
        <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
          {onSale && product.discountBadge && <Badge tone="sale">{product.discountBadge}</Badge>}
          {product.soldOut && <Badge tone="neutral">Esgotado</Badge>}
          {!product.soldOut && product.soldOutInSize && size && <Badge tone="neutral">Esgotado no {size}</Badge>}
        </div>
      </div>
      <p className="text-sm leading-[1.4] text-pretty">{product.name}</p>
      <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
        {onSale ? (
          <>
            <span className="sr-only">Preço anterior</span>
            <s className="text-muted">{formatPrice(product.originalPrice!)}</s>
            <span className="sr-only">Preço atual</span>
            <span className="font-medium text-sale">{formatPrice(product.price)}</span>
          </>
        ) : (
          <span className="font-medium">{formatPrice(product.price)}</span>
        )}
      </p>
    </Link>
  );
}
