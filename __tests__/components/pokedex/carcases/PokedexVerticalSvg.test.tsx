import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PokedexVerticalSvg } from "@/src/components/pokedex/carcases/PokedexVerticalSvg";
import { createEmptySlots } from "@/src/components/pokedex/carcases/slots";

/**
 * Plan 05.1 — TDD de la carcasa vertical.
 *
 * Comportamiento esperado:
 *   - Renderiza el SVG estático (paths, círculos y estilos inline).
 *   - Mantiene el `viewBox` original ("0 0 828.25 1062.6").
 *   - Acepta un mapa de slots tipado y, cuando se le pasa un nodo, lo
 *     coloca dentro del perímetro de la capa correspondiente.
 *   - Las capas no documentadas como slots inyectables (CARCASA) se
 *     siguen renderizando pero no aceptan contenido.
 *   - Sin slots = sin <foreignObject> en el DOM.
 */
describe("PokedexVerticalSvg (Plan 05.1)", () => {
  it("renderiza un <svg> con el viewBox vertical original", () => {
    const { container } = render(<PokedexVerticalSvg slots={createEmptySlots()} />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute("viewBox")).toBe("0 0 828.25 1062.6");
  });

  it("renderiza la carcasa (paths y círculos) aunque no haya slots con contenido", () => {
    const { container } = render(<PokedexVerticalSvg slots={createEmptySlots()} />);
    expect(container.querySelectorAll("path").length).toBeGreaterThan(0);
    expect(container.querySelectorAll("circle").length).toBeGreaterThan(0);
    expect(container.querySelector("foreignObject")).toBeNull();
  });

  it("inyecta el contenido de un slot dentro del perímetro de su capa (foreignObject)", () => {
    const slots = createEmptySlots();
    slots.CARRUSEL_IMAGENES_DESCRIPCION = (
      <p data-testid="carousel-content">imagen</p>
    );

    const { container } = render(<PokedexVerticalSvg slots={slots} />);
    const content = screen.getByTestId("carousel-content");
    expect(content).toBeInTheDocument();
    expect(container.querySelectorAll("foreignObject").length).toBe(1);

    let parent: Element | null = content.parentElement;
    let foundForeignObject: Element | null = null;
    while (parent && parent !== container) {
      if (parent.tagName.toLowerCase() === "foreignobject") {
        foundForeignObject = parent;
        break;
      }
      parent = parent.parentElement;
    }
    expect(foundForeignObject).not.toBeNull();
    const group = foundForeignObject!.parentElement;
    expect(group?.tagName.toLowerCase()).toBe("g");
    expect(group?.getAttribute("data-slot")).toBe("CARRUSEL_IMAGENES_DESCRIPCION");
  });

  it("acepta contenido en cualquier slot declarado y lo asocia a su capa", () => {
    const slots = createEmptySlots();
    slots.BOTON_3D = <button type="button">3D</button>;
    slots.STATS = <div data-testid="stats-layer">stats</div>;

    render(<PokedexVerticalSvg slots={slots} />);
    const stats = screen.getByTestId("stats-layer");
    const statsGroup = stats.closest("g");
    expect(statsGroup?.getAttribute("data-slot")).toBe("STATS");
  });

  it("no renderiza un <foreignObject> para slots cuyo contenido sea null/undefined/false", () => {
    const slots = createEmptySlots();
    slots.CARRUSEL_IMAGENES_DESCRIPCION = null;
    slots.STATS = undefined;

    const { container } = render(<PokedexVerticalSvg slots={slots} />);
    expect(container.querySelector("foreignObject")).toBeNull();
  });

  it("mantiene las clases de estilo originales (.st0, .st1, ...) aplicadas a la carcasa", () => {
    const { container } = render(<PokedexVerticalSvg slots={createEmptySlots()} />);
    expect(container.querySelector(".st0")).not.toBeNull();
    expect(container.querySelector(".st1")).not.toBeNull();
    expect(container.querySelector(".st5")).not.toBeNull();
  });
});