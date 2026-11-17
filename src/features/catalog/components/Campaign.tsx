import Image from "next/image";
import Link from "next/link";
import type { HomeView } from "../views.ts";

// Featured collection or campaign at the top of the home page (VIT-01).
export function Campaign({ campaign }: { campaign: HomeView["campaign"] }) {
  return (
    <Link href={campaign.link} className="flex flex-col bg-surface md:grid md:grid-cols-2">
      <div className="relative aspect-[4/5] md:aspect-auto md:min-h-[28rem]">
        <Image
          src={campaign.imageUrl}
          alt={campaign.imageAlt}
          fill
          preload
          sizes="(min-width: 48rem) 50vw, 100vw"
          className="object-cover"
        />
      </div>
      <div className="flex flex-col justify-center gap-3 px-4 py-8 md:px-12">
        <h1 className="font-serif text-[1.75rem] font-normal leading-[1.2] text-balance md:text-[2.5rem]">
          {campaign.title}
        </h1>
        {campaign.text && <p className="text-base text-muted">{campaign.text}</p>}
        <span className="inline-flex min-h-12 items-center font-medium underline">Ver coleção</span>
      </div>
    </Link>
  );
}
