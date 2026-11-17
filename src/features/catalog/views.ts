// Only the fields the screens use go to components; the full API response never does.
import type { components } from "../../lib/api-types.ts";

type ProductSummary = components["schemas"]["ProductSummary"];
type Home = components["schemas"]["Home"];
type ProductPage = components["schemas"]["ProductPage"];

export type CardProduct = {
  slug: string;
  name: string;
  photoUrl: string;
  photoAlt: string;
  price: number;
  originalPrice: number | null;
  discountBadge: string | null;
  soldOut: boolean;
  soldOutInSize: boolean;
};

export type HomeView = {
  announcement: string | null;
  campaign: { title: string; text: string | null; imageUrl: string; imageAlt: string; link: string };
  featured: CardProduct[];
};

export type ProductListView = { items: CardProduct[]; total: number; page: number; perPage: number };

export function toCardProduct(p: ProductSummary): CardProduct {
  return {
    slug: p.slug,
    name: p.name,
    photoUrl: p.photo.url,
    photoAlt: p.photo.altText,
    price: p.price,
    originalPrice: p.originalPrice ?? null,
    discountBadge: p.discountBadge ?? null,
    soldOut: p.soldOut,
    soldOutInSize: p.soldOutInSize ?? false,
  };
}

export function toHomeView(home: Home): HomeView {
  return {
    announcement: home.announcement ?? null,
    campaign: {
      title: home.campaign.title,
      text: home.campaign.text ?? null,
      imageUrl: home.campaign.image.url,
      imageAlt: home.campaign.image.altText,
      link: home.campaign.link,
    },
    featured: home.featured.map(toCardProduct),
  };
}

export function toProductListView(page: ProductPage): ProductListView {
  return { items: page.items.map(toCardProduct), total: page.total, page: page.page, perPage: page.perPage };
}
