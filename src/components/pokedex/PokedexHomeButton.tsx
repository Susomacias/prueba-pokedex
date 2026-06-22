"use client";

import { useCallback, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { pokedexTransitionBus } from "@/src/components/transitions/PokedexTransitionOut";
import { markHomeArrivalFromPokedex } from "@/src/components/transitions/HomeTransitionOut";

/**
 * Plan 04.3 — Botón "Volver al inicio" de la Pokédex.
 *
 * El borrador (línea 317 del `Borrador_Pokedex.md`) establece que el
 * LOGO de la página de inicio debe servir como botón para volver a la
 * home desde la Pokédex. Este componente materializa esa idea: renderiza
 * la misma imagen `/pagina_inicio/logo.svg` que aparece en la home, pero
 * posicionada de forma fija en la esquina superior izquierda y dentro
 * de un `<button>` accesible.
 *
 * Continuidad visual con la transición:
 *   - Salida de la home: el logo se anima desde el centro hacia la
 *     parte superior izquierda (`@keyframes home-exit-logo`).
 *   - Entrada en la Pokédex: este botón aparece en la misma posición
 *     final, dando la sensación de que el logo "aterriza" allí.
 *   - Vuelta a la home: al pulsar, se marca el flag de "venimos de
 *     la Pokédex" en `sessionStorage` (vía
 *     `markHomeArrivalFromPokedex`) para que el `HomeTransitionOut`
 *     ejecute la animación INVERSA de entrada (`home-enter-*`) al
 *     montarse la home.
 *
 * El botón consume `pokedexTransitionBus.playExit()` para coordinar
 * la coreografía con el `PokedexTransitionOut` que envuelve la
 * Pokédex (ver `src/components/transitions/PokedexTransitionOut.tsx`).
 *
 * Si NO hay `PokedexTransitionOut` montado (entornos sin la
 * transición, tests aislados), la navegación es directa (pero
 * seguimos marcando el flag para que la home ejecute la animación
 * de entrada).
 *
 * Accesibilidad:
 *   - `aria-label="Volver al inicio"`.
 *   - Foco visible con outline de alto contraste.
 *   - `type="button"` para evitar submits accidentales.
 *   - La imagen tiene `alt=""` + `aria-hidden` porque el botón ya
 *     aporta nombre accesible (evita duplicación).
 */

export interface PokedexHomeButtonProps {
  className?: string;
}

export function PokedexHomeButton({ className }: PokedexHomeButtonProps) {
  const router = useRouter();
  // Ref que evita dobles clicks mientras la transición está en curso.
  const inflightRef = useRef(false);

  const handleClick = useCallback(async () => {
    if (inflightRef.current) return;
    inflightRef.current = true;
    try {
      // Marcamos ANTES de la animación que vamos a volver a la
      // home. De este modo, aunque la home se monte muy rápido,
      // el `HomeTransitionOut` verá el flag al inicializar y
      // disparará la animación de entrada (`home-enter-*`).
      markHomeArrivalFromPokedex();
      if (pokedexTransitionBus.hasSubscriber()) {
        await pokedexTransitionBus.playExit();
        router.push("/", { scroll: false });
      } else {
        router.push("/", { scroll: false });
      }
    } finally {
      inflightRef.current = false;
    }
  }, [router]);

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Volver al inicio"
      title="Volver al inicio"
      data-testid="pokedex-home-button"
      data-pokedex-logo="true"
      className={
        "fixed top-3 left-3 sm:top-4 sm:left-4 z-40 inline-flex h-12 w-auto sm:h-14 " +
        "items-center justify-center bg-transparent transition-transform " +
        "hover:-translate-y-0.5 " +
        "active:translate-y-0 " +
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FF9203] " +
        "focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1c3e] " +
        (className ?? "")
      }
    >
      <Image
        src="/pagina_inicio/logo.svg"
        alt=""
        aria-hidden="true"
        width={360}
        height={100}
        priority
        className="h-full w-auto"
      />
    </button>
  );
}