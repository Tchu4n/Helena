import { Suspense } from "react";
import { Footer, TabBar } from "@/src/components/layout";
import { CartCount } from "@/src/features/cart";

// Browsing screens keep the bottom tabs (GER-01). The footer sits inside the padding so the tabs never cover it.
export default function BrowseLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col pb-16 md:pb-0">
      <main className="flex flex-1 flex-col">{children}</main>
      <Footer />
      <TabBar
        bagCount={
          <Suspense fallback="Sacola">
            <CartCount label="Sacola" visibleLabel />
          </Suspense>
        }
      />
    </div>
  );
}
