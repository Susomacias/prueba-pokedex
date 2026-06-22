import { BASE_COLORS } from "./colors";
import type { ColorSet, PokemonType } from "@/src/lib/types/pokemon";

/**
 * Colores por tipo de Pokémon.
 *
 * `bg`/`border` usan tonos saturados para fondos y bordes;
 * `text` es un tono claro para asegurar contraste sobre el fondo.
 */
export const POKEMON_TYPE_COLORS: Record<PokemonType, ColorSet> & {
  default: ColorSet;
} = {
  normal: { bg: "#9099A1", border: "#61646A", text: "#FFFFFF" },
  fighting: { bg: "#CE4069", border: "#9B2547", text: "#FFFFFF" },
  flying: { bg: "#8FA8DD", border: "#5B73B0", text: "#FFFFFF" },
  poison: { bg: "#AB6AC8", border: "#7A4A91", text: "#FFFFFF" },
  ground: { bg: "#D97746", border: "#A24F2A", text: "#FFFFFF" },
  rock: { bg: "#C7B78B", border: "#94864F", text: "#1A1A1A" },
  bug: { bg: "#91C12F", border: "#6A901F", text: "#FFFFFF" },
  ghost: { bg: "#5269AC", border: "#36457A", text: "#FFFFFF" },
  steel: { bg: "#5A8EA1", border: "#3D6675", text: "#FFFFFF" },
  fire: { bg: "#FF9D55", border: "#E0732A", text: "#FFFFFF" },
  water: { bg: "#3393DD", border: "#1F6FB0", text: "#FFFFFF" },
  grass: { bg: "#63BC5A", border: "#3F9438", text: "#FFFFFF" },
  electric: { bg: "#F0D531", border: "#C7A91C", text: "#1A1A1A" },
  psychic: { bg: "#FA7179", border: "#D63E47", text: "#FFFFFF" },
  ice: { bg: "#74CEF6", border: "#43A8D6", text: "#1A1A1A" },
  dragon: { bg: "#0B6DC3", border: "#074B86", text: "#FFFFFF" },
  dark: { bg: "#5A5366", border: "#3A3543", text: "#FFFFFF" },
  fairy: { bg: "#EC8FE6", border: "#C761C0", text: "#FFFFFF" },
  default: {
    bg: BASE_COLORS.cyanButton.dark,
    border: BASE_COLORS.cyanButton.light,
    text: "#FFFFFF",
  },
};
