"use client";

import { useEffect, useRef } from "react";
import { usePokedexPage } from "@/src/components/pokedex/PokedexPageProvider";

/**
 * Plan 09 — Puente que sincroniza el estado `mode3D` del
 * `PokedexPageProvider` con el atributo `data-mode-3d` en el
 * ancestro `.pokedex-view`.
 *
 * El atributo `data-mode-3d` lo lee `globals.css` para aplicar
 * el `translateY` que empuja la Pokédex hacia abajo y deja
 * espacio para el overlay 3D + habitat en la parte superior.
 *
 * Este componente se monta una sola vez dentro de
 * `PokedexOverlay` (donde tiene acceso al contexto) y usa un
 * `useEffect` para reflejar el estado booleano en el DOM sin
 * necesidad de mover providers.
 */

export function Mode3DViewBinder() {
  const { mode3D } = usePokedexPage();
  const viewRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Busca el ancestro .pokedex-view más cercano.
    // Como este componente se monta dentro de PokedexOverlay
    // que a su vez está dentro de .pokedex-view, es seguro.
    const el = document.querySelector(".pokedex-view") as HTMLElement | null;
    viewRef.current = el;
    if (el) {
      el.setAttribute("data-mode-3d", String(mode3D));
    }
    return () => {
      if (viewRef.current) {
        viewRef.current.removeAttribute("data-mode-3d");
      }
    };
  }, [mode3D]);

  return null;
}
