import { describe, it, expect } from "vitest";
import { GENERATIONS, type Generation } from "@/src/lib/types/pokemon";
import { POKEMON_GENERATION_COLORS } from "@/src/lib/constants/pokemonGenerations";

describe("POKEMON_GENERATION_COLORS", () => {
  it("tiene una entrada por cada generación I–IX", () => {
    expect(GENERATIONS).toHaveLength(9);

    for (const gen of GENERATIONS) {
      const entry = POKEMON_GENERATION_COLORS[gen];
      expect(entry, `falta color para la generación "${gen}"`).toBeDefined();
      expect(entry.bg).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(entry.border).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(entry.text).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it("no contiene generaciones fuera del catálogo I–IX", () => {
    const keys = (
      Object.keys(POKEMON_GENERATION_COLORS) as (Generation | "default")[]
    ).filter((key): key is Generation => key !== "default");
    for (const key of keys) {
      expect(GENERATIONS).toContain(key);
    }
    expect(keys).toHaveLength(GENERATIONS.length);
  });

  it("expone un color por defecto para generaciones no contempladas", () => {
    const fallback = POKEMON_GENERATION_COLORS.default;
    expect(fallback).toBeDefined();
    expect(fallback.bg).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});
