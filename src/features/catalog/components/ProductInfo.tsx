import Link from "next/link";
import { Badge } from "@/src/components/ui";
import type { ProductView } from "../views.ts";
import { Price } from "./Price.tsx";

const LABEL = "font-mono text-[0.625rem] font-medium uppercase tracking-[0.08em] text-muted";

// The product color comes from the API (it is the garment's color, not an interface token); its name is always shown in text.
function Swatch({ hex }: { hex: string }) {
  return <span aria-hidden className="inline-block size-5 rounded-full border border-line" style={{ backgroundColor: hex }} />;
}

export function ProductHeading({ product }: { product: ProductView }) {
  return (
    <div className="flex flex-col gap-2">
      {product.discountBadge && product.originalPrice !== null && (
        <span>
          <Badge tone="sale">{product.discountBadge}</Badge>
        </span>
      )}
      <h1 className="font-serif text-[1.75rem] font-normal leading-tight text-pretty md:text-[2rem]">{product.name}</h1>
      <Price price={product.price} originalPrice={product.originalPrice} className="text-lg" />
      {product.installmentText && <p className="text-sm text-muted">{product.installmentText}</p>}
    </div>
  );
}

export function ProductColors({ product }: { product: ProductView }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-2 text-sm">
        <span className={LABEL}>Cor</span>
        <Swatch hex={product.color.hex} />
        <span>{product.color.name}</span>
      </p>
      {product.otherColors.length > 0 && (
        <ul aria-label="Outras cores" className="flex flex-wrap gap-2">
          {product.otherColors.map((color) => (
            <li key={color.slug}>
              <Link
                href={`/produto/${color.slug}`}
                className="inline-flex min-h-12 items-center gap-2 rounded-control border border-control px-4 text-sm"
              >
                <Swatch hex={color.hex} />
                {color.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ProductDetails({ product }: { product: ProductView }) {
  return (
    <div className="flex flex-col gap-4 text-sm">
      <p className="leading-relaxed">{product.description}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
        <dt className={LABEL}>Tecido</dt>
        <dd>{product.fabric}</dd>
        <dt className={LABEL}>Coleção</dt>
        <dd>{product.collection}</dd>
      </dl>
    </div>
  );
}
