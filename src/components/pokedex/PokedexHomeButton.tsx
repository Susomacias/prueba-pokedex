"use client";

import { useCallback, useRef } from "react";
import Image from "next/image";
import { useView } from "@/src/components/app/ViewContext";

/**
 * Botón "Volver al inicio" de la Pokédex.
 *
 * El borrador pide que el LOGO de la página de inicio actúe como
 * botón para volver desde la Pokédex. Como ahora la Pokédex y la
 * Home conviven en el mismo árbol (SPA de una sola URL), basta con
 * cambiar el estado de vista a "home" — no hay navegación.
 *
 * La continuidad visual con la transición es responsabilidad del
 * CSS: cuando `data-view="home"`, el logo de la home vuelve desde
 * la esquina superior izquierda al centro (`@keyframes
 * home-enter-logo`), dando la sensación de que "este botón se
 * convierte en el logo".
 */
export interface PokedexHomeButtonProps {
  className?: string;
}

export function PokedexHomeButton({ className }: PokedexHomeButtonProps) {
  const { goToHome, view } = useView();
  const inflightRef = useRef(false);

  const handleClick = useCallback(() => {
    if (inflightRef.current) return;
    if (view === "home") return;
    inflightRef.current = true;
    try {
      goToHome();
    } finally {
      // El flag se libera tras la duración de la animación (~800ms)
      // para evitar clicks repetidos que compitan con la transición.
      window.setTimeout(() => {
        inflightRef.current = false;
      }, 850);
    }
  }, [goToHome, view]);

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Volver al inicio"
      title="Volver al inicio"
      data-testid="pokedex-home-button"
      data-pokedex-logo="true"
      className={
        "fixed top-3 left-3 sm:top-4 sm:left-4 z-40 inline-flex h-12 w-auto sm:h-14 " +
        "items-center justify-center bg-transparent transition-transform " +
        "hover:-translate-y-0.5 " +
        "active:translate-y-0 " +
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FF9203] " +
        "focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1c3e] " +
        (className ?? "")
      }
    >
      <Image
        src="/pagina_inicio/logo.svg"
        alt=""
        aria-hidden="true"
        width={360}
        height={100}
        priority
        className="h-full w-auto"
      />
    </button>
  );
}
