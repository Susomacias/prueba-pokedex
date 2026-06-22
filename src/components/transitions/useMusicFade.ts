"use client";

import { useCallback } from "react";
import { useSoundMusic } from "@/src/components/home/SoundMusicContext";

/**
 * Plan 04.1 — Controlador de fade de volumen para la música del
 * inicio.
 *
 * Contexto:
 *   El Plan 04.2 hace fade-out del volumen durante la transición
 *   Inicio → Pokédex (sin pausar el audio, para permitir una
 *   reentrada suave). El Plan 04.3 hace el camino inverso (fade-in
 *   al volver).
 *
 * Para evitar acoplar el orquestador a `SoundToggle` (que es el
 * dueño del `HTMLAudioElement`), la API se separa en dos partes:
 *
 *   - `attachAudioController(audio)` — lo llama `SoundToggle` cuando
 *     crea el audio. Acepta `null` para "olvidar" el audio (al
 *     desmontar, o al pausar y descartar).
 *   - `useMusicFadeController()` — hook que expone `fadeOut(ms)` y
 *     `fadeIn(target, ms)`. Resuelve cuando el fade termina.
 *
 * ¿Por qué no usar directamente `useSoundMusic` para el fade?
 *   Porque ese context sólo conoce un booleano ("isPlaying"). El
 *   fade necesita leer/escribir el `volume` del audio real, y
 *   `SoundToggle` es quien mantiene la referencia al elemento.
 *   Mantener este controller separado evita ciclos de render y
 *   dependencia circular con el `SoundMusicProvider`.
 *
 * Accesibilidad:
 *   - Las funciones NO lanzan excepciones si no hay audio
 *     registrado (no-op silencioso + resolución inmediata).
 *   - Si la música NO estaba activa al iniciar el fadeIn, la
 *     operación se salta (no tiene sentido subir un volumen que el
 *     usuario no quiere oír).
 */

/** Subset de HTMLAudioElement que necesita el controlador. */
export interface FadeableAudio {
  volume: number;
  paused: boolean;
  pause(): void;
  play(): Promise<void> | void;
}

/** Audio registrado actualmente (singleton en el módulo). */
let currentAudio: FadeableAudio | null = null;

export function attachAudioController(audio: FadeableAudio | null): void {
  currentAudio = audio;
}

/** Sólo para tests. */
export function _getCurrentAudioForTests(): FadeableAudio | null {
  return currentAudio;
}

/** Referencia al interval activo (para cancelar). */
let activeFade: { cancel: () => void } | null = null;

/**
 * Paso animado que avanza de 0 → 1 a lo largo de `durationMs` con
 * ticks discretos. Implementación con `setInterval` (no RAF) para
 * que sea testeable en jsdom: vitest/jsdom gestiona correctamente
 * los timers de setInterval/setTimeout dentro de `act`, mientras que
 * los RAFs del polyfill de jsdom pueden no dispararse.
 *
 * En navegador el comportamiento es indistinguible: ~16ms por tick.
 */
function timedStep(
  durationMs: number,
  onTick: (t: number) => void,
): Promise<void> {
  const TICK_MS = 16;
  return new Promise((resolve) => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const t = Math.min(1, Math.max(0, elapsed / durationMs));
      onTick(t);
      if (t >= 1) {
        clearInterval(interval);
        resolve();
      }
    }, TICK_MS);
    activeFade = {
      cancel: () => {
        clearInterval(interval);
        resolve();
      },
    };
  });
}

export interface MusicFadeController {
  fadeOut(durationMs: number): Promise<void>;
  fadeIn(targetVolume: number, durationMs: number): Promise<void>;
}

/**
 * Hook que expone el controlador de fade. No tiene estado propio:
 * todas las operaciones se aplican al audio registrado vía
 * `attachAudioController`. Si no hay audio, las funciones son
 * no-ops y resuelven inmediatamente.
 *
 * Implementación:
 *   - Usa `requestAnimationFrame` para suavidad y para cancelar
 *     limpiamente si entra otro fade antes de terminar.
 *   - Cada fade se asocia a un único `activeFade` global; uno nuevo
 *     cancela el anterior para evitar "saltos" de volumen.
 *
 * Política de respeto al usuario:
 *   - `fadeOut` siempre se ejecuta (es la forma elegante de salir).
 *   - `fadeIn` SOLO se ejecuta si el usuario tiene la música activa
 *     (`useSoundMusic().isPlaying === true`). Esto evita imponer un
 *     volumen al usuario que había elegido silenciar la música.
 */
export function useMusicFadeController(): MusicFadeController {
  const { isPlaying } = useSoundMusic();

  const fadeOut = useCallback(async (durationMs: number): Promise<void> => {
    if (activeFade) activeFade.cancel();
    const audio = currentAudio;
    if (!audio) return;
    const startVol = audio.volume;
    await timedStep(durationMs, (t) => {
      audio.volume = startVol * (1 - t);
    });
    // Aseguramos el valor final exacto aunque el último tick haya
    // quedado en `t < 1` por precisión de timing.
    audio.volume = 0;
  }, []);

  const fadeIn = useCallback(
    async (targetVolume: number, durationMs: number): Promise<void> => {
      if (!isPlaying) return;
      if (activeFade) activeFade.cancel();
      const audio = currentAudio;
      if (!audio) return;
      const startVol = audio.volume;
      const delta = targetVolume - startVol;
      await timedStep(durationMs, (t) => {
        audio.volume = startVol + delta * t;
      });
      audio.volume = targetVolume;
    },
    [isPlaying],
  );

  return { fadeOut, fadeIn };
}