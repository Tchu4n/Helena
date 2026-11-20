import { Footer } from "@/src/components/layout";

// Buying screens: no bottom tabs; the screen's main button is fixed at the bottom instead (GER-02).
export default function BuyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col pb-[calc(var(--bottom-bar)+1rem)] md:pb-0">
      <main className="flex flex-1 flex-col">{children}</main>
      <Footer />
    </div>
  );
}
