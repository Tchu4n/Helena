import Image from "next/image";

// Página provisória, até a vitrine existir. Usa só os tokens do docs/DESIGN.md.
export default function PaginaInicial() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <Image src="/logo.svg" alt="Helena" width={160} height={29} priority />
      <p className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.08em] text-suave">
        Em breve
      </p>
      <h1 className="font-serif text-[1.75rem] font-normal leading-[1.2] text-balance md:text-[2.5rem]">
        A loja está sendo preparada
      </h1>
      <p className="max-w-[40ch] text-base leading-normal text-pretty text-suave">
        Moda para vestir todo dia, com entrega rápida e troca em 7 dias.
      </p>
    </main>
  );
}
