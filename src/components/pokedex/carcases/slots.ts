import type { ReactNode } from "react";

/**
 * Plan 05.1 / 05.2 — Tipos compartidos de los slots de la carcasa.
 *
 * Cada `SlotName` corresponde a una capa invisible del SVG original
 * (`public/pokedex_vertical.svg` y `public/pokedex_horizontal.svg`).
 * El identificador `CARCASA` representa el chasis de la Pokédex y no
 * acepta contenido inyectable: el componente carcasa siempre lo
 * renderiza por sí mismo.
 *
 * Los IDs en los SVG vienen codificados como `_x5F_` (codificación XML
 * de `_`); al traducirlos a TSX se usa la forma legible con guiones
 * bajos.
 */
export type SlotName =
  | "CARCASA"
  | "BOTON_3D"
  | "TIPO1_TIPO2_GENERACION"
  | "PUNTOS_CARRUSEL"
  | "CARRUSEL_IMAGENES_DESCRIPCION"
  | "BOTONES_CARRUSEL"
  | "SONIDO_POKEMON"
  | "EVOLUCIONES"
  | "STATS"
  | "VER_HABILIDADES_VER_STATS"
  | "CONSOLA_FILTROS"
  | "DROPDOWNS_FILTROS"
  | "BUSCAR_RESET_FILTRAR";

/** Lista canónica de slots para iterar (orden estable, CARCASA incluida). */
export const SLOT_NAMES: readonly SlotName[] = [
  "CARCASA",
  "BOTON_3D",
  "TIPO1_TIPO2_GENERACION",
  "PUNTOS_CARRUSEL",
  "CARRUSEL_IMAGENES_DESCRIPCION",
  "BOTONES_CARRUSEL",
  "SONIDO_POKEMON",
  "EVOLUCIONES",
  "STATS",
  "VER_HABILIDADES_VER_STATS",
  "CONSOLA_FILTROS",
  "DROPDOWNS_FILTROS",
  "BUSCAR_RESET_FILTRAR",
] as const;

/** Mapa de slots: cada entrada puede contener un `ReactNode` o estar vacía.
 *
 * El tipo es mutable para que los consumidores puedan partir de
 * `createEmptySlots()` y rellenar sólo las capas que necesitan (típico
 * en tests y en los componentes slot del Plan 05.3). Las carcases
 * NO mutan el mapa; sólo lo leen.
 */
export type SlotMap = Record<SlotName, ReactNode>;

/**
 * Devuelve un mapa de slots con todas las entradas a `null`. Útil como
 * valor por defecto para evitar repetir el shape completo en cada
 * llamada a las carcases durante tests y en consumidores que no
 * necesitan proporcionar contenido para todas las capas.
 */
export function createEmptySlots(): SlotMap {
  return {
    CARCASA: null,
    BOTON_3D: null,
    TIPO1_TIPO2_GENERACION: null,
    PUNTOS_CARRUSEL: null,
    CARRUSEL_IMAGENES_DESCRIPCION: null,
    BOTONES_CARRUSEL: null,
    SONIDO_POKEMON: null,
    EVOLUCIONES: null,
    STATS: null,
    VER_HABILIDADES_VER_STATS: null,
    CONSOLA_FILTROS: null,
    DROPDOWNS_FILTROS: null,
    BUSCAR_RESET_FILTRAR: null,
  };
}

/** Helper para saber si un slot tiene contenido renderizable. */
export function hasSlotContent(node: ReactNode): boolean {
  return node !== null && node !== undefined && node !== false;
}