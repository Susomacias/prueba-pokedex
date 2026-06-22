import { buildSlotAttrs } from "./types";

/**
 * Plan 05.3 — Slot `DROPDOWNS_FILTROS` (botones cuadrados cyan para
 * los filtros: tipo, generación, hábitat, color, habilidad, altura,
 * peso).
 *
 * Siempre visible. La implementación real con la lógica de los
 * dropdowns llega en Plan 07.
 */
export function FilterDropdownsSlot() {
  return (
    <div
      {...buildSlotAttrs("filter-dropdowns")}
      aria-label="Dropdowns de filtros"
    />
  );
}
