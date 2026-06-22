/**
 * Convierte la primera letra de una cadena a mayúsculas y el resto a minúsculas.
 *
 * Ejemplo: `"bulbasaur"` → `"Bulbasaur"`.
 */
export function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}
