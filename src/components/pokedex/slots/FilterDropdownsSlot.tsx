"use client";

import { FilterDropdowns } from "@/src/components/filters/FilterDropdowns";
import { buildSlotAttrs } from "./types";

/**
 * Plan 05.3 + 07.2 — Slot `DROPDOWNS_FILTROS` (botones cuadrados cyan
 * para los filtros: tipo, generación, hábitat, color, habilidad,
 * altura, peso).
 *
 * Siempre visible. Delega en `FilterDropdowns` (Plan 07.2) que consume
 * `useFiltersContext`.
 */
export function FilterDropdownsSlot() {
  return (
    <div
      {...buildSlotAttrs("filter-dropdowns")}
      aria-label="Dropdowns de filtros"
    >
      <FilterDropdowns />
    </div>
  );
}
