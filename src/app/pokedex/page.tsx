import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pokédex",
  description:
    "Explora la Pokédex completa: busca por nombre, tipo, generación, hábitat, habilidad, color, altura o peso.",
  alternates: { canonical: "/pokedex" },
};

export default function PokedexPage() {
  return (
    <main className="flex flex-1 items-center justify-center">
      <p>Pokédex — próxima fase</p>
    </main>
  );
}
