import { HomeShell } from "@/src/components/home/HomeShell";
import { HomeViewContent } from "@/src/components/home/HomeViewContent";
import { buildSearchString } from "@/src/lib/utils/search-params";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/**
 * Pantalla de inicio (SPA basada en rutas).
 *
 * URL: `/`.
 *
 * Estructura:
 *
 *   <HomeShell>          ← monta AppShell (providers + estado
 *                            derivado de la URL vía usePathname) y
 *                            registra listeners
 *     <HomeViewContent/> ← logo + ash + slider + pokedex cerrada +
 *                            botones (Server Component reutilizable)
 *   </HomeShell>
 *
 * La Pokédex NO se desmonta al volver a la home: queda en el DOM con
 * su estado preservado. La Pokédex se pre-renderiza dentro de
 * `AppShell` independientemente del pathname.
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const initialSearch = await buildSearchString(searchParams);
  return (
    <HomeShell initialPathname="/" initialSearch={initialSearch}>
      <HomeViewContent />
    </HomeShell>
  );
}