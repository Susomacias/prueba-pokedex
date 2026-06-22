import { buildSlotAttrs, type SlotStubProps } from "./types";

/**
 * Plan 05.3 — Slot `BOTON_3D` (ojo azul que abre la vista 3D del
 * pokemon).
 *
 * El shell (PokedexShell.tsx) es el responsable de decidir si mostrar
 * este botón: si el pokemon no tiene modelo 3D, NO inyecta nada en
 * `slots.BOTON_3D` y por tanto este componente no llega a montarse.
 * El stub usa `data-active` para que el shell (Plan 09) y los tests
 * E2E puedan saber si la Pokédex está renderizando la vista 3D activa.
 */
export interface Button3DSlotProps extends SlotStubProps {
  /** Si la Pokédex está en modo 3D activo. */
  active?: boolean;
}

export function Button3DSlot({ mode3D }: Button3DSlotProps) {
  return (
    <button
      type="button"
      {...buildSlotAttrs("button-3d", { active: Boolean(mode3D) })}
      aria-pressed={Boolean(mode3D)}
      aria-label="Ver en 3D"
    />
  );
}
