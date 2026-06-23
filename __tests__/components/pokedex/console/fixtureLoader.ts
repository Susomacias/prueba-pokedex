import { resolve } from "node:path";

/**
 * Resuelve una ruta relativa al directorio de fixtures de PokeAPI
 * (`__tests__/fixtures/pokeapi/`). Centraliza la resolución para que
 * los tests puedan hacer `resolvePath("filter-options/types.json")`.
 */
export function resolvePath(relPath: string): string {
  return resolve(__dirname, "..", "..", "..", "fixtures", "pokeapi", relPath);
}
