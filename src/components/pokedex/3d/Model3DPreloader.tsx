"use client";

import { useEffect, useState, useRef } from "react";
import { usePokedexPage } from "@/src/components/pokedex/PokedexPageProvider";
import { fetchPokemonDetail } from "@/src/lib/pokemon/cachedPokemonApi";
import { usePokemonModel } from "@/src/components/pokedex/3d/usePokemonModel";
import type { PokemonDetail } from "@/src/lib/types/pokemon";

/**
 * Plan 09.5 — Precarga del modelo 3D en segundo plano.
 *
 * Se monta siempre dentro de PokedexOverlay. Cuando el usuario
 * selecciona un pokemon, obtiene su id de la ficha de detalle y
 * empieza a cargar el .glb en background usando usePokemonModel.
 *
 * El modelo se cachea globalmente (module-level Map dentro de
 * usePokemonModel), así que cuando PokemonViewer3D se monte
 * posteriormente (al activar el modo 3D), el modelo ya estará
 * disponible al instante.
 *
 * Este componente no renderiza nada.
 */
export function Model3DPreloader() {
  const { selectedName } = usePokedexPage();
  const [detail, setDetail] = useState<PokemonDetail | null>(null);
  const cancelledRef = useRef(false);

  // Store previous: limpia el detalle en render si selectedName cambió
  const [prevSelectedName, setPrevSelectedName] = useState(selectedName);
  if (prevSelectedName !== selectedName) {
    setPrevSelectedName(selectedName);
    setDetail(null);
  }

  // Obtener el id del pokemon para precargar el modelo
  useEffect(() => {
    cancelledRef.current = false;
    if (!selectedName) return;

    let cancelled = false;
    (async () => {
      try {
        const d = await fetchPokemonDetail(selectedName);
        if (!cancelled && !cancelledRef.current) {
          setDetail(d);
        }
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.warn(
            "[Model3DPreloader] Error obteniendo detalle de %s:",
            selectedName,
            err,
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      cancelledRef.current = true;
    };
  }, [selectedName]);

  // Precargar el modelo 3D (el hook usa cache global)
  usePokemonModel(detail?.id ?? null);

  return null;
}
