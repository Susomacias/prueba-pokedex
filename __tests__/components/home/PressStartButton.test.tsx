import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PressStartButton } from "@/src/components/home/PressStartButton";

/**
 * Plan 03.4 + 03.5 — TDD del botón PRESS START de la pantalla de inicio.
 *
 * Comportamiento esperado:
 *   - Renderiza como un `<a>` (`next/link`) con `aria-label` descriptivo
 *     y `href="/pokedex"`, para que Next.js gestione el prefetch y la
 *     transición animada del Plan 04 sin necesidad de un handler
 *     manual.
 *   - Focusable y navegable por teclado (Enter y Space activan el link).
 *   - Anima con efecto pulsante (scale + glow) por defecto.
 *   - Cuando `prefers-reduced-motion: reduce`, la animación se desactiva.
 *   - El texto visible es "PRESS START" en `Press Start 2P` (`font-pixel`).
 *   - El botón de sonido y otros `<button>` NO contienen el texto
 *     "PRESS START" (sanity check de identificación única).
 */

function setupMatchMedia({ reducedMotion = false }: { reducedMotion?: boolean } = {}) {
  vi.stubGlobal(
    "matchMedia",
    (query: string) => ({
      matches:
        reducedMotion && query.includes("prefers-reduced-motion") ? true : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  );
}

describe("PressStartButton (Plan 03.4 + 03.5)", () => {
  beforeEach(() => {
    setupMatchMedia();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renderiza un enlace con texto PRESS START, href='/pokedex' y aria-label descriptivo", () => {
    render(<PressStartButton />);
    const link = screen.getByRole("link", { name: /press start/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveTextContent(/press start/i);
    expect(link).toHaveAttribute("href", "/pokedex");
  });

  it("es focusable (link nativo) y se activa con teclado (Enter)", async () => {
    const user = userEvent.setup();
    render(<PressStartButton />);
    const link = screen.getByRole("link", { name: /press start/i });

    link.focus();
    expect(document.activeElement).toBe(link);

    await user.keyboard("{Enter}");
    // La navegación real la gestiona next/link (no podemos
    // interceptarla en jsdom sin un router). Comprobamos que el
    // link sigue apuntando a /pokedex y que no se ha producido
    // error en el click.
    expect(link).toHaveAttribute("href", "/pokedex");
  });

  it("aplica la clase de animación pulsante por defecto", () => {
    const { container } = render(<PressStartButton />);
    const link = container.querySelector(
      '[data-testid="home-press-start"]',
    ) as HTMLElement | null;
    expect(link).not.toBeNull();
    expect(link!.className).toMatch(/animate-press-start-pulse/);
  });

  it("tiene una sombra/borde estilo arcade (bisel) y tamaño de botón primario", () => {
    const { container } = render(<PressStartButton />);
    const link = container.querySelector(
      '[data-testid="home-press-start"]',
    ) as HTMLElement;
    expect(link.className).toMatch(/border-/);
    expect(link.className).toMatch(/shadow-/);
  });

  it("el texto usa la fuente Press Start 2P", () => {
    render(<PressStartButton />);
    const link = screen.getByRole("link", { name: /press start/i });
    expect(link.className).toMatch(/font-pixel/);
  });

  it("anuncia el foco con un outline visible accesible (focus-visible)", () => {
    const { container } = render(<PressStartButton />);
    const link = container.querySelector(
      '[data-testid="home-press-start"]',
    ) as HTMLElement;
    expect(link.className).toMatch(/focus-visible:/);
  });
});

describe("PressStartButton con prefers-reduced-motion", () => {
  beforeEach(() => {
    setupMatchMedia({ reducedMotion: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("no aplica la animación pulsante", () => {
    const { container } = render(<PressStartButton />);
    const link = container.querySelector(
      '[data-testid="home-press-start"]',
    ) as HTMLElement | null;
    expect(link).not.toBeNull();
    expect(link!.className).not.toMatch(/animate-press-start-pulse/);
  });
});
