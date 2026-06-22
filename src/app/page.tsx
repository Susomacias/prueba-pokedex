import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center">
      <div className="text-center">
        <p>Pokédex</p>
        <Link href="/pokedex">Entrar a la Pokédex</Link>
      </div>
    </main>
  );
}
