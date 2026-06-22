/**
 * Estrategia de caché de la capa de datos contra la PokeAPI
 * (Plan 01.6).
 *
 * Define los tiempos de revalidación y los tags asociados a cada
 * tipo de fetch:
 *  - Lista sin filtros → 1h
 *  - Detalle de pokemon → 24h con tag `pokemon:<name>`
 *  - Opciones de filtros → 1 semana (datos esencialmente estáticos)
 *
 * El cliente `request` soporta la opción `next: { revalidate, tags }`,
 * el modelo de caché por defecto de Next.js 16 cuando NO se usa
 * `cacheComponents`. Para migrar a `cacheComponents: true` en el
 * futuro, basta sustituir estas constantes por directivas `'use
 * cache'` con `cacheLife(...)`.
 *
 * @see node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md
 * @see node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md
 */

/** Revalidación en segundos para la lista sin filtros. */
export const POKEMON_LIST_CACHE_SECONDS = 60 * 60; // 1 hora

/** Revalidación en segundos para el detalle de un pokemon. */
export const POKEMON_DETAIL_CACHE_SECONDS = 60 * 60 * 24; // 24 horas

/**
 * Revalidación en segundos para los valores de los filtros (tipos,
 * generaciones, hábitats, …). Son datos que apenas cambian.
 */
export const FILTER_OPTIONS_CACHE_SECONDS = 60 * 60 * 24 * 7; // 7 días

/** Tag raíz para todas las queries de la capa de datos. */
export const POKEMON_DATA_TAG = "pokemon-data";

/** Tag específico para el detalle de un pokemon concreto. */
export function pokemonDetailTag(name: string): string {
  return `pokemon:${name}`;
}

/** Tag para las opciones de filtros. */
export const FILTER_OPTIONS_TAG = "filter-options";

/**
 * `next` option para la lista paginada sin filtros. Cachea en server
 * por 1 hora; no se etiqueta porque las invalidaciones granulares
 * por pokemon se hacen vía `pokemonDetailTag`.
 */
export const LIST_CACHE: { revalidate: number; tags: string[] } = {
  revalidate: POKEMON_LIST_CACHE_SECONDS,
  tags: [POKEMON_DATA_TAG],
};

/**
 * `next` option para el detalle de un pokemon. Cachea por 24h y se
 * etiqueta con el nombre para permitir invalidación bajo demanda
 * (ej. tras un webhook de PokeAPI que refresca un pokemon).
 */
export function detailCache(name: string): {
  revalidate: number;
  tags: string[];
} {
  return {
    revalidate: POKEMON_DETAIL_CACHE_SECONDS,
    tags: [POKEMON_DATA_TAG, pokemonDetailTag(name)],
  };
}

/** `next` option para opciones de filtros (1 semana). */
export const FILTER_CACHE: { revalidate: number; tags: string[] } = {
  revalidate: FILTER_OPTIONS_CACHE_SECONDS,
  tags: [POKEMON_DATA_TAG, FILTER_OPTIONS_TAG],
};

/**
 * Límite de precargas concurrentes para no saturar la PokeAPI. El
 * plan fija este tope en 3.
 */
export const MAX_CONCURRENT_PREFETCHES = 3;