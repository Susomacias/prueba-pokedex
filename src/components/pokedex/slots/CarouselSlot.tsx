"use client";

import { buildSlotAttrs, type SlotStubProps } from "./types";
import { PokemonList } from "../list/PokemonList";
import { PokemonCarousel } from "../carousel/PokemonCarousel";

/**
 * Plan 05.3 + 06.1 + 06.3 — Slot `CARRUSEL_IMAGENES_DESCRIPCION`.
 *
 * Modos:
 *  - Sin `pokemonName`: muestra la `PokemonList` (lista virtualizada
 *    con ventana deslizante, Plan 06.1) con scroll interno dentro
 *    del slot.
 *  - Con `pokemonName`: muestra el `PokemonCarousel` (Plan 06.3),
 *    que consume el estado del `CarouselController` (proveedor
 *    montado en `PokedexShell`). El carrusel gestiona su propio
 *    detalle y el auto-avance; los slots `PUNTOS_CARRUSEL` y
 *    `BOTONES_CARRUSEL` consumen el mismo controller.
 *  - Con `mode3D=true`: además marca `data-mode="3d"` para que el
 *    componente del Plan 09 pueda tomar el control visual sin
 *    sustituir la capa.
 *
 * Importante: el slot NO conoce el estado de selección. El caller
 * (`PokedexShell`) le pasa `pokemonName` derivado de la URL; cuando
 * llega `/pokemon/[name]`, el shell propaga el nombre y este slot
 * pasa al modo carrusel.
 */
export function CarouselSlot({ pokemonName, mode3D }: SlotStubProps) {
  if (pokemonName) {
    return (
      <div
        {...buildSlotAttrs("carousel", {
          pokemonName,
          mode: mode3D ? "3d" : undefined,
        })}
        role="region"
        aria-label="Carrusel de imágenes y descripción"
        className="pokedex-carousel-slot"
      >
        <PokemonCarousel />
      </div>
    );
  }
  return (
    <div
      {...buildSlotAttrs("list", { mode: mode3D ? "3d" : undefined })}
      role="region"
      aria-label="Lista de Pokémon"
      className="pokedex-carousel-slot"
    >
      <PokemonList />
    </div>
  );
}