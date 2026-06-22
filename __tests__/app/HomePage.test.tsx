import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import HomePage from "@/src/app/page";

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

    // Orden visual: ash → pokedex → slider
    const order =
      ash.compareDocumentPosition(pokedex) & Node.DOCUMENT_POSITION_FOLLOWING;
    expect(order).toBeTruthy();
    const order2 =
      pokedex.compareDocumentPosition(slider) & Node.DOCUMENT_POSITION_FOLLOWING;
    expect(order2).toBeTruthy();
  });

  it("la zona inferior contiene el botón de sonido y el botón PRESS START", () => {
    render(<HomePage />);
    const bottom = screen.getByTestId("home-zone-bottom");

    const sound = within(bottom).getByRole("button", { name: /sonido/i });
    const pressStart = within(bottom).getByRole("button", {
      name: /press start/i,
    });

    expect(sound).toBeInTheDocument();
    expect(pressStart).toBeInTheDocument();
  });

  it("el contenedor raíz ocupa exactamente la pantalla y no permite scroll", () => {
    const { container } = render(<HomePage />);
    const root = container.firstChild as HTMLElement;
    // Ocupa el viewport completo
    expect(root).toHaveClass("h-dvh");
    expect(root).toHaveClass("w-screen");
    // No genera scroll ni vertical ni horizontal
    expect(root).toHaveClass("overflow-hidden");
  });

  it("incluye el AnimatedBackground como capa fija tras el contenido principal", () => {
    const { container } = render(<HomePage />);
    const bg = container.querySelector(
      '[data-testid="animated-background"]',
    );
    expect(bg).not.toBeNull();
  });
});