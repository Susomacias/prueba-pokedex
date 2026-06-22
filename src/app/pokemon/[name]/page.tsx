import type { Metadata } from "next";
import { capitalize } from "@/src/lib/utils/capitalize";

type RouteParams = { name: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { name } = await params;
  const friendly = capitalize(name);

  return {
    title: friendly,
    description: `Ficha de ${friendly}: tipos, estadísticas, evoluciones y más.`,
    alternates: { canonical: `/pokemon/${name}` },
  };
}

export function generateStaticParams(): Array<RouteParams> {
  return [];
}

export default async function PokemonDetailPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { name } = await params;

  return (
    <main className="flex flex-1 items-center justify-center">
      <p>{capitalize(name)} — ficha (próxima fase)</p>
    </main>
  );
}
