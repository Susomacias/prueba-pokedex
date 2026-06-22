"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { PokedexTransitionOut } from "@/src/components/transitions/PokedexTransitionOut";
import { PokedexHomeButton } from "@/src/components/pokedex/PokedexHomeButton";
import { SoundMusicProvider } from "@/src/components/home/SoundMusicContext";

/**
 * Plan 04.3 — Wrapper cliente de la página `/pokedex`.
 *
 * Monta:
 *   - Un `SoundMusicProvider` (Plan 03.4) necesario para que
 *     `PokedexTransitionOut` pueda usar `useMusicFadeController`
 *     (que lee `useSoundMusic` para respetar la preferencia del
 *     usuario al hacer fade in de la música).
 *   - Un `PokedexTransitionOut` que orquesta la salida animada
 *     (carcasa baja + fade in de música).
 *   - Un `PokedexHomeButton` (esquina superior izquierda) que
 *     dispara la transición.
 *   - Un sentinel DOM `data-pokedex-ready` para que los tests E2E
 *     puedan esperar a que los listeners de transición estén
 *     activos (mismo patrón que en `HomeNavController`).
 *
 * El sentinel se muta directamente desde el `useEffect` para
 * evitar `setState` dentro de effect (anti-patrón React 19).
 */

export interface PokedexShellClientProps {
  children: ReactNode;
}

export function PokedexShellClient({ children }: PokedexShellClientProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Marcamos el sentinel como "ready" en cuanto el componente
    // se monta. Como el `PokedexTransitionOut` registra su
    // `playExit` en su propio `useEffect` (que corre junto al
    // nuestro en el mismo commit), podemos asegurar que el bus ya
    // tiene un suscriptor.
    const sentinel = sentinelRef.current;
    if (sentinel) {
      sentinel.setAttribute("data-pokedex-ready", "true");
    }
    return () => {
      if (sentinel) {
        sentinel.setAttribute("data-pokedex-ready", "false");
      }
    };
  }, []);

  return (
    <SoundMusicProvider>
      <PokedexTransitionOut data-testid="pokedex-shell-wrapper">
        {/* Sentinel para tests E2E: indica que los listeners de
            transición están registrados. */}
        <div
          ref={sentinelRef}
          data-pokedex-ready="false"
          hidden
          aria-hidden="true"
        />
        <PokedexHomeButton />
        {children}
      </PokedexTransitionOut>
    </SoundMusicProvider>
  );
}