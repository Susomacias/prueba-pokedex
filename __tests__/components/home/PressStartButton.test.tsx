import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PressStartButton } from "@/src/components/home/PressStartButton";

/**
 * Plan 03.4 — TDD del botón PRESS START de la pantalla de inicio.
 *
 * Comportamiento esperado:
 *   - Botón accesible (`aria-label` descriptivo).
 *   - Focusable y navegable por teclado (Enter / Espacio activan `onClick`).
 *   - Anima con efecto pulsante (scale + glow) por defecto.
 *   - Cuando `prefers-reduced-motion: reduce`, la animación se desactiva.
 *   - Acepta `onClick` externo para integrarse con la navegación del Plan 03.5.
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

describe("PressStartButton (Plan 03.4)", () => {
  beforeEach(() => {
    setupMatchMedia();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renderiza un botón con texto PRESS START y aria-label descriptivo", () => {
    render(<PressStartButton />);
    const button = screen.getByRole("button", { name: /press start/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent(/press start/i);
  });

  it("es focusable y se activa con teclado (Enter y Space)", async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    render(<PressStartButton onActivate={onActivate} />);
    const button = screen.getByRole("button", { name: /press start/i });

    button.focus();
    expect(document.activeElement).toBe(button);

    await user.keyboard("{Enter}");
    expect(onActivate).toHaveBeenCalledTimes(1);

    await user.keyboard(" ");
    expect(onActivate).toHaveBeenCalledTimes(2);
  });

  it("reacciona al click de ratón", async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    render(<PressStartButton onActivate={onActivate} />);

    await user.click(screen.getByRole("button", { name: /press start/i }));
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it("aplica la clase de animación pulsante por defecto", () => {
    const { container } = render(<PressStartButton />);
    const button = container.querySelector(
      '[data-testid="home-press-start"]',
    ) as HTMLElement | null;
    expect(button).not.toBeNull();
    // La utilidad que define la animación pulsante
    expect(button!.className).toMatch(/animate-press-start-pulse/);
  });

  it("tiene una sombra/borde estilo arcade (bisel) y tamaño de botón primario", () => {
    const { container } = render(<PressStartButton />);
    const button = container.querySelector(
      '[data-testid="home-press-start"]',
    ) as HTMLElement;
    expect(button.className).toMatch(/border-/); // borde arcade
    expect(button.className).toMatch(/shadow-/); // bisel / drop-shadow
  });

  it("el texto usa la fuente Press Start 2P", () => {
    render(<PressStartButton />);
    const button = screen.getByRole("button", { name: /press start/i });
    expect(button.className).toMatch(/font-pixel/);
  });

  it("anuncia el foco con un outline visible accesible (focus-visible)", () => {
    const { container } = render(<PressStartButton />);
    const button = container.querySelector(
      '[data-testid="home-press-start"]',
    ) as HTMLElement;
    expect(button.className).toMatch(/focus-visible:/);
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
    const button = container.querySelector(
      '[data-testid="home-press-start"]',
    ) as HTMLElement | null;
    expect(button).not.toBeNull();
    // La utilidad de Tailwind que añade la animación no debe estar
    expect(button!.className).not.toMatch(/animate-press-start-pulse/);
  });
});
