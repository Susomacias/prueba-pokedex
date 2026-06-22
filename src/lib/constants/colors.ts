/**
 * Paleta base del proyecto.
 *
 * Cualquier nuevo color compartido debe añadirse aquí, no en componentes.
 *
 * Referencia visual (borrador del plan 00):
 * - Granate: `#910D03` / `#FF6363`
 * - Amarillo-anaranjado: `#FF9203` / `#FFE590`
 * - Verde: `#008C15` / `#75D984`
 * - Cyan oscuro (botones): `#126CA3` / `#46A2DA`
 * - Degradado body: `#234476 → #0c1c3e`
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
