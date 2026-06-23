import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PokemonListCard } from "@/src/components/pokedex/list/PokemonListCard";
import type { PokemonListItem } from "@/src/lib/types/pokemon";

/** Recupera el chip cuyo `data-chip` coincide con `kind`. */
function chipByKind(container: HTMLElement, kind: string): HTMLElement {
  const el = container.querySelector<HTMLElement>(`[data-chip="${kind}"]`);
  if (!el) throw new Error(`chip con data-chip="${kind}" no encontrado`);
  return el;
}

/**
 * Plan 06.2 — TDD de la card individual de la lista.
 *
 * Cobertura:
 *  - Render del nombre, miniatura y 4 chips (tipo1, tipo2, hábitat,
 *    generación).
 *  - Los chips de tipo tienen los colores correctos por tipo.
 *  - El handler `onSelect` se invoca con el `name` al pulsar la card.
 *  - Estado visual `data-selected` cuando coincide con `selectedName`.
 *  - Sin `spriteFront` no se renderiza el `<Image>` (fallback).
 *  - Card es un `<button>` accesible (no `<div>` con `role`).
 *  - Sin emojis (cumple regla del proyecto).
 */

const SAMPLE_ITEM: PokemonListItem = {
  id: 6,
  name: "charizard",
  height: 17,
  weight: 905,
  spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/6.png",
  types: [
    { slot: 1, name: "fire" },
    { slot: 2, name: "flying" },
  ],
  habitat: "montana",
  generation: "generation-i",
};

const NO_TYPES_ITEM: PokemonListItem = {
  ...SAMPLE_ITEM,
  id: 1,
  name: "bulbasaur",
  spriteFront: null,
  types: [{ slot: 1, name: "grass" }],
  habitat: "pradera",
  generation: "generation-i",
};

describe("PokemonListCard (Plan 06.2)", () => {
  it("renderiza nombre, miniatura y 4 chips (tipo1, tipo2, hábitat, generación)", () => {
    const { container } = render(<PokemonListCard item={SAMPLE_ITEM} index={1} />);

    expect(screen.getByText("charizard")).toBeInTheDocument();

    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img!.getAttribute("src")).toContain("6.png");

    const chips = screen.getAllByTestId("pokemon-list-card-chip");
    // tipo1 + tipo2 + habitat + generacion = 4
    expect(chips).toHaveLength(4);
    expect(chips.map((c) => c.textContent)).toEqual(["Fuego", "Volador", "montaña", "gen I"]);
  });

  it("cuando sólo hay 1 tipo, renderiza 3 chips (tipo1 + habitat + generacion)", () => {
    render(<PokemonListCard item={NO_TYPES_ITEM} index={1} />);

    const chips = screen.getAllByTestId("pokemon-list-card-chip");
    expect(chips).toHaveLength(3);
    expect(chips.map((c) => c.textContent)).toEqual(["Planta", "pradera", "gen I"]);
  });

  it("los chips de tipo usan los colores de POKEMON_TYPE_COLORS", () => {
    const { container } = render(<PokemonListCard item={SAMPLE_ITEM} index={1} />);

    const fireChip = chipByKind(container, "type-fire");
    // fire: bg #FF9D55 (de pokemonTypes.ts)
    expect(fireChip.style.backgroundColor).toBe("rgb(255, 157, 85)");

    const flyingChip = chipByKind(container, "type-flying");
    // flying: bg #8FA8DD
    expect(flyingChip.style.backgroundColor).toBe("rgb(143, 168, 221)");
  });

  it("los chips de habitat y generación usan sus mapas de colores", () => {
    const { container } = render(<PokemonListCard item={SAMPLE_ITEM} index={1} />);

    // generation-i: bg #E0814A
    const genChip = chipByKind(container, "generation");
    expect(genChip.style.backgroundColor).toBe("rgb(224, 129, 74)");
    // habitat montana: usa el genérico cyanButton.dark (#126CA3) ya
    // que habitats no tienen mapa de color propio (sólo imagen).
    const habitatChip = chipByKind(container, "habitat");
    expect(habitatChip.style.backgroundColor).toBe("rgb(18, 108, 163)");
  });

  it("la card es un <button> accesible con aria-label descriptivo", () => {
    render(<PokemonListCard item={SAMPLE_ITEM} index={3} />);
    const btn = screen.getByRole("button");
    expect(btn.tagName).toBe("BUTTON");
    expect(btn.getAttribute("aria-label")).toContain("charizard");
  });

  it("pulsar la card invoca onSelect(name) sin recargar", () => {
    const onSelect = vi.fn();
    render(
      <PokemonListCard item={SAMPLE_ITEM} index={1} onSelect={onSelect} />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledWith("charizard");
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("marca data-selected='true' cuando coincide con selectedName", () => {
    render(
      <PokemonListCard item={SAMPLE_ITEM} index={1} selectedName="charizard" />,
    );
    expect(screen.getByTestId("pokemon-list-card").getAttribute("data-selected")).toBe("true");
  });

  it("data-selected='false' cuando selectedName es null u otro nombre", () => {
    const { rerender } = render(
      <PokemonListCard item={SAMPLE_ITEM} index={1} />,
    );
    expect(screen.getByTestId("pokemon-list-card").getAttribute("data-selected")).toBe("false");

    rerender(<PokemonListCard item={SAMPLE_ITEM} index={1} selectedName="pikachu" />);
    expect(screen.getByTestId("pokemon-list-card").getAttribute("data-selected")).toBe("false");
  });

  it("sin spriteFront no renderiza <img> (fallback sin miniatura)", () => {
    render(<PokemonListCard item={NO_TYPES_ITEM} index={1} />);
    expect(screen.queryByRole("img", { hidden: true })).toBeNull();
  });

  it("no contiene emojis en su contenido textual", () => {
    render(<PokemonListCard item={SAMPLE_ITEM} index={1} />);
    const card = screen.getByTestId("pokemon-list-card");
    // Filtra caracteres emoji y símbolos típicos que NO usamos.
    const emojiRegex = /[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{27BF}]/u;
    expect(emojiRegex.test(card.textContent ?? "")).toBe(false);
  });
});