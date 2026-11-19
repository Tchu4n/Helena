import { NotFoundMessage } from "@/src/components/layout";

// Unmatched URLs render here with the root layout only, which has no <main> of its own.
export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col">
      <NotFoundMessage />
    </main>
  );
}
