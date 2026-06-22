import { BASE_COLORS } from "./colors";
import type { ColorSet, Generation } from "@/src/lib/types/pokemon";

/**
 * Colores por generación de Pokémon (I–IX).
 *
 * Se usan tonos distinguibles para facilitar la identificación visual.
 */
export const POKEMON_GENERATION_COLORS: Record<Generation, ColorSet> & {
  default: ColorSet;
} = {
  "generation-i": { bg: "#E0814A", border: "#B05E2D", text: "#FFFFFF" },
  "generation-ii": { bg: "#C4A747", border: "#947E2E", text: "#FFFFFF" },
  "generation-iii": { bg: "#A25BB8", border: "#773E8A", text: "#FFFFFF" },
  "generation-iv": { bg: "#5D8CC4", border: "#3F6694", text: "#FFFFFF" },
  "generation-v": { bg: "#4FAE8C", border: "#348067", text: "#FFFFFF" },
  "generation-vi": { bg: "#D36B8E", border: "#A84869", text: "#FFFFFF" },
  "generation-vii": { bg: "#E0A23C", border: "#B07C24", text: "#FFFFFF" },
  "generation-viii": { bg: "#6A8FBF", border: "#4A6B94", text: "#FFFFFF" },
  "generation-ix": { bg: "#8E5BC4", border: "#693E94", text: "#FFFFFF" },
  default: {
    bg: BASE_COLORS.cyanButton.dark,
    border: BASE_COLORS.cyanButton.light,
    text: "#FFFFFF",
  },
};
