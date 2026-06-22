import { Suspense, type ReactNode } from "react";
import { FiltersProvider } from "@/src/components/filters/FiltersProvider";

/**
 * Layout de la sección `/pokedex`.
 *
 * Plan 02.3: monta `FiltersProvider` aquí, no en el root layout, para
 * que sólo las rutas de Pokédex (la página de lista) tengan acceso al
 * estado de filtros. Las fichas (`/pokemon/[name]`) leen los filtros
 * directamente de los searchParams si los necesitan (compartidos vía
 * URL) sin entrar en el provider.
 *
 * `<Suspense>` es obligatorio: `FiltersProvider` consume
 * `useSearchParams()` (vía `useFilters` → `useNavigation`), y Next.js
 * 16 exige una frontera Suspense para prerenderizar correctamente
 * el segmento estático. Ver `use-search-params.md` en la docs.
 */
export default function PokedexLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <Suspense fallback={null}>
      <FiltersProvider>{children}</FiltersProvider>
    </Suspense>
  );
}