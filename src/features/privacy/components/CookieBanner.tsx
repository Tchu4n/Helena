import Link from "next/link";
import { Button } from "@/src/components/ui";
import { saveConsent } from "../actions/saveConsent.ts";

// GER-03: "Rejeitar" and "Aceitar" have the same size and color; nothing is pre-selected.
// A plain form, so it works before (or without) JavaScript.
export function CookieBanner() {
  return (
    <section
      aria-label="Aviso de cookies"
      className="fixed inset-x-0 bottom-16 z-20 border-t border-line bg-card px-4 py-4 md:bottom-0"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 md:flex-row md:items-center">
        <p className="text-sm md:flex-1">
          Usamos cookies necessários para a loja funcionar e, com a sua permissão, cookies opcionais.
        </p>
        <form action={saveConsent} className="grid grid-cols-2 gap-2 md:w-72">
          <Button variant="secondary" type="submit" name="choice" value="reject">
            Rejeitar
          </Button>
          <Button variant="secondary" type="submit" name="choice" value="accept">
            Aceitar
          </Button>
        </form>
        <Link href="/cookies" className="inline-flex min-h-12 items-center text-sm underline">
          Gerenciar preferências
        </Link>
      </div>
    </section>
  );
}
