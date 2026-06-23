"use client";

import { useEffect, useRef, useState } from "react";
import { useAppShell } from "@/src/components/app/ViewContext";
import { buildSlotAttrs, type SlotStubProps } from "./types";
import { PokemonList } from "../list/PokemonList";
import { PokemonCarousel } from "../carousel/PokemonCarousel";

/**
 * Plan 11 — Slot `CARRUSEL_IMAGENES_DESCRIPCION` con overlay
 * lista ↔ carrusel.
 *
 * El slot SIEMPRE aloja la `PokemonList` como capa base (para que
 * no desaparezca al navegar). Cuando hay un pokemon seleccionado
 * (`pokemonName != null`), el carrusel se monta ENCIMA con
 * `position: absolute; inset: 0` ocupando el 100% del slot y
 * entra con animación scale+fade (Plan 11).
 *
 * Estados (`data-state` del overlay):
 *  - `idle`  : sin overlay (lista visible).
 *  - `enter` : overlay entrando (escala de 0.6 a 1, opacity de 0
 *              a 1, 350ms). El primer paint tiene `data-state="enter"`
 *              para que el CSS aplique el `from`.
 *  - `shown` : overlay visible y estable a escala 1.
 *  - `exit`  : overlay encogiendo (escala de 1 a 0.6, opacity de 1
 *              a 0, 280ms). Al terminar, el overlay se desmonta.
 *
 * Cuando cambia `pokemonName` mientras el overlay está abierto, no
 * hay animación de salida: simplemente actualizamos el contenido del
 * carrusel (el `CarouselController` ya hace su propio reset interno).
 * Esto preserva la continuidad visual al explorar varios pokemons.
 *
 * Reglas duras (ver AGENTS.md → Política de navegación y URL):
 *  - La lista NO se desmonta al cambiar de pokemon (sólo cambia el
 *    `selectedName` y la URL con `pushState`). Esto mantiene la
 *    sensación de SPA y conserva el scroll.
 *  - El botón X del overlay sólo cierra el carrusel y limpia
 *    `selectedName` (vuelve a `/pokedex`); NO oculta la Pokédex.
 *  - `pointer-events: auto` en el overlay mientras esté visible;
 *    `none` cuando no. La lista detrás queda inerte para no
 *    disparar clics accidentales.
 */
const ENTER_MS = 350;
const EXIT_MS = 280;

type OverlayState = "idle" | "enter" | "shown" | "exit";

export function CarouselSlot({ pokemonName, mode3D }: SlotStubProps) {
  // `shownName` es el pokemon actualmente visible en el overlay.
  // Inicialmente puede diferir de `pokemonName` durante la animación
  // de salida (queremos que el carrusel permanezca montado mientras
  // se encoge y se desvanece).
  const [shownName, setShownName] = useState<string | null>(pokemonName);
  // Estado inicial: si hay pokemon, arrancamos en "enter" para
  // que el primer paint dispare la animación de entrada. El
  // `useEffect` siguiente avanza a "shown" tras ENTER_MS.
  const [state, setState] = useState<OverlayState>(
    pokemonName ? "enter" : "idle",
  );
  const enterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sincronizar estado con `pokemonName` (Plan 11).
  useEffect(() => {
    // Limpia timers pendientes del estado anterior.
    if (enterTimerRef.current) {
      clearTimeout(enterTimerRef.current);
      enterTimerRef.current = null;
    }
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }

    if (pokemonName) {
      // Caso A: hay un pokemon que mostrar.
      setShownName(pokemonName);
      setState("enter");
      enterTimerRef.current = setTimeout(() => {
        setState("shown");
        enterTimerRef.current = null;
      }, ENTER_MS);
      return;
    }

    // Caso B: ya no hay pokemon seleccionado.
    if (shownName) {
      setState("exit");
      exitTimerRef.current = setTimeout(() => {
        setShownName(null);
        setState("idle");
        exitTimerRef.current = null;
      }, EXIT_MS);
      return;
    }

    setState("idle");
    return;
    // `shownName` se lee y se actualiza dentro del efecto pero
    // NO queremos que sea una dependencia (provocaría bucles
    // porque el efecto lo modifica).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pokemonName]);

  // Limpieza al desmontar el slot.
  useEffect(() => {
    return () => {
      if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, []);

  const overlayShown = shownName != null;

  return (
    <div
      {...buildSlotAttrs("carousel", {
        pokemonName: pokemonName ?? shownName ?? undefined,
        mode: mode3D ? "3d" : undefined,
      })}
      role="region"
      aria-label={
        overlayShown
          ? "Carrusel de imágenes y descripción"
          : "Lista de Pokémon"
      }
      data-active={overlayShown ? "true" : "false"}
      data-state={state}
      data-stub={overlayShown ? "carousel" : "list"}
      className="pokedex-carousel-slot pokedex-carousel-slot--overlay-host"
      style={{ position: "relative", width: "100%", height: "100%" }}
    >
      {/* Lista SIEMPRE montada: queda detrás del overlay cuando
          hay pokemon seleccionado, y a la vista cuando no. Esto
          preserva el scroll, los filtros y la sensación de SPA. */}
      <div
        className="pokedex-carousel-slot__list"
        data-active={overlayShown ? "behind" : "visible"}
        aria-hidden={overlayShown ? "true" : undefined}
      >
        <PokemonList />
      </div>

      {/* Overlay del carrusel. Se monta cuando hay pokemon y se
          desmonta tras la animación de salida. */}
      {overlayShown ? (
        <div
          className="pokedex-carousel-slot__overlay"
          data-state={state}
          data-pokemon={shownName ?? undefined}
        >
          <PokemonCarousel />
        </div>
      ) : null}

      {/* Botón X de cerrar — sólo visible con el overlay abierto.
          Al pulsar llama a `goToPokedex()` (pushState a `/pokedex`),
          lo que vacía `selectedName` y dispara la animación de
          salida del overlay. */}
      {overlayShown ? <CarouselCloseButton /> : null}
    </div>
  );
}

/* ------------------------------------------------------------------------- *
 * Botón X — Plan 11
 * ------------------------------------------------------------------------- */

function CarouselCloseButton() {
  const { goToPokedex } = useAppShell();
  return (
    <button
      type="button"
      data-testid="carousel-close-button"
      aria-label="Cerrar detalle del pokemon"
      onClick={goToPokedex}
      className="pokedex-carousel-slot__close"
    >
      <span aria-hidden="true">×</span>
    </button>
  );
}