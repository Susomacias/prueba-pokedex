import Link from "next/link";
import { Pokeball } from "@/src/components/decorative/Pokeball";

/**
 * Plan 02.4 — Página 404.
 *
 * Estética 2D de videojuego: tipografía PressStart2P, fondo con el
 * degradado `#234476 → #0c1c3e` (definido en `globals.css`),
 * pokéball SVG dibujada a mano con animación lenta de rotación +
 * bobbing, y un botón "VOLVER AL INICIO" con efecto hover/press.
 *
 * El contenido se centra con `flex` y se mantiene dentro del
 * viewport (`min-h-dvh`) para evitar scroll.
 */
export default function NotFound() {
  return (
    <main
      className="relative flex flex-1 items-center justify-center px-6 py-10 overflow-hidden"
      aria-labelledby="notfound-title"
    >
      {/* Estrellas decorativas de fondo (sutiles, no distractoras) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 12% 22%, #FFE590 50%, transparent 51%)," +
            "radial-gradient(1px 1px at 78% 18%, #FF9203 50%, transparent 51%)," +
            "radial-gradient(1px 1px at 35% 78%, #75D984 50%, transparent 51%)," +
            "radial-gradient(1.2px 1.2px at 88% 70%, #FFE590 50%, transparent 51%)," +
            "radial-gradient(1px 1px at 22% 62%, #FF6363 50%, transparent 51%)," +
            "radial-gradient(1px 1px at 60% 30%, #46A2DA 50%, transparent 51%)",
          backgroundSize: "100% 100%",
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center gap-8 max-w-xl">
        <div
          className="animate-pokeball-bob"
          aria-hidden={false}
        >
          <div
            className="animate-pokeball-wobble"
            style={{ transformOrigin: "50% 50%" }}
            aria-hidden={false}
          >
            <Pokeball size={208} className="animate-pokeball-rotate" />
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <p
            id="notfound-title"
            className="text-[10px] sm:text-xs tracking-[0.4em] text-[#FFE590]"
          >
            ERROR 404
          </p>
          <h1 className="text-base sm:text-xl leading-relaxed text-white">
            POKÉMON NO ENCONTRADO
          </h1>
          <p className="text-[8px] sm:text-[10px] leading-loose text-[#46A2DA] max-w-sm">
            LA RUTA QUE BUSCAS NO EXISTE EN ESTA REGIÓN. VUELVE A LA
            POKÉDEX E INTÉNTALO DE NUEVO.
          </p>
        </div>

        <Link
          href="/"
          className="group relative inline-flex items-center gap-3 px-6 py-4 border-4 border-[#0c1c3e] bg-[#126CA3] text-white text-[10px] sm:text-xs shadow-[6px_6px_0_#0c1c3e] hover:bg-[#46A2DA] hover:-translate-y-0.5 hover:shadow-[8px_8px_0_#0c1c3e] active:translate-y-1 active:shadow-[2px_2px_0_#0c1c3e] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFE590]"
        >
          <span aria-hidden="true" className="inline-block w-2 h-2 bg-[#FFE590]" />
          VOLVER AL INICIO
          <span aria-hidden="true" className="inline-block w-2 h-2 bg-[#FFE590]" />
        </Link>
      </div>
    </main>
  );
}