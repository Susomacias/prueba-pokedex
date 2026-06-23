"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Plan 06.6 + 11 — `PokemonSoundButton`: botón del slot
 * `SONIDO_POKEMON` que reproduce el "cry" del pokemon seleccionado.
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
 * Icono: SVG inline (no usamos `lucide-react` porque su SVG anidado
 * dentro del `<foreignObject>` del chasis de la Pokédex a veces no
 * se renderizaba visible — el `width/height` por defecto del icono
 * competía con el del SVG exterior y el icono aparecía como un punto
 * diminuto o invisible). Un `<svg>` con `width="60%" height="60%"`
 * explícitos resuelve el problema en todos los navegadores.
 *
 * Accesibilidad:
 *  - `aria-label` dinámico: "Reproducir sonido de <nombre>".
 *  - `aria-pressed` refleja el estado de reproducción.
 *  - Icono decorativo (`aria-hidden`).
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
      {/* Icono SVG inline — siempre visible independientemente del
          contexto. currentColor hereda del `color: #fff` del botón. */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="60%"
        height="60%"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z" />
        <path d="M16 9a5 5 0 0 1 0 6" />
        <path d="M19.364 18.364a9 9 0 0 0 0-12.728" />
      </svg>
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