"use client";

import type { CSSProperties } from "react";

/**
 * Plan 06.4 — `CarouselDots`: LEDs del slot `PUNTOS_CARRUSEL`.
 *
 * Un LED por slide. Apagado = gris oscuro, encendido = verde brillante
 * con un `box-shadow` sutil (no potente — el borrador pide discreción).
 *
 * Click en un LED navega a esa slide (`onSelect(index)`).
 *
 * Accesibilidad: cada LED es un `<button>` con `aria-label="Diapositiva N"`
 * y `aria-pressed` para lectores de pantalla.
 */

export interface CarouselDotsProps {
  /** Número total de slides. */
  count: number;
  /** Índice de la slide activa (0-based). */
  activeIndex: number;
  /** Handler al pulsar un LED. */
  onSelect(index: number): void;
}

export function CarouselDots({ count, activeIndex, onSelect }: CarouselDotsProps) {
  if (count <= 0) return null;
  return (
    <div className="carousel-dots" role="tablist" aria-label="Posición del carrusel">
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          role="tab"
          data-testid="carousel-dot"
          data-active={i === activeIndex ? "true" : "false"}
          aria-label={`Diapositiva ${i + 1}`}
          aria-selected={i === activeIndex}
          onClick={() => onSelect(i)}
          className="carousel-dot"
        />
      ))}
    </div>
  );
}

/** Helper opcional: estilos inline si el caller quiere controlar tamaño. */
export function dotStyle(active: boolean, sizePx: number = 7): CSSProperties {
  return {
    width: `${sizePx}px`,
    height: `${sizePx}px`,
    borderRadius: "50%",
    backgroundColor: active ? "#75D984" : "#3A3543",
    border: "1px solid #1d1d1b",
    boxShadow: active ? "0 0 4px rgba(117, 217, 132, 0.6)" : "none",
    cursor: "pointer",
    padding: 0,
  };
}