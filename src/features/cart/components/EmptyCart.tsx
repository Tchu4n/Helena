import { Button } from "@/src/components/ui/Button.tsx";
import { BagIcon } from "@/src/components/ui/icons.tsx";

// SAC-03: no checkout button here.
export function EmptyCart() {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
      <BagIcon className="size-10" />
      <h1 className="font-serif text-2xl font-normal">Sua sacola está vazia</h1>
      <p className="text-muted">As peças que você escolher aparecem aqui.</p>
      <Button variant="primary" href="/catalogo">
        Ver novidades
      </Button>
    </div>
  );
}
