import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Header } from "@/src/components/layout";
import { HomeAnnouncement } from "@/src/features/catalog";
import { Suspense } from "react";
import { ConsentBanner } from "@/src/features/privacy";
import { CartCount } from "@/src/features/cart";

// Font roles: docs/DESIGN.md, section 3.
const bodyFont = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const labelFont = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const headingFont = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  fallback: ["Georgia", "serif"],
});

export const metadata: Metadata = {
  title: "Helena",
  description: "Moda para o dia a dia. Loja em construção.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${bodyFont.variable} ${labelFont.variable} ${headingFont.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Suspense fallback={null}>
          <HomeAnnouncement />
        </Suspense>
        <Header
          bagCount={
            <Suspense fallback={<span className="sr-only">Sacola</span>}>
              <CartCount label="Sacola" />
            </Suspense>
          }
        />
        {children}
        <Suspense fallback={null}>
          <ConsentBanner />
        </Suspense>
      </body>
    </html>
  );
}
