import Link from "next/link";
import type { ReactNode } from "react";
import { BagIcon, HomeIcon, SearchIcon, UserIcon } from "../ui/icons.tsx";

const TABS = [
  { href: "/", label: "Início", Icon: HomeIcon },
  { href: "/buscar", label: "Buscar", Icon: SearchIcon },
  { href: "/sacola", label: "Sacola", Icon: BagIcon },
  { href: "/conta", label: "Conta", Icon: UserIcon },
];

// GER-01: fixed at the bottom on phones only, with the piece count on "Sacola" (passed in by the layout).
export function TabBar({ bagCount }: { bagCount?: ReactNode }) {
  return (
    <nav
      aria-label="Abas"
      className="fixed inset-x-0 bottom-0 z-10 h-16 border-t border-line bg-background md:hidden"
    >
      <ul className="grid h-full grid-cols-4">
        {TABS.map(({ href, label, Icon }) => (
          <li key={href} className="flex">
            <Link
              href={href}
              className="relative flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 font-mono text-[0.625rem] font-medium uppercase tracking-[0.08em]"
            >
              <Icon className="size-5" />
              {href === "/sacola" && bagCount ? bagCount : label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
