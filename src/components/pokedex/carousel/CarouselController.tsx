"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { fetchPokemonDetail } from "@/src/lib/pokemon/cachedPokemonApi";
import type { PokemonDetail } from "@/src/lib/types/pokemon";
import "./pokemon-carousel.css";

/**
 * Plan 06.3 — `CarouselController`: provider que carga el detalle del
 * pokemon seleccionado y mantiene el estado compartido del carrusel
 * (`activeIndex`, navegación, dirección de transición, flag de
 * interacción del usuario).
 *
 * ¿Por qué un provider?
 *  - El slot `CARRUSEL_IMAGENES_DESCRIPCION` (que monta `PokemonCarousel`)
 *    está separado visualmente de los slots `PUNTOS_CARRUSEL` (LEDs)
 *    y `BOTONES_CARRUSEL` (botones izq/der). Sin embargo, los LEDs y
 *    los botones deben:
 *      - conocer la slide activa,
 *      - poder navegar a una slide concreta,
 *      - cancelar el auto-avance cuando el usuario interactúa.
 *    Compartir esto vía props desde `PokedexShell` requeriría
 *    perforar varios componentes. Un context local resuelve el
 *    problema con coste mínimo.
 *
 *  - El detalle del pokemon también se consume en `SoundSlot`
 *    (necesita `cryLatestUrl`). Centralizar el fetch en el controller
 *    evita duplicar la petición desde varios slots.
 *
 *  - El `React.cache` interno en `cachedPokemonApi.fetchPokemonDetail`
 *    deduplica la petición si varios consumidores la piden a la vez,
 *    pero el provider también evita iniciar más de un fetch en
 *    absoluto.
 *
 * El controller NO conoce la URL — recibe `pokemonName` como prop.
 * La traducción URL → pokemonName la hace el caller (`PokedexShell`).
 */

const AUTO_ADVANCE_MS = 5000;

export interface CarouselState {
  /** Detalle completo del pokemon (null mientras carga o si falla). */
  detail: PokemonDetail | null;
  /** Error de fetch (null si no hay). */
  error: Error | null;
  /** Índice de la slide activa (0-based). */
  activeIndex: number;
  /** Total de slides. */
  totalSlides: number;
  /** `false` deshabilita el botón "anterior" (estás en la primera). */
  canPrev: boolean;
  /** `false` deshabilita el botón "siguiente" (estás en la última). */
  canNext: boolean;
  /** Salta a una slide concreta (cancela auto-avance). */
  goTo(index: number): void;
  /** Avanza una slide (clamp en el extremo). */
  goNext(): void;
  /** Retrocede una slide (clamp en el extremo). */
  goPrev(): void;
}

const CarouselContext = createContext<CarouselState | null>(null);

export interface CarouselProviderProps {
  /** Nombre del pokemon. Si es `null`, el provider queda inactivo. */
  pokemonName: string | null;
  children: ReactNode;
}

export function CarouselProvider({ pokemonName, children }: CarouselProviderProps) {
  const [detail, setDetail] = useState<PokemonDetail | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Flag transitorio para cancelar el auto-avance. Ver skill
  // vercel-react-best-practices → rerender-use-ref-transient-values.
  const userInteractedRef = useRef(false);

  /* ---------------------- Fetch del detalle ---------------------- */

  useEffect(() => {
    // Reset del estado cuando cambia el pokemon seleccionado. Es el
    // patrón canónico para sincronizar estado local con un valor
    // externo (Plan 06.3 + docs de React sobre
    // `resetting-all-state-when-a-prop-changes`).
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!pokemonName) {
      setDetail(null);
      setError(null);
      setActiveIndex(0);
      userInteractedRef.current = false;
      return;
    }
    let cancelled = false;
    setDetail(null);
    setError(null);
    setActiveIndex(0);
    userInteractedRef.current = false;
    /* eslint-enable react-hooks/set-state-in-effect */

    (async () => {
      try {
        const next = await fetchPokemonDetail(pokemonName);
        if (cancelled) return;
        setDetail(next);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pokemonName]);

  /* ---------------------- Slides totales ---------------------- */

  const totalSlides = useMemo(
    () => (detail ? countSlides(detail) : 0),
    [detail],
  );

  const canPrev = activeIndex > 0;
  const canNext = activeIndex < totalSlides - 1;

  /* ---------------------- Navegación ---------------------- */

  const goTo = useCallback(
    (nextIndex: number) => {
      if (nextIndex < 0 || nextIndex >= totalSlides) return;
      userInteractedRef.current = true;
      setActiveIndex(nextIndex);
    },
    [totalSlides],
  );

  const goNext = useCallback(() => {
    if (!canNext) return;
    userInteractedRef.current = true;
    setActiveIndex((i) => i + 1);
  }, [canNext]);

  const goPrev = useCallback(() => {
    if (!canPrev) return;
    userInteractedRef.current = true;
    setActiveIndex((i) => i - 1);
  }, [canPrev]);

  /* ---------------------- Auto-avance ---------------------- */

  useEffect(() => {
    if (!detail) return;
    if (userInteractedRef.current) return;
    if (totalSlides <= 1) return;
    const id = setInterval(() => {
      if (userInteractedRef.current) return;
      setActiveIndex((prev) => (prev + 1) % totalSlides);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [detail, totalSlides]);

  const value = useMemo<CarouselState>(
    () => ({
      detail,
      error,
      activeIndex,
      totalSlides,
      canPrev,
      canNext,
      goTo,
      goNext,
      goPrev,
    }),
    [
      detail,
      error,
      activeIndex,
      totalSlides,
      canPrev,
      canNext,
      goTo,
      goNext,
      goPrev,
    ],
  );

  return (
    <CarouselContext.Provider value={value}>{children}</CarouselContext.Provider>
  );
}

/**
 * Acceso al estado del carrusel. Lanza error si se usa fuera del
 * provider para detectar mal uso temprano.
 */
export function useCarousel(): CarouselState {
  const ctx = useContext(CarouselContext);
  if (!ctx) {
    throw new Error("useCarousel debe usarse dentro de <CarouselProvider>");
  }
  return ctx;
}

const MAX_SLIDES = 7;

/** Cuenta las slides sin construirlas (helper compartido). */
function countSlides(detail: PokemonDetail): number {
  let n = 0;
  if (detail.sprites.frontDefault) n += 1; // hero
  if (detail.sprites.frontDefault || detail.flavorText) n += 1; // flavor
  const others = [
    detail.sprites.officialArtwork,
    detail.sprites.homeFront,
    detail.sprites.frontShiny,
    detail.sprites.backDefault,
    detail.sprites.backShiny,
    detail.sprites.officialArtworkShiny,
    detail.sprites.homeShiny,
  ].filter((u): u is string => typeof u === "string").length;
  n += Math.min(others, MAX_SLIDES - n);
  return n;
}