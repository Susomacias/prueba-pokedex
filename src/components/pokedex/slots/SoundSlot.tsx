"use client";

import { buildSlotAttrs, type SlotStubProps } from "./types";
import { useCarousel } from "../carousel/CarouselController";
import { PokemonSoundButton } from "../carousel/PokemonSoundButton";

/**
 * Plan 06.6 — Slot `SONIDO_POKEMON` (botón de cry).
 *
 * Consume el detalle del pokemon desde el `CarouselController`. Si
 * la PokeAPI no expone `cryLatestUrl` para este pokemon, el botón
 * no se renderiza (`PokemonSoundButton` devuelve `null`).
 */
export function SoundSlot({ pokemonName }: SlotStubProps) {
  const { detail } = useCarouselSafe();
  if (!pokemonName) return null;
  return (
    <div
      {...buildSlotAttrs("sound", { pokemonName })}
      aria-label="Botón de sonido del pokemon"
    >
      <PokemonSoundButton
        pokemonName={detail?.name ?? pokemonName}
        cryUrl={detail?.cryLatestUrl ?? null}
      />
    </div>
  );
}

const NEUTRAL_STATE = {
  detail: null,
  error: null,
  activeIndex: 0,
  totalSlides: 0,
  canPrev: false,
  canNext: false,
  goTo: () => undefined,
  goNext: () => undefined,
  goPrev: () => undefined,
};

function useCarouselSafe() {
  try {
    return useCarousel();
  } catch {
    return NEUTRAL_STATE;
  }
}