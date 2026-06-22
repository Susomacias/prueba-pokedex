import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const pressStart2P = localFont({
  src: "../public/PressStart2P-Regular.ttf",
  variable: "--font-press-start-2p",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pokédex",
  description: "Explora el mundo de los Pokémon: tipos, generaciones, hábitats y más.",
  icons: {
    icon: "/favicon.png",
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
