import Link from "next/link";
import { CATEGORY_LABELS, CATEGORY_SLUGS, type Category } from "../filters.ts";

const CATEGORIES: Category[] = ["tshirts", "pants", "jackets", "accessories"];

// VIT-02: each tile opens the catalog already filtered. Text-only until category photos exist.
export function CategoryTiles() {
  return (
    <nav aria-label="Categorias" className="px-4">
      <ul className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {CATEGORIES.map((category) => (
          <li key={category}>
            <Link
              href={`/catalogo?categoria=${CATEGORY_SLUGS[category]}`}
              className="flex min-h-24 items-end bg-surface p-4 font-serif text-xl"
            >
              {CATEGORY_LABELS[category]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
