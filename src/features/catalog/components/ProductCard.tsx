import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/src/components/ui";
import type { AddToCartState } from "@/src/features/cart/client";
import type { CardProduct } from "../views.ts";
import { Price } from "./Price.tsx";
import { QuickBuy } from "./QuickBuy.tsx";

export type AddToCart = (prev: AddToCartState, formData: FormData) => Promise<AddToCartState>;

type Props = { product: CardProduct; size?: string; eager?: boolean; addToCart?: AddToCart };

// Photo 3:4 on `surface`, badge, name and price (DESIGN.md, section 5). Square corners.
// `eager` is for the first cards on screen, which hold the largest image (GER-08).
export function ProductCard({ product, size, eager = false, addToCart }: Props) {
  const onSale = product.originalPrice !== null;
  return (
    <div className="relative">
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
        <Price price={product.price} originalPrice={product.originalPrice} className="text-sm" />
      </Link>
      {/* CAT-08: outside the link, since a button cannot sit inside a link. */}
      {addToCart && !product.soldOut && <QuickBuy product={{ name: product.name, sizes: product.sizes }} addToCart={addToCart} />}
    </div>
  );
}
