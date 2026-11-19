import type { Metadata } from "next";
import Form from "next/form";
import { Button, Field } from "@/src/components/ui";

export const metadata: Metadata = { title: "Buscar — Helena" };

// CAT-07: the search goes to the catalog, with the same grid and filters.
export default function SearchPage() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-8">
      <h1 className="font-serif text-[1.75rem] font-normal leading-[1.2] md:text-[2.5rem]">Buscar</h1>
      <Form action="/catalogo" role="search" className="flex flex-col gap-4">
        <Field label="O que você procura?" name="busca" type="search" maxLength={80} />
        <Button variant="primary" type="submit">
          Buscar
        </Button>
      </Form>
    </div>
  );
}
