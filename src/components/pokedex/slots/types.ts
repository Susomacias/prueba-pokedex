import type { ReactNode } from "react";

/**
 * Plan 05.3 — Tipos y props compartidos por los stubs de los slots.
 *
 * Cada slot de la Pokédex (ChipsSlot, CarouselSlot, etc.) es un
 * componente presentacional que recibe el contexto mínimo que necesita
 * para renderizarse (generalmente `pokemonName` y `mode3D`). El shell
 * (`PokedexShell.tsx`) es el único componente que conoce el estado
 * completo y construye el mapa de slots que se inyecta a la carcasa.
 *
 * Esta capa NO contiene lógica de UI real: los stubs sólo emiten
 * `data-stub` y `data-pokemon` para que los tests E2E y unitarios
 * puedan inspeccionar qué slot está activo y con qué pokemon. Las
 * implementaciones reales se completarán en los planes 06 (lista),
 * 07 (filtros), 08 (detalle) y 09 (3D).
 */

export interface SlotStubProps {
  /** Nombre del pokemon actualmente seleccionado, o `null` si no hay. */
  pokemonName?: string | null;
  /** Si la Pokédex está renderizando la vista 3D. */
  mode3D?: boolean;
}

/**
 * Helper que aplica los atributos `data-*` esperados por los tests a
 * un nodo slot. Se usa en cada stub para evitar duplicar el
 * `cloneElement` o `data-attrs` inline en cada uno.
 *
 * - `data-stub` identifica qué stub concreto está renderizando (ej:
 *   "chips", "carousel").
 * - `data-pokemon` contiene el nombre del pokemon si está definido.
 * - `data-mode` opcional para stubs cuyo comportamiento cambia entre
 *   modos (ej: stats vs abilities).
 * - `data-active` opcional para slots con estado binario (ej: botón 3D
 *   activo).
 *
 * El helper NO renderiza ningún wrapper: devuelve los atributos tal
 * cual para que cada stub los propague al nodo raíz que considere.
 */
export interface SlotDataAttrs {
  "data-stub": string;
  "data-pokemon"?: string;
  "data-mode"?: string;
  "data-active"?: string;
}

export function buildSlotAttrs(
  stub: string,
  options: {
    pokemonName?: string | null;
    mode?: string;
    active?: boolean;
  } = {},
): SlotDataAttrs {
  const attrs: SlotDataAttrs = { "data-stub": stub };
  if (options.pokemonName) attrs["data-pokemon"] = options.pokemonName;
  if (options.mode) attrs["data-mode"] = options.mode;
  if (options.active !== undefined) attrs["data-active"] = String(options.active);
  return attrs;
}

/** Tipo del nodo raíz que devuelve cada stub de slot. */
export type SlotStubElement = ReactNode;
