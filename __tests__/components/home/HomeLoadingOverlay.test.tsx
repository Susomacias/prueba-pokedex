import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { HomeLoadingOverlay } from "@/src/components/home/HomeLoadingOverlay";

/**
 * Plan 03.5 — TDD del overlay de "CARGANDO…" con pikachu.
 *
 * Comportamiento esperado:
 *   - Mientras `isLoading` es false, NO renderiza nada.
 *   - Mientras `isLoading` es true, renderiza el gif del pikachu, el
 *     texto "CARGANDO…" en Press Start 2P y marca el contenedor como
 *     región `role="status"` (live polite) para que los lectores de
 *     pantalla anuncien el cambio.
 *   - Es una capa fija (`fixed inset-0`) que tapa la pantalla de
 *     inicio mientras la navegación no haya completado.
 */

describe("HomeLoadingOverlay (Plan 03.5)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("no renderiza nada mientras isLoading es false", () => {
    const { container } = render(<HomeLoadingOverlay isLoading={false} />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText(/cargando/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renderiza el gif del pikachu y el texto 'CARGANDO…' cuando isLoading es true", () => {
    const { container } = render(<HomeLoadingOverlay isLoading={true} />);

    const gif = container.querySelector(
      'img[src="/loading-pikachu.gif"]',
    ) as HTMLImageElement | null;
    expect(gif).not.toBeNull();
    // El gif es decorativo: oculto a tecnología de asistencia.
    expect(gif).toHaveAttribute("aria-hidden", "true");

    expect(screen.getByText(/cargando/i)).toBeInTheDocument();
  });

  it("expone una región aria-live='polite' con role='status' para accesibilidad", () => {
    render(<HomeLoadingOverlay isLoading={true} />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveAttribute("aria-busy", "true");
  });

  it("usa la fuente Press Start 2P en el texto", () => {
    render(<HomeLoadingOverlay isLoading={true} />);
    const text = screen.getByText(/cargando/i);
    expect(text.className).toMatch(/font-pixel/);
  });

  it("cubre toda la pantalla (fixed inset-0) sin scroll", () => {
    const { container } = render(<HomeLoadingOverlay isLoading={true} />);
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveClass("fixed");
    expect(root).toHaveClass("inset-0");
  });
});
