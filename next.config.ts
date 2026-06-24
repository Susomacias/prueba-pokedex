import type { NextConfig } from "next";

/**
 * Las rutas reales viven en `src/app/`:
 *
 *   `/`                → pantalla de inicio
 *   `/pokedex`         → Pokédex (lista + filtros)
 *   `/pokemon/[name]`  → ficha de un pokemon
 *
 * No hay redirect de `/pokedex` a `/`: cuando el usuario aterriza
 * directamente en `/pokedex` (link compartido, refresh, marcador),
 * la página ejecuta la transición de entrada desde la home antes de
 * mostrar la Pokédex. Ver `src/app/pokedex/page.tsx` y `src/app/pokemon/[name]/page.tsx`.
 *
 * Los filtros viven como `searchParams` en `/pokedex` y
 * `/pokemon/[name]` y se sincronizan bidireccionalmente vía
 * `useFilters()` (Plan 02.2).
 */
const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;