import { describe, it, expect } from "vitest";
import { POKEMON_TYPES, type PokemonType } from "@/src/lib/types/pokemon";
import {
  POKEMON_TYPE_COLORS,
  POKEMON_TYPE_LABELS,
} from "@/src/lib/constants/pokemonTypes";

describe("POKEMON_TYPE_LABELS", () => {
  it("tiene una etiqueta en español para cada uno de los 18 tipos canónicos", () => {
    expect(POKEMON_TYPES).toHaveLength(18);

    for (const type of POKEMON_TYPES) {
      const label = POKEMON_TYPE_LABELS[type];
      expect(label, `falta etiqueta para el tipo "${type}"`).toBeDefined();
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it("no contiene claves fuera del catálogo canónico", () => {
    const keys = Object.keys(POKEMON_TYPE_LABELS) as PokemonType[];
    expect(keys).toHaveLength(POKEMON_TYPES.length);
    for (const key of keys) {
      expect(POKEMON_TYPES).toContain(key);
    }
  });

  it("las etiquetas son traducciones al español (no son el slug inglés en minúsculas)", () => {
    const TRANSLATED_LABELS: Record<PokemonType, string> = {
      normal: "Normal",
      fighting: "Lucha",
      flying: "Volador",
      poison: "Veneno",
      ground: "Tierra",
      rock: "Roca",
      bug: "Bicho",
      ghost: "Fantasma",
      steel: "Acero",
      fire: "Fuego",
      water: "Agua",
      grass: "Planta",
      electric: "Eléctrico",
      psychic: "Psíquico",
      ice: "Hielo",
      dragon: "Dragón",
      dark: "Siniestro",
      fairy: "Hada",
    };
    for (const type of POKEMON_TYPES) {
      expect(POKEMON_TYPE_LABELS[type]).toBe(TRANSLATED_LABELS[type]);
    }
  });
});

describe("POKEMON_TYPE_COLORS", () => {
  it("tiene una entrada por cada uno de los 18 tipos canónicos de PokeAPI", () => {
    expect(POKEMON_TYPES).toHaveLength(18);

    for (const type of POKEMON_TYPES) {
      const entry = POKEMON_TYPE_COLORS[type];
      expect(entry, `falta color para el tipo "${type}"`).toBeDefined();
      expect(entry.bg).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(entry.border).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(entry.text).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it("no contiene tipos fuera del catálogo canónico", () => {
    const keys = (
      Object.keys(POKEMON_TYPE_COLORS) as (PokemonType | "default")[]
    ).filter((key): key is PokemonType => key !== "default");
    for (const key of keys) {
      expect(POKEMON_TYPES).toContain(key);
    }
    expect(keys).toHaveLength(POKEMON_TYPES.length);
  });

  it("expone un color por defecto para tipos no contemplados", () => {
    const fallback = POKEMON_TYPE_COLORS.default;
    expect(fallback).toBeDefined();
    expect(fallback.bg).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});
