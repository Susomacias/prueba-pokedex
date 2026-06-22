import { buildSlotAttrs, type SlotStubProps } from "./types";

/**
 * Plan 05.3 — Slot `CARRUSEL_IMAGENES_DESCRIPCION` (lista/carrusel
 * de imágenes + descripción del pokemon).
 *
 * Stub: sin pokemon devuelve `null` (el `<g data-slot>` queda vacío).
 * Con pokemon emite `data-stub="carousel"`; en modo 3D además marca
 * `data-mode="3d"` para que el componente del Plan 09 pueda tomar el
 * control visual sin sustituir la capa.
 */
export function CarouselSlot({ pokemonName, mode3D }: SlotStubProps) {
  if (!pokemonName) return null;
  return (
    <div
      {...buildSlotAttrs("carousel", {
        pokemonName,
        mode: mode3D ? "3d" : undefined,
      })}
      role="region"
      aria-label="Carrusel de imágenes y descripción"
    />
  );
}
