import Image from "next/image";
import { AnimatedBackground } from "@/src/components/home/AnimatedBackground";
import { PokemonSlider } from "@/src/components/home/PokemonSlider";
import { SoundToggle } from "@/src/components/home/SoundToggle";
import { SoundMusicProvider } from "@/src/components/home/SoundMusicContext";
import { PressStartButton } from "@/src/components/home/PressStartButton";

/**
 * Plan 03.2 + 03.3 + 03.4 — Pantalla de inicio completa.
 *
 * Estructura de tres zonas en `flex-col` que ocupa exactamente el
 * viewport (`h-dvh`, `w-screen`) sin generar scroll:
 *   - Superior: logo centrado.
 *   - Media: ash (izq., respiración sutil) + pokedex cerrada (centro,
 *     glow pulsante) + slider pokemons (der., ciclo de 10 pokemons).
 *   - Inferior: botón de sonido (izq.) + botón PRESS START (centro,
 *     arcade pulsante).
 *
 * `SoundMusicProvider` expone el estado "música activa" para que el
 * Plan 04 (transiciones a `/pokedex`) pueda hacer fade-out antes de
 * cambiar de página.
 */
export default function HomePage() {
  return (
    <SoundMusicProvider>
      <div className="relative h-dvh w-screen overflow-hidden">
        <AnimatedBackground />

        <main
          className="relative z-10 flex h-full w-full flex-col"
          aria-label="Pantalla de inicio de la Pokédex"
        >
          {/* Zona superior — logo */}
          <section
            data-testid="home-zone-top"
            className="flex shrink-0 items-center justify-center pt-6 sm:pt-10"
            aria-label="Logo"
          >
            <Image
              src="/pagina_inicio/logo.svg"
              alt="Logo Pokédex"
              width={420}
              height={120}
              priority
              className="h-auto w-[60vw] max-w-[420px] sm:w-[40vw] lg:w-[28vw]"
            />
          </section>

          {/* Zona media — ash + pokedex + slider pokemons */}
          <section
            data-testid="home-zone-middle"
            className="relative flex flex-1 items-center justify-center"
            aria-label="Ash, Pokédex y Pokémon destacado"
          >
            {/* Ash (izquierda, superpuesto) */}
            <div
              aria-label="Ash"
              className="pointer-events-none absolute left-0 bottom-0 z-10 hidden w-[28vw] max-w-[260px] sm:block lg:left-[4vw] lg:w-[20vw]"
            >
              <Image
                src="/pagina_inicio/ash.svg"
                alt="Ash"
                width={260}
                height={420}
                className="h-auto w-full animate-ash-breathe"
              />
            </div>

            {/* Pokédex cerrada (centro) */}
            <div
              aria-label="Pokédex cerrada"
              className="relative z-20 mx-auto w-[60vw] max-w-[420px] sm:w-[40vw] lg:w-[26vw]"
            >
              <Image
                src="/pagina_inicio/pokedex_cerrada.svg"
                alt="Pokédex cerrada"
                width={420}
                height={420}
                priority
                className="h-auto w-full drop-shadow-[0_18px_24px_rgba(0,0,0,0.45)] animate-pokedex-glow"
              />
            </div>

            {/* Slider pokemons (derecha, superpuesto) */}
            <div
              className="pointer-events-none absolute right-0 bottom-0 z-10 hidden w-[28vw] max-w-[260px] sm:block lg:right-[4vw] lg:w-[20vw]"
            >
              <PokemonSlider />
            </div>
          </section>

          {/* Zona inferior — sonido + press start */}
          <section
            data-testid="home-zone-bottom"
            className="flex shrink-0 items-end justify-between gap-4 px-4 pb-6 sm:px-8 sm:pb-10"
            aria-label="Controles"
          >
            <SoundToggle />
            <div className="flex-1 flex justify-center">
              <PressStartButton />
            </div>
            {/* Espaciador derecho para mantener el botón PRESS START centrado */}
            <div aria-hidden="true" className="w-10 sm:w-12" />
          </section>
        </main>
      </div>
    </SoundMusicProvider>
  );
}