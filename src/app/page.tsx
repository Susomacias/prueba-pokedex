import Image from "next/image";
import { AnimatedBackground } from "@/src/components/home/AnimatedBackground";
import { PokemonSlider } from "@/src/components/home/PokemonSlider";
import { SoundToggle } from "@/src/components/home/SoundToggle";
import { PressStartButton } from "@/src/components/home/PressStartButton";
import { HomeShell } from "@/src/components/home/HomeShell";

/**
 * Plan 03.2 + 03.3 + 03.4 + 03.5 — Pantalla de inicio completa.
 *
 * Estructura de tres zonas en `flex-col` que ocupa exactamente el
 * viewport (`h-dvh`, `w-screen`) sin generar scroll:
 *   - Superior: logo centrado.
 *   - Media: pokedex cerrada (centro, al fondo, glow pulsante) +
 *     ash (izquierda, delante, respiración sutil) + slider
 *     pokemons (derecha, delante, ciclo de 10 pokemons).
 *   - Inferior: botón de sonido (izq.) + botón PRESS START (centro,
 *     arcade pulsante, ahora un `<Link>` a `/pokedex`).
 *
 * Notas de maquetación (revisión post-03.5):
 *   - `flex flex-col` con hijos `min-h-0` para que ningún hijo
 *     fuerce scroll vertical aunque el contenido sea mayor al
 *     viewport. El wrapper raíz usa `overflow-hidden`.
 *   - `gap-y` introduce separación vertical real entre logo, Pokédex
 *     y botón PRESS START en todos los breakpoints.
 *   - La Pokédex manda en tamaño en TODOS los breakpoints: usa el
 *     menor entre un porcentaje de alto y un porcentaje de ancho
 *     del viewport para que NUNCA desborde. En móvil ocupa la mayor
 *     parte del ancho y Ash/slider se ven delante, más pequeños y
 *     solapando los bordes laterales. En escritorio se reduce un
 *     poco para dejar hueco a Ash/slider, que se acercan mucho a
 *     sus bordes laterales.
 *   - Ash y slider se posicionan con `inset-x-0` y se anclan a
 *     una distancia fija del centro del contenedor: así su
 *     posición horizontal es siempre proporcional y nunca los
 *     empuja fuera de pantalla ni los separa demasiado de la
 *     Pokédex.
 *   - El botón PRESS START ya no está pegado al borde inferior: la
 *     fila inferior lleva `pb` y el contenido se centra vertical.
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
          {/* Encabezado accesible (no visible): aporta el nombre
              semántico de la página a lectores de pantalla y a
              selectores que buscan el texto "Pokédex" en el main. */}
          <h1 className="sr-only">Pokédex</h1>

          {/* Zona superior — logo */}
          <section
            data-testid="home-zone-top"
            className="flex shrink-0 items-center justify-center"
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

          {/* Zona media — pokedex al fondo + ash + slider pokemons
              por delante. La Pokédex dicta el tamaño y Ash/slider se
              anclan a una distancia fija del centro (no de los
              bordes del viewport) para quedar siempre pegados a
              ella. */}
          <section
            data-testid="home-zone-middle"
            className="relative flex min-h-0 flex-1 items-center justify-center"
            aria-label="Ash, Pokédex y Pokémon destacado"
          >
            {/* Ash (izquierda, delante). El contenedor ocupa todo el
                ancho y el sprite se ancla a la izquierda del
                centro: así su posición es siempre relativa a la
                Pokédex (no al borde del viewport). En móvil el
                sprite es pequeño, se separa del borde derecho
                (slider) y se eleva sobre el suelo para no
                competir con la Pokédex por el protagonismo; en
                escritorio tiene tamaño intermedio-alto y queda
                próximo a la Pokédex sin solaparla en exceso.
                DOM: va PRIMERO para que el árbol refleje el orden
                lógico (ash → pokedex → slider) que también espera
                el test de layout. */}
            <div
              aria-label="Ash"
              className="pointer-events-none absolute inset-0 z-20 flex items-end justify-center pb-[8%] sm:pb-0"
            >
              <Image
                src="/pagina_inicio/ash.svg"
                alt="Ash"
                width={220}
                height={360}
                className="h-[44%] w-auto -translate-x-[clamp(52%,60%,68%)] animate-ash-breathe sm:h-[60%] sm:-translate-x-[clamp(52%,62%,74%)] lg:h-[68%] lg:-translate-x-[clamp(62%,74%,88%)]"
              />
            </div>

            {/* Pokédex cerrada (centro, al fondo). Es la pieza más
                grande en TODOS los breakpoints y manda en
                proporciones. `min(dvh, vw)` garantiza que nunca
                desborde. DOM: va en medio. Visualmente está al
                fondo (z-10) por debajo de Ash/slider (z-20). */}
            <div
              aria-label="Pokédex cerrada"
              className="relative z-10 aspect-square w-auto h-[min(72dvh,88vw)] max-h-full max-w-full sm:h-[min(66dvh,54vw)] lg:h-[min(70dvh,44vw)]"
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

            {/* Slider pokemons (derecha, delante). Simétrico a Ash:
                anclado al lado derecho del centro. En móvil es
                pequeño, se separa del borde izquierdo (Ash) y se
                eleva sobre el suelo; en escritorio tiene tamaño
                intermedio próximo a la Pokédex sin solaparla en
                exceso. */}
            <div
              className="pointer-events-none absolute inset-0 z-20 flex items-end justify-center pb-[8%] sm:pb-0"
            >
              <div className="aspect-[3/4] h-[38%] w-auto translate-x-[clamp(52%,60%,68%)] sm:h-[52%] sm:translate-x-[clamp(52%,62%,74%)] lg:h-[60%] lg:translate-x-[clamp(62%,74%,88%)]">
                <PokemonSlider />
              </div>
            </div>
          </section>

          {/* Zona inferior — sonido + press start. No `items-end`
              para que el botón PRESS START no quede pegado al borde
              inferior; lleva `pb` generoso para mantener la separación
              vertical aunque el botón crezca y para que el botón de
              sonido no choque con la esquina inferior (donde en dev
              aparece el indicador de Next.js). */}
          <section
            data-testid="home-zone-bottom"
            className="flex shrink-0 items-center justify-between gap-3 pb-8 sm:gap-4 sm:pb-10"
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
    </HomeShell>
  );
}
