import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { BagIcon, SearchIcon } from "../ui/icons.tsx";

const ICON_LINK = "relative inline-flex size-12 items-center justify-center";

// Search on the left, logo in the center, bag on the right (DESIGN.md, section 5); on bag and checkout only the logo (GER-02).
// bagCount is a slot that renders the link name with the cart count, so this frame does not depend on the cart domain.
export function Header({ bagCount }: { bagCount?: ReactNode }) {
  return (
    <header className="grid grid-cols-[3rem_1fr_3rem] items-center border-b border-line bg-background px-2">
      <Link href="/buscar" data-hide-on-purchase className={ICON_LINK}>
        <SearchIcon />
        <span className="sr-only">Buscar</span>
      </Link>
      <Link href="/" className="mx-auto inline-flex min-h-12 items-center px-2">
        <Image src="/logo.svg" alt="Helena" width={120} height={22} loading="eager" />
      </Link>
      <Link href="/sacola" data-hide-on-purchase className={ICON_LINK}>
        <BagIcon />
        {bagCount ?? <span className="sr-only">Sacola</span>}
      </Link>
    </header>
  );
}
