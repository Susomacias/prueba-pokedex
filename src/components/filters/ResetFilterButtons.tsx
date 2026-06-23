"use client";

import { useCallback } from "react";
import { useFiltersContext } from "@/src/components/filters/FiltersProvider";
import { useAppShell } from "@/src/components/app/ViewContext";
import "./filter-controls.css";

/**
 * `ResetFilterButtons` — botones Reset y Filtrar (Plan 07.4).
 *
 * - Reset (negro, estilo start de consola): quita todos los filtros
 *   vía `clearAll()` y restaura la lista inicial.
 * - Filtrar (naranja arcade, triángulo derecha): si hay pokemon
 *   seleccionado, cierra la ficha y vuelve a la lista filtrada
 *   manteniendo los filtros activos.
 */
export function ResetFilterButtons() {
  const { clearAll, activeCount } = useFiltersContext();
  const { goToPokedex } = useAppShell();

  const onReset = useCallback(() => {
    if (activeCount > 0) {
      clearAll();
    }
  }, [activeCount, clearAll]);

  const onFilter = useCallback(() => {
    goToPokedex();
  }, [goToPokedex]);

  return (
    <div className="reset-filter-row">
      <button
        type="button"
        className="reset-btn"
        aria-label="Resetear filtros"
        onClick={onReset}
      >
        Reset
      </button>
      <button
        type="button"
        className="filter-btn"
        aria-label="Filtrar / Volver a lista"
        onClick={onFilter}
      >
        <span className="filter-btn__arrow" aria-hidden="true" />
        Filtrar
      </button>
    </div>
  );
}
