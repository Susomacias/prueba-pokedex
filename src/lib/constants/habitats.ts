import type { Habitat } from "@/src/lib/types/pokemon";

/**
 * Mapa de hábitat → imagen `.webp` servida desde `/public/habitats`.
 *
 * Las claves son los identificadores internos en español definidos en
 * `HABITATS`. Los archivos correspondientes deben existir en disco.
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
