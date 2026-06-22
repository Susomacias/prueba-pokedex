import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const pressStart2P = localFont({
  src: "../../public/PressStart2P-Regular.ttf",
  variable: "--font-press-start-2p",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Pokédex",
    template: "%s | Pokédex",
  },
  description: "Explora el mundo de los Pokémon: tipos, generaciones, hábitats y más.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  applicationName: "Pokédex",
  authors: [{ name: "Pokédex" }],
  keywords: [
    "Pokédex",
    "Pokémon",
    "tipos",
    "generaciones",
    "hábitats",
    "altura",
    "peso",
  ],
  icons: {
    icon: "/favicon.png",
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    siteName: "Pokédex",
    title: "Pokédex",
    description: "Explora el mundo de los Pokémon: tipos, generaciones, hábitats y más.",
    url: "/",
  },
  twitter: {
    card: "summary",
    title: "Pokédex",
    description: "Explora el mundo de los Pokémon: tipos, generaciones, hábitats y más.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${pressStart2P.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
