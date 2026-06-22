"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { pokedexTransitionBus } from "@/src/components/transitions/PokedexTransitionOut";

/**
 * Plan 04.3 — Botón "Volver al inicio" de la Pokédex.
 *
 * Botón discreto (esquina superior izquierda) que dispara la
 * transición inversa: anima la salida de la Pokédex + restaura el
 * volumen de la música y luego navega a `/`.
 *
 * El botón consume `pokedexTransitionBus.playExit()` para coordinar
 * la coreografía con el `PokedexTransitionOut` que envuelve la
 * Pokédex (ver `src/components/transitions/PokedexTransitionOut.tsx`).
 *
 * Si NO hay `PokedexTransitionOut` montado (entornos sin la
 * transición, tests aislados), la navegación es directa.
 *
 * Accesibilidad:
 *   - `aria-label="Volver al inicio"` (visible sólo como icono).
 *   - Foco visible con outline de alto contraste.
 *   - `type="button"` para evitar submits accidentales.
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
      className={
        "fixed top-3 left-3 sm:top-4 sm:left-4 z-40 inline-flex h-10 w-10 sm:h-12 sm:w-12 " +
        "items-center justify-center rounded border-4 border-[#0c1c3e] bg-[#FFE590] " +
        "text-[#0c1c3e] shadow-[3px_3px_0_#0c1c3e] transition-transform " +
        "hover:-translate-y-0.5 hover:bg-[#FFD56B] " +
        "active:translate-y-0 active:shadow-[2px_2px_0_#0c1c3e] " +
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FF9203] " +
        "focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1c3e] " +
        (className ?? "")
      }
    >
      <ArrowLeft aria-hidden="true" className="h-5 w-5 sm:h-6 sm:w-6" />
    </button>
  );
}