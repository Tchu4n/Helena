import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";

// Papéis das fontes: docs/DESIGN.md, seção 3.
const fonteCorpo = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const fonteRotulo = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fonteTitulo = Playfair_Display({
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
      className={`${fonteCorpo.variable} ${fonteRotulo.variable} ${fonteTitulo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
