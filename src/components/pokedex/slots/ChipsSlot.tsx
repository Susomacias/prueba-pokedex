import { buildSlotAttrs, type SlotStubProps } from "./types";

/**
 * Plan 05.3 — Slot `TIPO1_TIPO2_GENERACION` (chips de tipo1, tipo2 y
 * generación).
 *
 * Stub: si no hay `pokemonName`, devuelve `null` para que el
 * `<foreignObject>` no se monte (el `<g data-slot>` permanece en el
 * DOM gracias a `SlotLayer`). Con pokemon emite el nodo con
 * `data-stub="chips"` y `data-pokemon`.
 *
 * La implementación real (chips clickables que abren el dropdown del
 * filtro correspondiente, planes 07 y 08) vivirá aquí en fases
 * posteriores.
 */
export function ChipsSlot({ pokemonName }: SlotStubProps) {
  if (!pokemonName) return null;
  return (
    <div
      {...buildSlotAttrs("chips", { pokemonName })}
      role="group"
      aria-label="Tipos y generación del pokemon"
    />
  );
}
