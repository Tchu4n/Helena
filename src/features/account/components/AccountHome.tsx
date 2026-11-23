import Link from "next/link";
import { Button, ChevronRightIcon } from "@/src/components/ui";

const SECTIONS = [
  { href: "/conta/pedidos", label: "Meus pedidos" },
  { href: "/conta/enderecos", label: "Meus endereços" },
  { href: "/conta/dados", label: "Dados pessoais" },
  { href: "/conta/privacidade", label: "Privacidade" },
] as const;

type Props = { email: string; signOut: () => Promise<void> };

// CTA-02, CTA-10: the account's sections (their pages come with plans 2 to 4) and "Sair".
export function AccountHome({ email, signOut }: Props) {
  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-[1.75rem] font-normal">Minha conta</h1>
        <p className="text-sm text-muted">{email}</p>
      </div>
      <nav aria-label="Seções da conta" className="bg-card">
        <ul>
          {SECTIONS.map((section) => (
            <li key={section.href} className="border-b border-line last:border-b-0">
              <Link href={section.href} className="flex min-h-14 items-center justify-between px-4">
                {section.label}
                <ChevronRightIcon className="size-5 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <form action={signOut}>
        <Button variant="secondary" type="submit" className="w-full">
          Sair
        </Button>
      </form>
    </div>
  );
}
