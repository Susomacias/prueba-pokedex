import { buildSlotAttrs } from "./types";

/**
 * Plan 05.3 — Slot `CONSOLA_FILTROS` (consola tipo terminal que
 * muestra el resumen de filtros activos).
 *
 * Siempre visible (no depende de si hay pokemon seleccionado). El
 * stub marca `data-stub="filter-console"` y `data-active` para que
 * los tests E2E del Plan 07 puedan verificar el formato del resumen.
 */
export function FilterConsoleSlot({
  active,
}: {
  active: boolean;
}) {
  return (
    <div
      {...buildSlotAttrs("filter-console", { active })}
      role="status"
      aria-live="polite"
      aria-label="Resumen de filtros activos"
    />
  );
}
