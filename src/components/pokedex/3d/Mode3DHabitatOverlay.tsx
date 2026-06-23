"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { usePokedexPage } from "@/src/components/pokedex/PokedexPageProvider";
import { fetchPokemonDetail } from "@/src/lib/pokemon/cachedPokemonApi";
import { HABITAT_IMAGES } from "@/src/lib/constants/habitats";
import type { Habitat, PokemonDetail } from "@/src/lib/types/pokemon";

/**
 * Plan 09 — Overlay del habitat y futuro visor 3D.
 *
 * Cuando el modo 3D está activo, la Pokédex se desplaza hacia abajo
 * (vía CSS `data-mode-3d`) y este componente ocupa el espacio
 * liberado en la parte superior con:
 *
 *  1. La imagen de fondo del hábitat del pokemon seleccionado.
 *  2. Un indicador de flecha hacia abajo en el borde inferior.
 *  3. Soporte para gesto swipe-up (tocar y arrastrar hacia arriba)
 *     para cerrar el modo 3D.
 *
 * Se renderiza mediante un portal a `document.body` para evitar
 * que el stacking context de `.pokedex-view` (que tiene `transform`)
 * interfiera con `position: fixed`.
 *
 * En el futuro (Plan 10) el objeto 3D (Three.js) se montará como
 * hijo de este overlay, sobre la imagen de habitat.
 */

const MODE3D_OFFSET_VH = 45;

export function Mode3DHabitatOverlay() {
  const { mode3D, selectedName, setMode3D } = usePokedexPage();
  const [detail, setDetail] = useState<PokemonDetail | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const touchStartY = useRef<number | null>(null);
  const cancelledRef = useRef(false);

  const habitat: Habitat = detail?.habitat ?? "generico";
  const habitatSrc = HABITAT_IMAGES[habitat];

  // Clave que identifica si debemos tener datos cargados.
  const activeKey = mode3D && selectedName ? selectedName : null;

  // Patron "store previous value": sincroniza el estado de carga
  // durante el render sin esperar al useEffect.
  const [prevActiveKey, setPrevActiveKey] = useState(activeKey);
  if (prevActiveKey !== activeKey) {
    setPrevActiveKey(activeKey);
    if (activeKey == null) {
      // Sin pokemon o 3D inactivo: limpiamos el detalle.
      setDetail(null);
      setImageLoaded(false);
    }
  }

  // Reset de imageLoaded cuando cambia la URL de la imagen.
  const [prevHabitatSrc, setPrevHabitatSrc] = useState(habitatSrc);
  if (prevHabitatSrc !== habitatSrc) {
    setPrevHabitatSrc(habitatSrc);
    setImageLoaded(false);
  }

  // Fetch del detalle cuando hay un pokemon seleccionado y 3D activo.
  useEffect(() => {
    cancelledRef.current = false;
    if (!activeKey) return;

    let cancelled = false;
    (async () => {
      try {
        const d = await fetchPokemonDetail(activeKey);
        if (!cancelled && !cancelledRef.current) {
          setDetail(d);
        }
      } catch {
        // Silencioso: si falla, el overlay muestra el habitat generico.
      }
    })();

    return () => {
      cancelled = true;
      cancelledRef.current = true;
    };
  }, [activeKey]);

  // Gesto swipe-up para cerrar el modo 3D.
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
    },
    [],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartY.current == null) return;
      const deltaY = e.changedTouches[0].clientY - touchStartY.current;
      touchStartY.current = null;
      // Swipe hacia arriba (deltaY negativo) de al menos 40px.
      if (deltaY < -40) {
        setMode3D(false);
      }
    },
    [setMode3D],
  );

  // Flecha de cierre.
  const handleArrowClick = useCallback(() => {
    setMode3D(false);
  }, [setMode3D]);

  if (!mode3D) return null;

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      data-testid="mode3d-habitat-overlay"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: `${MODE3D_OFFSET_VH}vh`,
        zIndex: 25,
        overflow: "hidden",
        pointerEvents: "auto",
      }}
    >
      {/* Imagen de habitat como fondo */}
      <img
        src={habitatSrc}
        alt=""
        role="presentation"
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageLoaded(false)}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
          opacity: imageLoaded ? 0.85 : 0,
          transition: "opacity 600ms ease-out",
          pointerEvents: "none",
        }}
      />

      {/* Degradado sutil hacia el borde inferior para transición suave
          con el color de fondo del body (azul #1a1a2e). */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to bottom, rgba(26,26,46,0.1) 0%, rgba(26,26,46,0.4) 80%, rgba(26,26,46,0.85) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Indicador de flecha hacia abajo (borde inferior centrado).
          Indica al usuario que puede deslizar hacia arriba o pulsar
          para cerrar el modo 3D. */}
      <button
        type="button"
        data-testid="mode3d-close-arrow"
        aria-label="Cerrar vista 3D"
        onClick={handleArrowClick}
        style={{
          position: "absolute",
          bottom: "8px",
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(18,108,163,0.7)",
          border: "1px solid rgba(70,162,218,0.4)",
          borderRadius: "50%",
          width: "36px",
          height: "36px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "#46A2DA",
          padding: 0,
          zIndex: 1,
          animation: "mode3dArrowPulse 2s ease-in-out infinite",
        }}
      >
        <style>{`
          @keyframes mode3dArrowPulse {
            0%, 100% { box-shadow: 0 0 4px rgba(70,162,218,0.3); }
            50% { box-shadow: 0 0 14px rgba(70,162,218,0.7); }
          }
        `}</style>
        <ChevronDown size={20} strokeWidth={2.5} />
      </button>

      {/* Texto indicador de "desliza hacia arriba para cerrar" */}
      <div
        style={{
          position: "absolute",
          bottom: "52px",
          left: "50%",
          transform: "translateX(-50%)",
          color: "rgba(255,255,255,0.5)",
          fontSize: "10px",
          fontFamily: "monospace",
          textAlign: "center",
          pointerEvents: "none",
          userSelect: "none",
          whiteSpace: "nowrap",
        }}
      >
        Desliza hacia arriba para cerrar
      </div>
    </div>,
    document.body,
  );
}
