"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Plan 03.3 — Slider animado de pokemons de la pantalla de inicio.
 *
 * Cicla los 10 pokemons del borrador en el orden establecido:
 *
 *   1. Charmander → 2. Ponita → 3. Caterpi → 4. Squirtle → 5. Pikachu →
 *   6. Rinomer    → 7. Bulbasur → 8. Onix    → 9. Abra       → 10. Magicarp
 *   → (vuelve a 1)
 *
 * Cada pokemon tiene tres fases:
 *   - **Enter**: aparece desde la derecha (`translateX + opacity`, 600ms).
 *   - **Hold**: permanece visible 3 s.
 *   - **Exit**: sale hacia la derecha (`translateX + opacity`, 600ms).
 *
 * Tras completarse las tres fases se avanza al siguiente índice
 * (módulo el número de pokemons). El bucle es continuo.
 *
 * Optimizaciones:
 *   - **Preload**: los 10 SVG se renderizan a la vez para que no haya
 *     saltos de carga entre transiciones.
 *   - **Refs transitorios** (`hiddenRef`) para evitar re-renders cuando
 *     cambia `document.visibilityState`.
 *   - **Pause on hide**: si la pestaña se oculta, se cancela el timer
 *     activo; al volver, se reanuda desde cero la fase actual
 *     (sencillo y robusto; el desfase es de un único paso de fase).
 *   - **Reduced motion**: cuando `prefers-reduced-motion: reduce` está
 *     activo se elimina la transición CSS; el cambio de pokemon es
 *     instantáneo al final del `hold`.
 */

const POKEMONS = [
  { name: "charmander", file: "charmander" },
  { name: "ponita", file: "ponita" },
  { name: "caterpi", file: "caterpi" },
  { name: "squirtle", file: "squirtle" },
  { name: "pikachu", file: "pikachu" },
  { name: "rinomer", file: "rinomer" },
  { name: "bulbasur", file: "bulbasur" },
  { name: "onix", file: "onix" },
  { name: "abra", file: "abra" },
  { name: "magicarp", file: "magicarp" },
] as const;

const ENTER_MS = 600;
const HOLD_MS = 3000;
const EXIT_MS = 600;
const CYCLE_MS = ENTER_MS + HOLD_MS + EXIT_MS;

type Phase = "enter" | "hold" | "exit";

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return reduced;
}

function phaseDuration(phase: Phase): number {
  if (phase === "enter") return ENTER_MS;
  if (phase === "hold") return HOLD_MS;
  return EXIT_MS;
}

export function PokemonSlider() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("enter");
  // `tick` es un contador que se incrementa para forzar al efecto
  // principal a reprogramar el timer cuando la pestaña vuelve a estar
  // visible (React bails out al `setPhase((p) => p)` si el valor no
  // cambia, así que necesitamos una señal explícita).
  const [tick, setTick] = useState(0);
  const reduceMotion = usePrefersReducedMotion();

  // Refs transitorios: nunca disparan render.
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hiddenRef = useRef(false);

  const clearPhaseTimer = useCallback(() => {
    if (phaseTimerRef.current !== null) {
      clearTimeout(phaseTimerRef.current);
      phaseTimerRef.current = null;
    }
  }, []);

  // Único efecto que gobierna el ciclo. Cuando `phase` o `tick`
  // cambian, programa el timer que avanza al siguiente estado.
  useEffect(() => {
    if (hiddenRef.current) {
      return clearPhaseTimer;
    }

    phaseTimerRef.current = setTimeout(() => {
      phaseTimerRef.current = null;
      if (hiddenRef.current) return;
      if (phase === "enter") {
        setPhase("hold");
      } else if (phase === "hold") {
        setPhase("exit");
      } else {
        setIndex((i) => (i + 1) % POKEMONS.length);
        setPhase("enter");
      }
    }, phaseDuration(phase));

    return clearPhaseTimer;
    // `tick` está en deps para que el increment reactive el efecto.
  }, [phase, tick, clearPhaseTimer]);

  // Pausa / reanudación del ciclo según `visibilitychange`.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        hiddenRef.current = true;
        clearPhaseTimer();
      } else if (hiddenRef.current) {
        hiddenRef.current = false;
        // Forzamos la reprogramación del timer incrementando `tick`.
        setTick((t) => t + 1);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [clearPhaseTimer]);

  const phaseClass = (() => {
    if (reduceMotion) return "home-slider-slide--reduced";
    if (phase === "enter") return "home-slider-slide--enter";
    if (phase === "hold") return "home-slider-slide--hold";
    return "home-slider-slide--exit";
  })();

  return (
    <div
      role="region"
      aria-label="Slider de pokémons"
      data-testid="home-pokemon-slider"
      className="relative aspect-[3/4] w-full"
    >
      {POKEMONS.map((p, i) => {
        const isActive = i === index;
        return (
          <div
            key={p.name}
            data-testid={`home-slider-slide-${p.name}`}
            data-pokemon={p.name}
            data-active={isActive ? "true" : "false"}
            data-phase={isActive ? phase : "hidden"}
            aria-hidden={isActive ? "false" : "true"}
            className={
              "absolute inset-0 flex items-end justify-center " +
              (isActive ? phaseClass : "home-slider-slide--hidden")
            }
            style={reduceMotion ? { animation: "none" } : undefined}
          >
            <Image
              src={`/pagina_inicio/${p.file}.svg`}
              alt={p.name}
              width={260}
              height={340}
              draggable={false}
              priority={i < 3}
              className="pointer-events-none h-full w-auto select-none"
            />
          </div>
        );
      })}
    </div>
  );
}

// Re-exportado solo para los tests (cálculo del ciclo).
export const __POKEMON_SLIDER_CYCLE_MS = CYCLE_MS;
export const __POKEMON_SLIDER_POKEMONS = POKEMONS.map((p) => p.name);
