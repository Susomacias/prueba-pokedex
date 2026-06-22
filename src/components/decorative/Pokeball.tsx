import type { CSSProperties } from "react";

/**
 * Pokéball SVG dibujada a mano (sin assets externos).
 *
 * Estética 2D: trazo grueso y sombreado plano tipo Game Boy Advance,
 * coherente con la paleta pixel-art de la Pokédex. Animaciones:
 *  - `rotate`: la pokéball gira lentamente sobre sí misma (60s/vuelta).
 *  - `bob`: sube y baja ligeramente para dar sensación de flotación.
 *
 * Las animaciones respetan `prefers-reduced-motion` desde
 * `globals.css` (todas las transiciones se anulan).
 *
 * @see Plan 02.4 — Página 404
 */
export interface PokeballProps {
  /** Tamaño en píxeles del lado del SVG. */
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function Pokeball({ size = 192, className, style }: PokeballProps) {
  return (
    <svg
      data-testid="pokeball"
      className={className}
      style={{
        width: size,
        height: size,
        filter: "drop-shadow(0 12px 24px rgba(0,0,0,0.45))",
        ...style,
      }}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Pokéball giratoria"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="pokeball-red" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF6363" />
          <stop offset="100%" stopColor="#910D03" />
        </linearGradient>
        <linearGradient id="pokeball-red-cap" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF8A8A" />
          <stop offset="55%" stopColor="#E33D3D" />
          <stop offset="100%" stopColor="#910D03" />
        </linearGradient>
        <linearGradient id="pokeball-shine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="pokeball-button" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#FFE590" />
          <stop offset="100%" stopColor="#FF9203" />
        </radialGradient>
      </defs>

      {/* Contorno exterior (sombra gruesa estilo pixel-art) */}
      <circle cx="50" cy="50" r="48" fill="#0c1c3e" />
      {/* Hemisferio superior (rojo) */}
      <path
        d="M 4 50 A 46 46 0 0 1 96 50 Z"
        fill="url(#pokeball-red-cap)"
        stroke="#0c1c3e"
        strokeWidth="2"
      />
      {/* Hemisferio inferior (blanco) */}
      <path
        d="M 4 50 A 46 46 0 0 0 96 50 Z"
        fill="#F5F5F5"
        stroke="#0c1c3e"
        strokeWidth="2"
      />
      {/* Banda negra central */}
      <rect
        x="2"
        y="47"
        width="96"
        height="8"
        fill="#0c1c3e"
      />
      {/* Brillo superior (high-light 2D) */}
      <ellipse
        cx="34"
        cy="28"
        rx="14"
        ry="8"
        fill="url(#pokeball-shine)"
      />
      {/* Botón central */}
      <circle
        cx="50"
        cy="51"
        r="11"
        fill="#0c1c3e"
      />
      <circle
        cx="50"
        cy="51"
        r="8"
        fill="url(#pokeball-button)"
        stroke="#0c1c3e"
        strokeWidth="1.5"
      />
      <circle
        cx="47"
        cy="48"
        r="2.5"
        fill="#FFF8E0"
        opacity="0.85"
      />
      {/* Reflejo inferior sutil */}
      <ellipse
        cx="50"
        cy="86"
        rx="22"
        ry="3"
        fill="#000000"
        opacity="0.15"
      />
    </svg>
  );
}