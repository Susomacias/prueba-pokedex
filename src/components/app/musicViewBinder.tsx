"use client";

import { useEffect, useRef } from "react";
import { useSoundMusic } from "@/src/components/home/SoundMusicContext";
import { useView } from "@/src/components/app/ViewContext";

/**
 * Controlador de volumen de la música en función de la vista activa.
 *
 * El borrador pide:
 *   - "Si la música se estuviera ejecutando bajamos el volumen
 *     lentamente" al pasar de Home → Pokédex.
 *   - "Será igual que la transición de inicio a pokédex pero al revés"
 *     al volver, lo que se traduce en subir el volumen de nuevo.
 *
 * La música la crea y reproduce `SoundToggle` (en la home). Aquí
 * sólo modulamos su `volume` cuando cambia la vista:
 *
 *   - view = "home"  → volume sube al target (0.6) si isPlaying.
 *   - view = "pokedex" → volume baja a 0 (mantiene reproducción).
 *
 * Implementación: cancelamos cualquier fade en curso y animamos el
 * volumen con `setInterval(16ms)` desde el valor actual al destino.
 * Si no hay audio registrado (la home todavía no montó `SoundToggle`),
 * el efecto es un no-op.
 */

const FADE_MS = 600;
const TARGET_VOLUME = 0.6;
const TICK_MS = 16;

interface FadeableAudio {
  volume: number;
}

let currentAudio: FadeableAudio | null = null;
let activeFadeId = 0;

export function registerFadeableAudio(audio: FadeableAudio | null): void {
  currentAudio = audio;
}

/** Sólo para tests. */
export function _getCurrentAudioForTests(): FadeableAudio | null {
  return currentAudio;
}

function fadeTo(target: number, durationMs: number): void {
  activeFadeId += 1;
  const myId = activeFadeId;
  const audio = currentAudio;
  if (!audio) return;
  const startVol = audio.volume;
  const start = Date.now();
  const interval = setInterval(() => {
    if (myId !== activeFadeId) {
      clearInterval(interval);
      return;
    }
    const elapsed = Date.now() - start;
    const t = Math.min(1, Math.max(0, elapsed / durationMs));
    audio.volume = startVol + (target - startVol) * t;
    if (t >= 1) {
      clearInterval(interval);
      audio.volume = target;
    }
  }, TICK_MS);
}

/**
 * Componente que conecta `useView()` con el volumen del audio.
 * Sin estado propio, sin markup. Montar una sola vez en el shell.
 */
export function MusicViewBinder() {
  const { view } = useView();
  const { isPlaying } = useSoundMusic();
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      // No animamos en el primer render: si el usuario tenía la música
      // activa al cargar, el `SoundToggle` ya puso volume = TARGET_VOLUME.
      return;
    }
    if (view === "pokedex") {
      fadeTo(0, FADE_MS);
    } else if (view === "home" && isPlaying) {
      fadeTo(TARGET_VOLUME, FADE_MS);
    }
  }, [view, isPlaying]);

  return null;
}
