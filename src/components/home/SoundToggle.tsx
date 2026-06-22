"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSoundMusic } from "@/src/components/home/SoundMusicContext";
import { attachAudioController } from "@/src/components/transitions/useMusicFade";

/**
 * Plan 03.4 — Botón de toggle para la música de la pantalla de inicio.
 *
 * Responsabilidades:
 *   - Renderiza un botón accesible (icono `Volume2` / `VolumeX`) que
 *     reproduce/pausa `public/pagina_inicio/musica.mp3` en loop.
 *   - Persiste la preferencia del usuario en `localStorage` con clave
 *     versionada (`pokedex:sound-enabled:v1`) para no romper el
 *     contrato si en el futuro cambia el formato.
 *   - Lee `localStorage` en el primer render del cliente para
 *     recordar la preferencia (no auto-reproduce sin gesto del usuario
 *     para cumplir las políticas de autoplay de los navegadores).
 *   - Expone el estado al `SoundMusicProvider` para que el Plan 04
 *     pueda hacer `fadeOut` antes de la transición a `/pokedex`.
 *   - Limpia el `HTMLAudioElement` y pausa al desmontar para no dejar
 *     música sonando si el usuario navega a otra página.
 *
 * Notas de accesibilidad:
 *   - `aria-label` cambia según el estado para que los lectores de
 *     pantalla anuncien la acción que ocurrirá al pulsar.
 *   - Iconos marcados con `aria-hidden` (el texto accesible vive en
 *     el `aria-label`).
 *   - Tamaño mínimo del target: 40×40 px en mobile y 48×48 px en `sm+`.
 */

const STORAGE_KEY = "pokedex:sound-enabled:v1";
const AUDIO_SRC = "/pagina_inicio/musica.mp3";

function readStoredPreference(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function SoundToggle() {
  const { setIsPlaying } = useSoundMusic();
  // Inicialización perezosa: evitamos leer `localStorage` en cada
  // render y obtenemos el valor correcto en el primer render del
  // cliente.
  const [enabled, setEnabled] = useState<boolean>(readStoredPreference);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Sincroniza el flag del provider con el estado local del botón.
  useEffect(() => {
    setIsPlaying(enabled);
  }, [enabled, setIsPlaying]);

  // Garantiza que existe un `HTMLAudioElement` solo cuando hace falta
  // (no creamos uno en SSR ni en el render inicial con sonido off).
  const ensureAudio = useCallback((): HTMLAudioElement => {
    if (audioRef.current) return audioRef.current;
    const audio = new Audio(AUDIO_SRC);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = 0.6;
    audioRef.current = audio;
    // Plan 04.1: registramos el audio en el controlador de fade
    // para que el Plan 04.2 pueda hacer fade-out / fade-in sin tener
    // que conocer la implementación interna de SoundToggle.
    attachAudioController(audio);
    return audio;
  }, []);

  // Limpia y pausa al desmontar.
  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.src = "";
        audioRef.current = null;
        // Desregistramos para que el controlador de fade no opere
        // sobre un audio muerto (que provocaría errores silenciosos
        // si se invoca tras navegar a otra página).
        attachAudioController(null);
      }
    };
  }, []);

  const toggle = useCallback(() => {
    const next = !enabled;
    setEnabled(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // Almacenamiento deshabilitado (modo privado, sin cuota, …):
      // la preferencia solo vivirá en memoria de la pestaña actual.
    }
    if (next) {
      const audio = ensureAudio();
      const result = audio.play();
      if (result && typeof result.catch === "function") {
        result.catch(() => {
          // El navegador ha bloqueado el autoplay. Revertimos la
          // preferencia persistida para no mentir al usuario.
          setEnabled(false);
          try {
            window.localStorage.setItem(STORAGE_KEY, "false");
          } catch {
            /* noop */
          }
        });
      }
    } else {
      audioRef.current?.pause();
    }
  }, [enabled, ensureAudio]);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      aria-label={enabled ? "Silenciar sonido" : "Activar sonido"}
      title={enabled ? "Silenciar sonido" : "Activar sonido"}
      data-testid="home-sound-toggle"
      data-enabled={enabled ? "true" : "false"}
      className="inline-flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded border-4 border-[#0c1c3e] bg-[#126CA3] text-white shadow-[4px_4px_0_#0c1c3e] transition-transform hover:-translate-y-0.5 hover:bg-[#1484c8] active:translate-y-0 active:shadow-[2px_2px_0_#0c1c3e] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFE590]"
    >
      {enabled ? (
        <Volume2 aria-hidden="true" className="h-5 w-5 sm:h-6 sm:w-6" />
      ) : (
        <VolumeX aria-hidden="true" className="h-5 w-5 sm:h-6 sm:w-6" />
      )}
    </button>
  );
}
