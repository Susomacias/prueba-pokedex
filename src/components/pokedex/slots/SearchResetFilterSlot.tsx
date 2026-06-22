import { buildSlotAttrs } from "./types";

/**
 * Plan 05.3 — Slot `BUSCAR_RESET_FILTRAR` (buscador + botones reset y
 * filtrar).
 *
 * Siempre visible. La lógica del buscador (sync con `useFilters`)
 * llega en Plan 07.
 */
export function SearchResetFilterSlot() {
  return (
    <div
      {...buildSlotAttrs("search-reset-filter")}
      aria-label="Buscar, resetear y filtrar"
    />
  );
}
