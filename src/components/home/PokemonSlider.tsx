/**
 * Plan 03.2 — Hueco del slider de pokemons (placeholder).
 *
 * La fase 03.3 implementará el ciclo animado con los 10 pokemons.
 * Aquí se reserva la zona derecha con tamaño fijo para que el layout
 * sea predecible aunque el contenido aún sea un placeholder.
 */
export function PokemonSlider() {
  return (
    <div
      data-testid="home-pokemon-slider"
      aria-label="Slider de pokemons"
      className="aspect-[3/4] w-full"
    />
  );
}