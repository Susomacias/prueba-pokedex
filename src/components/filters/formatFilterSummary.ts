import type { FilterSummaryEntry } from "@/src/lib/filters/types";

/**
 * Formatea las entradas del resumen de filtros para mostrarlas en la
 * consola. Usa `' · '` como separador y omite entradas sin `display`.
 *
 * @example
 *   formatFilterSummary([
 *     { key: "type1", label: "Tipo 1", display: "Fuego" },
 *     { key: "habitat", label: "Hábitat", display: "Pradera" },
 *   ])
 *   // → "Tipo 1: Fuego · Hábitat: Pradera"
 */
export function formatFilterSummary(entries: ReadonlyArray<FilterSummaryEntry>): string {
  return entries
    .filter((entry) => entry.display.length > 0)
    .map((entry) => `${entry.label}: ${entry.display}`)
    .join(" · ");
}