import type { ReactNode } from "react";
import type { SlotName } from "./slots";
import { hasSlotContent } from "./slots";

/**
 * Plan 05.1 / 05.2 — Inyecta el contenido de un slot dentro del
 * perímetro de su capa en el SVG.
 *
 * Estrategia:
 *   - El `<g data-slot>` se renderiza SIEMPRE (aunque el slot no
 *     tenga contenido inyectable). Esto da un DOM estable para
 *     tests E2E y permite consultar `document.querySelector(
 *     '[data-slot="FOO"]')` aunque la capa esté vacía.
 *   - Si el slot no tiene contenido renderizable, se omite el
 *     `<foreignObject>` (mantiene el árbol ligero y respeta la
 *     condición "no slot vacío" en tests de Fase 05.1/05.2 que
 *     cuentan `foreignObject`).
 *   - Si el slot tiene contenido, se monta un `<foreignObject>`
 *     ajustado al rectángulo de la capa y dentro se renderiza el
 *     `ReactNode` envuelto en un `<div>` que ocupa el 100% del
 *     espacio (`xmlns="http://www.w3.org/1999/xhtml"`).
 */
export interface SlotLayerProps {
  slot: SlotName;
  /** Posición y tamaño del rectángulo invisible de la capa. */
  x: number;
  y: number;
  width: number;
  height: number;
  content: ReactNode;
}

export function SlotLayer({ slot, x, y, width, height, content }: SlotLayerProps) {
  return (
    <g data-slot={slot}>
      {hasSlotContent(content) ? (
        <foreignObject x={x} y={y} width={width} height={height}>
          <div
            style={{
              width: "100%",
              height: "100%",
              overflow: "hidden",
              // `position: relative` para que los descendientes con
              // `position: absolute` se posicionen respecto a este
              // contenedor y NO respecto al viewport. Importante
              // desde Plan 11: el overlay del carrusel usa
              // `position: absolute; inset: 0` y debe quedarse dentro
              // del slot del carrusel, no tapar otros slots como
              // `SONIDO_POKEMON` o `BOTONES_CARRUSEL`.
              position: "relative",
            }}
          >
            {content}
          </div>
        </foreignObject>
      ) : null}
    </g>
  );
}