import { Suspense } from "react";
import Image from "next/image";
import { AnimatedBackground } from "@/src/components/home/AnimatedBackground";
import { PokemonSlider } from "@/src/components/home/PokemonSlider";
import { SoundToggle } from "@/src/components/home/SoundToggle";
import { PressStartButton } from "@/src/components/home/PressStartButton";

/**
 * Subtree compartido por las páginas `/`, `/pokedex` y
 * `/pokemon/[name]`.
 *
 * Las tres rutas renderizan la pantalla de inicio en algún momento
 * del ciclo de vida (la ruta `/` la muestra como destino; las otras
 * dos la muestran durante el primer frame antes de la transición a
 * la Pokédex). Para no duplicar el marcado, esta función devuelve
 * el `<main>` con logo, Ash, slider, pokédex cerrada y botones.
 *
 * El componente es **Server Component** (no tiene `"use client"`):
 * las imágenes usan `next/image` para que Next prefetchée y
 * optimice. Los hijos interactivos (`PokemonSlider`, `SoundToggle`,
 * `PressStartButton`) son Client Components y se importan
 * normalmente; el límite Server/Client lo traza Next automáticamente.
 *
 * `HomeShell` NO se incluye aquí porque es el wrapper que monta los
 * providers (`AppShellProvider`, etc.). Cada página decide cómo
 * envolver este subtree según su ruta.
 */
export function HomeViewContent() {
  return (
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

          <div className="home-exit-target-slider pointer-events-none absolute inset-0 z-20 flex items-end justify-center pb-[8%] sm:pb-0">
            <div className="aspect-[3/4] h-[38%] w-auto translate-x-[clamp(52%,60%,68%)] sm:h-[52%] sm:translate-x-[clamp(52%,62%,74%)] lg:h-[60%] lg:translate-x-[clamp(62%,74%,88%)]">
              <Suspense fallback={null}>
                <PokemonSlider />
              </Suspense>
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
  );
}