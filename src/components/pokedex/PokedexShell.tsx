"use client";

import { useMemo, type ReactElement } from "react";
import {
  PokedexHorizontalSvg,
} from "@/src/components/pokedex/carcases/PokedexHorizontalSvg";
import {
  PokedexVerticalSvg,
} from "@/src/components/pokedex/carcases/PokedexVerticalSvg";
import { createEmptySlots, type SlotMap } from "@/src/components/pokedex/carcases/slots";
import { useViewportLayout } from "@/src/hooks/useViewportLayout";
import {
  Button3DSlot,
  CarouselButtonsSlot,
  CarouselDotsSlot,
  CarouselSlot,
  ChipsSlot,
  EvolutionsSlot,
  FilterConsoleSlot,
  FilterDropdownsSlot,
  SearchResetFilterSlot,
  SoundSlot,
  StatsSlot,
  ToggleStatsAbilitiesSlot,
} from "@/src/components/pokedex/slots";
import { CarouselProvider } from "@/src/components/pokedex/carousel/CarouselController";
import { usePokedexPage } from "@/src/components/pokedex/PokedexPageProvider";

/**
 * Plan 05.3 + 05.4 — Ensamblador de slots y switch responsive.
 *
 * Responsabilidades:
 *
 * 1. **Construir el `SlotMap`** a partir del estado del provider
 *    (`usePokedexPage()`). Cada slot se rellena con el componente stub
 *    correspondiente de `src/components/pokedex/slots/`.
 * 2. **Elegir la carcasa** (vertical u horizontal) en función del
 *    viewport vía el hook `useViewportLayout` (Plan 05.4). El shell
 *    NO decide por su cuenta; delega en el hook.
 * 3. **Ocupar el viewport completo sin scroll** (`100dvh × 100vw`,
 *    `overflow-hidden`).
 *
 * NO contiene:
 *   - Lógica de negocio (fetch de datos, mutaciones, audio). Eso vive
 *     en cada stub/slot final de los planes 06–09.
 *
 * El shell añade un `data-testid="pokedex-shell"` y `data-orientation`
 * en el host para que los tests E2E puedan inspeccionar la elección
 * sin acoplarse al detalle de la carcasa concreta.
 */

export function PokedexShell(): ReactElement {
  const orientation = useViewportLayout();
  const {
    selectedName,
    mode3D,
    has3DModel,
    toggleStatsAbilities,
    filtersActive,
  } = usePokedexPage();

  const slots: SlotMap = useMemo(() => {
    const map = createEmptySlots();
    // El botón 3D sólo se inyecta si el pokemon tiene modelo 3D.
    map.BOTON_3D = has3DModel ? <Button3DSlot mode3D={mode3D} /> : null;
    map.TIPO1_TIPO2_GENERACION = <ChipsSlot pokemonName={selectedName} />;
    map.PUNTOS_CARRUSEL = <CarouselDotsSlot pokemonName={selectedName} />;
    map.CARRUSEL_IMAGENES_DESCRIPCION = (
      <CarouselSlot pokemonName={selectedName} mode3D={mode3D} />
    );
    map.BOTONES_CARRUSEL = <CarouselButtonsSlot pokemonName={selectedName} />;
    map.SONIDO_POKEMON = <SoundSlot pokemonName={selectedName} />;
    map.EVOLUCIONES = <EvolutionsSlot pokemonName={selectedName} />;
    map.STATS = (
      <StatsSlot pokemonName={selectedName} mode={toggleStatsAbilities} />
    );
    map.VER_HABILIDADES_VER_STATS = (
      <ToggleStatsAbilitiesSlot
        pokemonName={selectedName}
        mode={toggleStatsAbilities}
      />
    );
    map.CONSOLA_FILTROS = <FilterConsoleSlot active={filtersActive} />;
    map.DROPDOWNS_FILTROS = <FilterDropdownsSlot />;
    map.BUSCAR_RESET_FILTRAR = <SearchResetFilterSlot />;
    return map;
  }, [selectedName, mode3D, has3DModel, toggleStatsAbilities, filtersActive]);

  const carcasa = (
    <CarouselProvider pokemonName={selectedName}>
      {orientation === "vertical" ? (
        <PokedexVerticalSvg slots={slots} />
      ) : (
        <PokedexHorizontalSvg slots={slots} />
      )}
    </CarouselProvider>
  );

  // Wrapper del SVG que respeta el aspect-ratio del viewBox para que
  // la Pokédex siempre se vea COMPLETA sin deformarse ni generar
  // scroll: `width: 100%` con `aspect-ratio` del viewBox deja que el
  // alto se derive del ancho (o al revés según quepa), y
  // `max-height: 100%` con `max-width: 100%` impide overflow.
  const hostStyle: React.CSSProperties =
    orientation === "vertical"
      ? {
          width: "min(100%, calc(100dvh * (828.25 / 1062.6)))",
          aspectRatio: "828.25 / 1062.6",
        }
      : {
          height: "min(100%, calc(100dvw * (828.25 / 1062.6)))",
          aspectRatio: "1062.6 / 828.25",
        };

  return (
    <div
      data-testid="pokedex-shell"
      className="pokedex-shell"
      style={{
        position: "relative",
        width: "100vw",
        height: "100dvh",
        maxWidth: "100vw",
        maxHeight: "100dvh",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        data-orientation={orientation}
        data-shell-host="true"
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...hostStyle,
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {carcasa}
        </div>
      </div>
    </div>
  );
}
