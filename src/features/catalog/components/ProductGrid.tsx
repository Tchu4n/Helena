import type { CardProduct } from "../views.ts";
import { ProductCard, type AddToCart } from "./ProductCard.tsx";

// Keeps the API order: sold-out products already come last (VIT-05, CAT-05).
export function ProductGrid({
  products,
  size,
  eagerCount = 0,
  addToCart,
}: {
  products: CardProduct[];
  size?: string;
  eagerCount?: number;
  addToCart?: AddToCart;
}) {
  return (
    <ul className="grid grid-cols-2 gap-x-2 gap-y-6 md:grid-cols-4 md:gap-x-4">
      {products.map((product, index) => (
        <li key={product.slug}>
          <ProductCard product={product} size={size} eager={index < eagerCount} addToCart={addToCart} />
        </li>
      ))}
    </ul>
  );
}
