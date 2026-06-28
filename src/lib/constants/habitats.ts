import type { Habitat } from "@/src/lib/types/pokemon";

/**
 * Mapa de hábitat → imagen `.webp` servida desde `/public/habitats`.
 */
export const HABITAT_IMAGES: Record<Habitat, string> = {
  caverna: "/habitats/caverna.webp",
  bosque: "/habitats/bosque.webp",
  pradera: "/habitats/pradera.webp",
  campo: "/habitats/campo.webp",
  montana: "/habitats/montana.webp",
  agua_dulce: "/habitats/agua_dulce.webp",
  agua_salada: "/habitats/agua_salada.webp",
  ciudad: "/habitats/ciudad.webp",
  raro: "/habitats/raro.webp",
  generico: "/habitats/generico.webp",
};

/**
 * Mapeo de nombres de hábitat en inglés (PokeAPI) → clave interna en
 * español. Fuente canónica para toda la capa de datos.
 *
 * @see doc/pokeapi/data/v2/csv/pokemon_habitats.csv
 */
export const HABITAT_ALIAS: Record<string, Habitat> = {
  cave: "caverna",
  forest: "bosque",
  grassland: "pradera",
  mountain: "montana",
  "rough-terrain": "montana",
  field: "campo",
  freshwater: "agua_dulce",
  "waters-edge": "agua_dulce",
  sea: "agua_salada",
  urban: "ciudad",
  rare: "raro",
};

/** Etiquetas de hábitat capitalizadas para dropdowns de filtros. */
export const HABITAT_LABELS: Record<Habitat, string> = {
  caverna: "Caverna",
  bosque: "Bosque",
  pradera: "Pradera",
  campo: "Campo",
  montana: "Montaña",
  agua_dulce: "Agua dulce",
  agua_salada: "Agua salada",
  ciudad: "Ciudad",
  raro: "Raro",
  generico: "Genérico",
};

/** Etiquetas de hábitat en minúsculas para chips de lista. */
export const HABITAT_LABELS_LOWERCASE: Record<Habitat, string> = {
  caverna: "caverna",
  bosque: "bosque",
  pradera: "pradera",
  campo: "campo",
  montana: "montaña",
  agua_dulce: "agua dulce",
  agua_salada: "agua salada",
  ciudad: "ciudad",
  raro: "raro",
  generico: "genérico",
};

/** Convierte un nombre inglés de hábitat a su clave interna, con fallback a `generico`. */
export function asHabitat(name: string | null | undefined): Habitat | null {
  if (!name) return null;
  return HABITAT_ALIAS[name] ?? "generico";
}

/**
 * Mapeo inverso: clave interna en español → identificador inglés de
 * la PokeAPI para construir cláusulas `where`.
 */
export const HABITAT_REVERSE_ALIAS: Record<Habitat, string> = {
  caverna: "cave",
  bosque: "forest",
  pradera: "grassland",
  campo: "field",
  montana: "mountain",
  agua_dulce: "freshwater",
  agua_salada: "sea",
  ciudad: "urban",
  raro: "rare",
  generico: "rare",
};
