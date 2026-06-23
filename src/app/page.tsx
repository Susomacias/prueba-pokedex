import Image from "next/image";
import { AnimatedBackground } from "@/src/components/home/AnimatedBackground";
import { PokemonSlider } from "@/src/components/home/PokemonSlider";
import { SoundToggle } from "@/src/components/home/SoundToggle";
import { PressStartButton } from "@/src/components/home/PressStartButton";
import { HomeShell } from "@/src/components/home/HomeShell";

/**
 * Pantalla de inicio (SPA de una sola URL).
 *
 * Estructura:
 *
 *   <HomeShell>          ← monta AppShell (providers + view state) y registra listeners
 *     <home-view>        ← offscreen cuando view=pokedex (CSS)
 *       <AnimatedBackground />
 *       <main>
 *         <logo />       ← .home-exit-target-logo  → al pulsar vuelve al inicio
 *         <Ash />        ← .home-exit-target-ash    → sale por la izquierda
 *         <Slider />     ← .home-exit-target-slider → sale por la derecha
 *         <Pokedex cerrada /> ← .home-exit-target-bottom → sale por abajo
 *         <SoundToggle />
 *         <PressStartButton />   ← cambia view a "pokedex"
 *       </main>
 *     </home-view>
 *     <PokedexOverlay />  ← pre-renderizado por AppShell, offscreen hasta view=pokedex
 *   </HomeShell>
 *
 * La Pokédex NO se desmonta al volver a la home: queda en el DOM con
 * su estado preservado.
 */
export default function HomePage() {
  return (
    <HomeShell>
      <div className="relative h-dvh w-screen overflow-hidden">
        <AnimatedBackground />

        <main
          className="relative z-10 flex h-full w-full flex-col items-stretch justify-center gap-y-2 px-2 py-2 sm:gap-y-3 sm:px-4 sm:py-3 lg:gap-y-4"
          aria-label="Pantalla de inicio de la Pokédex"
        >
          <h1 className="sr-only">Pokédex</h1>

          {/* Zona superior — logo */}
          <section
            data-testid="home-zone-top"
            className="home-exit-target-logo flex shrink-0 items-center justify-center"
            aria-label="Logo"
          >
            <Image
              src="/pagina_inicio/logo.svg"
              alt="Logo Pokédex"
              width={360}
              height={100}
              priority
              className="h-auto w-[clamp(120px,32vw,360px)]"
            />
          </section>

          {/* Zona media — pokedex al fondo + ash + slider pokemons */}
          <section
            data-testid="home-zone-middle"
            className="relative flex min-h-0 flex-1 items-center justify-center"
            aria-label="Ash, Pokédex y Pokémon destacado"
          >
            <div
              aria-label="Ash"
              className="home-exit-target-ash pointer-events-none absolute inset-0 z-20 flex items-end justify-center pb-[8%] sm:pb-0"
            >
              <Image
                src="/pagina_inicio/ash.svg"
                alt="Ash"
                width={220}
                height={360}
                className="h-[44%] w-auto -translate-x-[clamp(52%,60%,68%)] animate-ash-breathe sm:h-[60%] sm:-translate-x-[clamp(52%,62%,74%)] lg:h-[68%] lg:-translate-x-[clamp(62%,74%,88%)]"
              />
            </div>

            <div
              aria-label="Pokédex cerrada"
              className="home-exit-target-bottom relative z-10 aspect-square w-auto h-[min(72dvh,88vw)] max-h-full max-w-full sm:h-[min(66dvh,54vw)] lg:h-[min(70dvh,44vw)]"
            >
              <Image
                src="/pagina_inicio/pokedex_cerrada.svg"
                alt="Pokédex cerrada"
                width={360}
                height={360}
                priority
                className="h-full w-full drop-shadow-[0_18px_24px_rgba(0,0,0,0.45)] animate-pokedex-glow"
              />
            </div>

            <div
              className="home-exit-target-slider pointer-events-none absolute inset-0 z-20 flex items-end justify-center pb-[8%] sm:pb-0"
            >
              <div className="aspect-[3/4] h-[38%] w-auto translate-x-[clamp(52%,60%,68%)] sm:h-[52%] sm:translate-x-[clamp(52%,62%,74%)] lg:h-[60%] lg:translate-x-[clamp(62%,74%,88%)]">
                <PokemonSlider />
              </div>
            </div>
          </section>

          {/* Zona inferior — sonido + press start */}
          <section
            data-testid="home-zone-bottom"
            className="home-exit-target-bottom flex shrink-0 items-center justify-between gap-3 pb-8 sm:gap-4 sm:pb-10"
            aria-label="Controles"
          >
            <SoundToggle />
            <div className="flex-1 flex justify-center">
              <PressStartButton />
            </div>
            <div aria-hidden="true" className="w-10 sm:w-12" />
          </section>
        </main>
      </div>
    </HomeShell>
  );
}
