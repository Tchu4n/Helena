// Only the fields the screens use go to components; the full API response never does.
import type { components } from "../../lib/api-types.ts";
import { installmentText } from "../../lib/format.ts";

type ProductSummary = components["schemas"]["ProductSummary"];
type Home = components["schemas"]["Home"];
type ProductPage = components["schemas"]["ProductPage"];
type Product = components["schemas"]["Product"];

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

export type SizeOption = { id: string; label: string; available: boolean; lowStock: boolean };

export type ProductView = {
  id: string;
  slug: string;
  name: string;
  price: number;
  originalPrice: number | null;
  discountBadge: string | null;
  installmentText: string | null;
  color: { name: string; hex: string };
  otherColors: { slug: string; name: string; hex: string }[];
  photos: { url: string; alt: string }[];
  sizes: SizeOption[];
  soldOut: boolean;
  fabric: string;
  collection: string;
  description: string;
  sizeGuide: { columns: string[]; rows: string[][] } | null;
};

export function toProductView(p: Product): ProductView {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: p.price,
    originalPrice: p.originalPrice ?? null,
    discountBadge: p.discountBadge ?? null,
    installmentText: installmentText(p.installmentPlan),
    color: { name: p.color.name, hex: p.color.hex },
    otherColors: p.otherColors.map((c) => ({ slug: c.slug, name: c.name, hex: c.hex })),
    photos: p.photos.map((ph) => ({ url: ph.url, alt: ph.altText })),
    sizes: p.sizes.map((s) => ({ id: s.id, label: s.label, available: s.available, lowStock: s.lowStock })),
    soldOut: p.soldOut,
    fabric: p.fabric,
    collection: p.collection,
    description: p.description,
    sizeGuide: p.sizeGuide ? { columns: p.sizeGuide.columns, rows: p.sizeGuide.rows } : null,
  };
}
