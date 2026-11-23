import Link from "next/link";

// GER-05: cookie choices can be changed at any time, without signing in. PED-05: order lookup without an account.
export function Footer() {
  return (
    <footer className="mt-auto flex flex-wrap gap-x-6 gap-y-2 border-t border-line bg-surface px-4 py-6 text-sm text-muted">
      <Link href="/cookies" className="inline-flex min-h-12 min-w-12 items-center underline">
        Preferências de cookies
      </Link>
      <Link href="/pedido" className="inline-flex min-h-12 min-w-12 items-center underline">
        Acompanhar pedido
      </Link>
    </footer>
  );
}
