import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import HomePage from "@/src/app/page";

vi.mock("@/src/hooks/useNavigation", () => ({
  useNavigation: () => ({
    pathname: "/",
    searchParams: new URLSearchParams(),
    router: {
      push: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    },
    subscribe: () => () => undefined,
  }),
}));

describe("HomePage layout base (Plan 03.2)", () => {
  it("renderiza las tres zonas en orden: superior (logo), media, inferior (controles)", () => {
    render(<HomePage />);

    const topZone = screen.getByTestId("home-zone-top");
    const middleZone = screen.getByTestId("home-zone-middle");
    const bottomZone = screen.getByTestId("home-zone-bottom");

    expect(topZone).toBeInTheDocument();
    expect(middleZone).toBeInTheDocument();
    expect(bottomZone).toBeInTheDocument();

    const allZones = [topZone, middleZone, bottomZone];
    for (let i = 1; i < allZones.length; i++) {
      const prev = allZones[i - 1]!.compareDocumentPosition(allZones[i]!);
      expect(prev & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it("la zona superior contiene el logo", () => {
    render(<HomePage />);
    const top = screen.getByTestId("home-zone-top");
    const logo = within(top).getByRole("img", { name: /logo/i });
    expect(logo).toHaveAttribute("src", "/pagina_inicio/logo.svg");
  });

  it("la zona media contiene ash (izquierda), pokedex cerrada (centro) y slider pokemons (derecha)", () => {
    render(<HomePage />);
    const middle = screen.getByTestId("home-zone-middle");

    const ash = within(middle).getByRole("img", { name: /ash/i });
    const pokedex = within(middle).getByRole("img", { name: /pok[eé]dex/i });
    const slider = within(middle).getByTestId("home-pokemon-slider");

    expect(ash).toBeInTheDocument();
    expect(pokedex).toBeInTheDocument();
    expect(slider).toBeInTheDocument();

    // Orden DOM: ash → pokedex → slider.
    const order =
      ash.compareDocumentPosition(pokedex) & Node.DOCUMENT_POSITION_FOLLOWING;
    expect(order).toBeTruthy();
    const order2 =
      pokedex.compareDocumentPosition(slider) & Node.DOCUMENT_POSITION_FOLLOWING;
    expect(order2).toBeTruthy();

    // La Pokédex cerrada queda visualmente AL FONDO (z-10), por
    // debajo de Ash y slider (z-20) que se pintan por delante.
    const pokedexWrapper = pokedex.closest('[aria-label="Pokédex cerrada"]');
    const ashWrapper = ash.closest('[aria-label="Ash"]');
    const sliderWrapper = slider.parentElement?.parentElement;
    expect(pokedexWrapper?.className).toMatch(/z-10/);
    expect(ashWrapper?.className).toMatch(/z-20/);
    expect(sliderWrapper?.className).toMatch(/z-20/);
  });

  it("la zona inferior contiene el botón de sonido y el botón PRESS START (como <a> navegable)", () => {
    render(<HomePage />);
    const bottom = screen.getByTestId("home-zone-bottom");

    const sound = within(bottom).getByRole("button", { name: /sonido/i });
    // En 03.5 PRESS START es un <Link> de Next.js para tener prefetch
    // y la transición nativa.
    const pressStart = within(bottom).getByRole("link", {
      name: /press start/i,
    });

    expect(sound).toBeInTheDocument();
    expect(pressStart).toBeInTheDocument();
    expect(pressStart).toHaveAttribute("href", "/pokedex");
  });

  it("el contenedor raíz ocupa exactamente la pantalla y no permite scroll", () => {
    const { container } = render(<HomePage />);
    // Plan 04.2: el árbol de providers de HomeShell ahora tiene
    // más wrappers (`AppTransitionShell` → `HomeNavController` →
    // `HomeTransitionOut`). Buscamos el div con `h-dvh w-screen
    // overflow-hidden` recorriendo los hijos en lugar de asumir
    // que es el primer hijo.
    const target = container.querySelector(
      '.h-dvh.w-screen.overflow-hidden',
    ) as HTMLElement | null;
    expect(target).not.toBeNull();
    // Ocupa el viewport completo
    expect(target).toHaveClass("h-dvh");
    expect(target).toHaveClass("w-screen");
    // No genera scroll ni vertical ni horizontal
    expect(target).toHaveClass("overflow-hidden");
  });

  it("Plan 04.2: el shell cliente de inicio envuelve la página con un HomeTransitionOut identificable", () => {
    const { container } = render(<HomePage />);
    // El HomeTransitionOut expone `data-testid="home-shell"` (Plan 04.2).
    const shell = container.querySelector('[data-testid="home-shell"]');
    expect(shell).not.toBeNull();
    // El atributo `data-leaving` debe estar presente (en "false" por
    // defecto) para que el CSS pueda activarlo al transicionar.
    expect(shell?.getAttribute("data-leaving")).toBe("false");
  });

  it("incluye el AnimatedBackground como capa fija tras el contenido principal", () => {
    const { container } = render(<HomePage />);
    const bg = container.querySelector(
      '[data-testid="animated-background"]',
    );
    expect(bg).not.toBeNull();
  });

  it("ash y slider se muestran también en móvil (no dependen solo de `sm:`)", () => {
    const { container } = render(<HomePage />);
    // Las clases Tailwind v4 se aplican literalmente. Comprobamos que
    // el contenedor de Ash y el wrapper del slider no llevan
    // `hidden` (que era el comportamiento anterior: `hidden ... sm:block`).
    const ashContainer = container.querySelector('[aria-label="Ash"]');
    const slider = container.querySelector('[data-testid="home-pokemon-slider"]');
    expect(ashContainer).not.toBeNull();
    expect(slider).not.toBeNull();
    expect(ashContainer!.className).not.toMatch(/\bhidden\b/);
    // El slider va dentro de un wrapper absoluto que NO debe estar
    // oculto en móvil (la nueva regla permite que aparezca reducido).
    const sliderWrapper = slider!.parentElement;
    expect(sliderWrapper?.className).not.toMatch(/\bhidden\b/);
  });

  it("usa tamaños relativos al viewport (`dvh`/`vw`/`clamp`) para que ash/slider/pokédex escalen sin desbordar", () => {
    const { container } = render(<HomePage />);
    const ashImage = container
      .querySelector('[aria-label="Ash"]')
      ?.querySelector("img");
    const pokedexContainer = container.querySelector('[aria-label="Pokédex cerrada"]');
    // Ash y slider usan `clamp` para escalar entre breakpoints.
    expect(ashImage?.className).toMatch(/clamp\(/);
    // La Pokédex usa `min(dvh, vw)` para limitarse al menor de los
    // dos ejes y nunca desbordar el viewport.
    expect(pokedexContainer?.className).toMatch(/min\(.*dvh/);
  });

  it("la fila inferior está separada del borde inferior (no `items-end` con `pb-0`)", () => {
    const { container } = render(<HomePage />);
    const bottom = container.querySelector(
      '[data-testid="home-zone-bottom"]',
    );
    expect(bottom).not.toBeNull();
    expect(bottom!.className).toMatch(/items-center/);
    // Asegura que hay `pb-*` para no pegar el botón al borde inferior.
    expect(bottom!.className).toMatch(/\bpb-\d/);
  });
});