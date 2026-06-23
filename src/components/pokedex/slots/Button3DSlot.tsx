"use client";

import { useEffect, useState } from "react";
import { Box } from "lucide-react";
import { buildSlotAttrs, type SlotStubProps } from "./types";
import { usePokedexPage } from "@/src/components/pokedex/PokedexPageProvider";

export interface Button3DSlotProps extends SlotStubProps {
  active?: boolean;
}

export function Button3DSlot({ mode3D }: Button3DSlotProps) {
  const { setMode3D } = usePokedexPage();
  const [visible, setVisible] = useState(false);
  const [pulseReady, setPulseReady] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    const t = setTimeout(() => setPulseReady(true), 3100);
    return () => { cancelAnimationFrame(raf); clearTimeout(t); };
  }, []);

  const isActive = Boolean(mode3D);

  return (
    <button
      type="button"
      {...buildSlotAttrs("button-3d", { active: isActive })}
      aria-pressed={isActive}
      aria-label={isActive ? "Modo 3D activo. Pulsa para desactivar" : "Ver en 3D"}
      onClick={() => setMode3D(!isActive)}
      className="button-3d"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "2px",
        width: "100%",
        height: "100%",
        backgroundColor: "transparent",
        border: "none",
        cursor: "pointer",
        padding: "0",
        opacity: visible ? 1 : 0,
        transition: "opacity 3s ease",
        outline: "none",
        animation: pulseReady ? "btn3dPulse 1.8s ease-in-out infinite" : "none",
      }}
    >
      <style>{`
        @keyframes btn3dPulse {
          0%, 100% {
            filter: drop-shadow(0 0 6px rgba(8,45,79,0.5)) drop-shadow(0 0 12px rgba(8,45,79,0.25));
            transform: scale(1);
          }
          50% {
            filter: drop-shadow(0 0 16px rgba(10,60,100,0.9)) drop-shadow(0 0 28px rgba(10,60,100,0.5)) drop-shadow(0 0 40px rgba(8,45,79,0.3));
            transform: scale(1.06);
          }
        }
        .button-3d:hover {
          filter: drop-shadow(0 0 18px rgba(10,60,100,1)) drop-shadow(0 0 32px rgba(10,60,100,0.6)) !important;
          transform: scale(1.1) !important;
          transition: filter 0.2s ease, transform 0.2s ease;
        }
        .button-3d:active {
          transform: scale(0.92) !important;
          transition: transform 0.08s ease;
        }
      `}</style>
      <Box
        size={isActive ? 32 : 28}
        strokeWidth={3}
        color="#082D4F"
        style={{ transition: "all 0.3s ease", flexShrink: 0 }}
      />
      <span
        style={{
          fontFamily: "monospace",
          fontWeight: 900,
          fontSize: "24px",
          color: "#082D4F",
          letterSpacing: "2px",
          transition: "color 0.3s ease",
          lineHeight: 1,
        }}
      >
        3D
      </span>
    </button>
  );
}
