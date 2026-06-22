import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PokedexHorizontalSvg } from "@/src/components/pokedex/carcases/PokedexHorizontalSvg";
import { createEmptySlots } from "@/src/components/pokedex/carcases/slots";

/**
 * Plan 05.2 — TDD de la carcasa horizontal.
 *
 * Comportamiento esperado:
 *   - Renderiza el SVG estático (paths, círculos, elipse y estilos).
 *   - Mantiene el `viewBox` original ("0 0 1062.6 828.25"), que es la
 *     versión "tumbada" (ancho > alto) del SVG horizontal.
 *   - Acepta el mismo `SlotMap` que la carcasa vertical.
 *   - Inyecta el contenido de cada slot en su capa correspondiente.
 *   - Sin slots = sin <foreignObject> en el DOM.
 */
describe("PokedexHorizontalSvg (Plan 05.2)", () => {
  it("renderiza un <svg> con el viewBox horizontal original", () => {
    const { container } = render(<PokedexHorizontalSvg slots={createEmptySlots()} />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute("viewBox")).toBe("0 0 1062.6 828.25");
  });

  it("renderiza la carcasa (paths, círculos y ellipse) aunque no haya slots con contenido", () => {
    const { container } = render(<PokedexHorizontalSvg slots={createEmptySlots()} />);
    expect(container.querySelectorAll("path").length).toBeGreaterThan(0);
    expect(container.querySelectorAll("circle").length).toBeGreaterThan(0);
    expect(container.querySelectorAll("ellipse").length).toBeGreaterThan(0);
    expect(container.querySelector("foreignObject")).toBeNull();
  });

  it("inyecta el contenido de un slot dentro del perímetro de su capa (foreignObject)", () => {
    const slots = createEmptySlots();
    slots.CARRUSEL_IMAGENES_DESCRIPCION = (
      <p data-testid="carousel-content">imagen</p>
    );

    const { container } = render(<PokedexHorizontalSvg slots={slots} />);
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

  it("acepta el mismo SlotMap que la carcasa vertical (mismo SlotName)", () => {
    const slots = createEmptySlots();
    slots.BOTON_3D = <span data-testid="boton-3d">3D</span>;
    slots.STATS = <div data-testid="stats">stats</div>;
    slots.EVOLUCIONES = <section data-testid="evos">evos</section>;

    render(<PokedexHorizontalSvg slots={slots} />);

    const stats = screen.getByTestId("stats");
    const evos = screen.getByTestId("evos");
    expect(stats.closest("[data-slot]")?.getAttribute("data-slot")).toBe("STATS");
    expect(evos.closest("[data-slot]")?.getAttribute("data-slot")).toBe("EVOLUCIONES");
  });

  it("no renderiza un <foreignObject> cuando todos los slots están vacíos", () => {
    const { container } = render(<PokedexHorizontalSvg slots={createEmptySlots()} />);
    expect(container.querySelector("foreignObject")).toBeNull();
  });

  it("mantiene las clases de estilo originales (.st0, .st1, ...) aplicadas a la carcasa", () => {
    const { container } = render(<PokedexHorizontalSvg slots={createEmptySlots()} />);
    expect(container.querySelector(".st0")).not.toBeNull();
    expect(container.querySelector(".st1")).not.toBeNull();
    expect(container.querySelector(".st5")).not.toBeNull();
  });

  it("el SlotName es compatible entre carcases (la firma del slot es la misma)", () => {
    const sharedSlots = createEmptySlots();
    sharedSlots.CONSOLA_FILTROS = <p data-testid="shared">console</p>;

    const { container: v1 } = render(<PokedexHorizontalSvg slots={sharedSlots} />);
    const shared1 = screen.getByTestId("shared");
    expect(v1.contains(shared1)).toBe(true);

    document.body.innerHTML = "";

    const { container: v2 } = render(<PokedexHorizontalSvg slots={sharedSlots} />);
    const shared2 = screen.getByTestId("shared");
    expect(v2.contains(shared2)).toBe(true);
  });
});