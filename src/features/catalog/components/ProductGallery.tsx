import Image from "next/image";
import type { ProductView } from "../views.ts";

// Carousel by CSS scroll-snap on phones, 2×2 grid from md up; no JavaScript (DESIGN.md, section 5).
// The first photo loads eagerly with high priority: it is the largest image on screen (GER-08).
export function ProductGallery({ photos }: { photos: ProductView["photos"] }) {
  return (
    <ul
      aria-label="Fotos do produto"
      className="flex snap-x snap-mandatory overflow-x-auto md:grid md:grid-cols-2 md:gap-1 md:overflow-visible"
    >
      {photos.map((photo, index) => (
        <li key={`${photo.url}-${index}`} className="relative aspect-[3/4] w-full shrink-0 snap-start bg-surface">
          <Image
            src={photo.url}
            alt={photo.alt}
            fill
            sizes="(min-width: 48rem) 50vw, 100vw"
            loading={index === 0 ? "eager" : "lazy"}
            fetchPriority={index === 0 ? "high" : "auto"}
            className="object-cover"
          />
        </li>
      ))}
    </ul>
  );
}
