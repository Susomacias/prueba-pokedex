"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Plan 03.4 — Contexto que expone el estado "música activa".
 *
 * El Plan 04 (transiciones a `/pokedex`) necesita saber si la música
 * está sonando para hacer `fadeOut` antes de cambiar de página. En lugar
 * de acoplar `SoundToggle` a `next/navigation`, exponemos un setter
 * ligero que cualquier consumidor del provider puede usar.
 *
 * Diseño:
 *   - Provider sin lógica de audio: solo gestiona el flag.
 *   - `SoundToggle` es el responsable de sincronizar este estado con la
 *     reproducción real del `HTMLAudioElement`.
 *   - Hook `useSoundMusic()` lanza error si se usa fuera del provider
 *     (mejor fallar pronto que tener un `false` silencioso).
 */

export interface SoundMusicContextValue {
  isPlaying: boolean;
  setIsPlaying: (next: boolean) => void;
}

const SoundMusicContext = createContext<SoundMusicContextValue | null>(null);

export function SoundMusicProvider({ children }: { children: ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const value = useMemo<SoundMusicContextValue>(
    () => ({ isPlaying, setIsPlaying }),
    [isPlaying],
  );
  return (
    <SoundMusicContext.Provider value={value}>
      {children}
    </SoundMusicContext.Provider>
  );
}

export function useSoundMusic(): SoundMusicContextValue {
  const ctx = useContext(SoundMusicContext);
  if (!ctx) {
    throw new Error(
      "useSoundMusic debe usarse dentro de un <SoundMusicProvider>",
    );
  }
  return ctx;
}

/**
 * Helper estable para usar el provider desde un layout/page sin
 * tener que importar dos símbolos cuando solo se necesita el provider.
 */
export function useStableSoundMusicActions() {
  const { setIsPlaying } = useSoundMusic();
  return useCallback((next: boolean) => setIsPlaying(next), [setIsPlaying]);
}
