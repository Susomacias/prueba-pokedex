/**
 * Paleta base del proyecto.
 *
 * Cualquier nuevo color compartido debe añadirse aquí, no en componentes.
 */
export const BASE_COLORS = {
  garnet: {
    dark: "#910D03",
    light: "#FF6363",
  },
  yellowOrange: {
    dark: "#FF9203",
    light: "#FFE590",
  },
  green: {
    dark: "#008C15",
    light: "#75D984",
  },
  cyanButton: {
    dark: "#126CA3",
    light: "#46A2DA",
  },
  bodyGradient: {
    from: "#234476",
    to: "#0c1c3e",
  },
} as const;

export type BaseColors = typeof BASE_COLORS;

/** Etiquetas en español para los colores de Pokémon (filtro "color"). */
export const POKEMON_COLOR_LABELS: Record<string, string> = {
  black: "Negro",
  blue: "Azul",
  brown: "Marrón",
  gray: "Gris",
  green: "Verde",
  pink: "Rosa",
  purple: "Púrpura",
  red: "Rojo",
  white: "Blanco",
  yellow: "Amarillo",
};
