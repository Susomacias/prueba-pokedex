"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2 } from "lucide-react";

/**
 * Plan 06.6 — `PokemonSoundButton`: botón del slot `SONIDO_POKEMON`
 * que reproduce el "cry" del pokemon seleccionado.
 *
 * Comportamiento:
 *  - Al pulsar: crea un `new Audio(cryUrl)` y reproduce.
 *  - Si ya está sonando: reinicia la reproducción (currentTime=0 y
 *    play de nuevo). Esta es la práctica estándar para "stop and
 *    replay" — más predecible que ignorar el click.
 *  - Visual feedback: `data-playing="true"` mientras suena; vuelve a
 *    `"false"` cuando termina.
 *  - Sin `cryUrl`: el botón NO se monta (la PokeAPI no expone cry
 *    para todas las species).
 *  - Limpieza del audio al desmontar.
 *
 * Accesibilidad:
 *  - `aria-label` dinámico: "Reproducir sonido de <nombre>".
 *  - `aria-pressed` refleja el estado de reproducción.
 *  - Icono `Volume2` decorativo (`aria-hidden`).
 */

export interface PokemonSoundButtonProps {
  /** Nombre del pokemon (para el `aria-label` accesible). */
  pokemonName: string;
  /** URL del cry (`cry.latest`) o `null` si no hay. */
  cryUrl: string | null;
}

export function PokemonSoundButton({ pokemonName, cryUrl }: PokemonSoundButtonProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  // Limpia el audio al desmontar.
  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.src = "";
        audioRef.current = null;
      }
    };
  }, []);

  const handlePlay = useCallback(() => {
    if (!cryUrl) return;
    let audio = audioRef.current;
    if (!audio) {
      audio = new Audio(cryUrl);
      audio.preload = "auto";
      audio.addEventListener("ended", () => setPlaying(false));
      audio.addEventListener("pause", () => {
        // `pause` puede dispararse por el user, pero como nosotros
        // sólo pausamos al desmontar, también reseteamos el flag.
        if (audioRef.current === audio) setPlaying(false);
      });
      audioRef.current = audio;
    }
    // Stop-and-replay: reiniciamos desde 0 si ya estaba sonando.
    audio.currentTime = 0;
    setPlaying(true);
    void audio.play().catch(() => {
      // Autoplay puede fallar en algunos navegadores si no hubo
      // gesto del usuario; lo silenciamos y reseteamos estado.
      setPlaying(false);
    });
  }, [cryUrl]);

  if (!cryUrl) return null;

  return (
    <button
      type="button"
      data-testid="pokemon-sound-button"
      data-playing={playing ? "true" : "false"}
      aria-label={`Reproducir sonido de ${pokemonName}`}
      aria-pressed={playing}
      onClick={handlePlay}
      className="pokemon-sound-button"
    >
      <Volume2 aria-hidden="true" className="pokemon-sound-button__icon" />
      {playing ? (
        <span className="pokemon-sound-button__waves" aria-hidden="true">
          <span className="pokemon-sound-button__wave" />
          <span className="pokemon-sound-button__wave" />
          <span className="pokemon-sound-button__wave" />
        </span>
      ) : null}
    </button>
  );
}