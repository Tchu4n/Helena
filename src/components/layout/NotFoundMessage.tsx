import Link from "next/link";

// Shared by the root not-found (wrapped in <main>) and the product one (already inside the group's <main>).
export function NotFoundMessage() {
  return (
    <div className="flex flex-1 flex-col items-center gap-4 px-6 py-16 text-center">
      <h1 className="font-serif text-[1.75rem] font-normal">Não encontramos esta página</h1>
      <p className="text-muted">O endereço pode estar errado ou o produto saiu da loja.</p>
      <Link href="/catalogo" className="inline-flex min-h-12 items-center rounded-control bg-primary px-6 font-medium text-background">
        Ver o catálogo
      </Link>
    </div>
  );
}
