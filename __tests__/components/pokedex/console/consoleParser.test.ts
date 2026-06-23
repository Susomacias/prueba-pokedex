import { describe, it, expect } from "vitest";
import {
  parseCommand,
  resolveFilterKey,
  filterKeyToOptionKey,
  filterKeyLabel,
} from "@/src/components/pokedex/console/consoleParser";

describe("parseCommand — casos básicos", () => {
  it("entrada vacía → noop", () => {
    expect(parseCommand("")).toEqual({ kind: "noop" });
    expect(parseCommand("   ")).toEqual({ kind: "noop" });
    expect(parseCommand("\t\n")).toEqual({ kind: "noop" });
  });

  it("help / ayuda / ? → help", () => {
    expect(parseCommand("help")).toEqual({ kind: "help" });
    expect(parseCommand("ayuda")).toEqual({ kind: "help" });
    expect(parseCommand("?")).toEqual({ kind: "help" });
    // insensible a mayúsculas
    expect(parseCommand("HELP")).toEqual({ kind: "help" });
    expect(parseCommand("Help")).toEqual({ kind: "help" });
  });

  it("filtro / filtros → filters", () => {
    expect(parseCommand("filtro")).toEqual({ kind: "filters" });
    expect(parseCommand("filtros")).toEqual({ kind: "filters" });
    expect(parseCommand("filters")).toEqual({ kind: "filters" });
  });

  it("resumen / summary / estado → summary", () => {
    expect(parseCommand("resumen")).toEqual({ kind: "summary" });
    expect(parseCommand("summary")).toEqual({ kind: "summary" });
    expect(parseCommand("estado")).toEqual({ kind: "summary" });
  });

  it("limpiar / cls → clearScreen", () => {
    expect(parseCommand("limpiar")).toEqual({ kind: "clearScreen" });
    expect(parseCommand("cls")).toEqual({ kind: "clearScreen" });
  });

  it("clear / reset-filtros → clearFilters (quita TODOS los filtros)", () => {
    expect(parseCommand("clear")).toEqual({ kind: "clearFilters" });
    expect(parseCommand("reset-filtros")).toEqual({ kind: "clearFilters" });
  });
});

describe("parseCommand — options <filtro>", () => {
  it("options tipo1 → options filterKey=type1 (alias en español)", () => {
    expect(parseCommand("options tipo1")).toEqual({
      kind: "options",
      filterKey: "type1",
    });
  });

  it("options generation → options filterKey=generation", () => {
    expect(parseCommand("options generation")).toEqual({
      kind: "options",
      filterKey: "generation",
    });
  });

  it("options height → options filterKey=height (buckets estáticos)", () => {
    expect(parseCommand("options height")).toEqual({
      kind: "options",
      filterKey: "height",
    });
    expect(parseCommand("options altura")).toEqual({
      kind: "options",
      filterKey: "height",
    });
  });

  it("options sin argumento → unknown con sugerencia de help", () => {
    const cmd = parseCommand("options");
    expect(cmd.kind).toBe("unknown");
    if (cmd.kind === "unknown") {
      expect(cmd.message).toMatch(/options <filtro>/);
      expect(cmd.message).toMatch(/help/);
    }
  });

  it("options <filtro-inexistente> → unknown con sugerencia de help", () => {
    const cmd = parseCommand("options volador");
    expect(cmd.kind).toBe("unknown");
    if (cmd.kind === "unknown") {
      expect(cmd.message).toMatch(/volador/);
      expect(cmd.message).toMatch(/help/);
    }
  });

  it("options search → unknown (la búsqueda no tiene opciones)", () => {
    const cmd = parseCommand("options search");
    expect(cmd.kind).toBe("unknown");
    if (cmd.kind === "unknown") {
      expect(cmd.message).toMatch(/búsqueda/i);
    }
  });
});

describe("parseCommand — quitar <filtro>", () => {
  it("quitar tipo1 → remove filterKey=type1", () => {
    expect(parseCommand("quitar tipo1")).toEqual({
      kind: "remove",
      filterKey: "type1",
    });
  });

  it("remove habitat → remove filterKey=habitat", () => {
    expect(parseCommand("remove habitat")).toEqual({
      kind: "remove",
      filterKey: "habitat",
    });
  });

  it("quitar search → remove filterKey=search (válido: borra la búsqueda)", () => {
    expect(parseCommand("quitar search")).toEqual({
      kind: "remove",
      filterKey: "search",
    });
  });

  it("quitar sin argumento → unknown", () => {
    const cmd = parseCommand("quitar");
    expect(cmd.kind).toBe("unknown");
    if (cmd.kind === "unknown") {
      expect(cmd.message).toMatch(/quitar <filtro>/);
    }
  });

  it("quitar <filtro-inexistente> → unknown", () => {
    const cmd = parseCommand("quitar foo");
    expect(cmd.kind).toBe("unknown");
    if (cmd.kind === "unknown") {
      expect(cmd.message).toMatch(/foo/);
      expect(cmd.message).toMatch(/help/);
    }
  });
});

describe("parseCommand — <filtro> <valor> (apply)", () => {
  it("type1 fire → apply filterKey=type1 rawValue=fire", () => {
    expect(parseCommand("type1 fire")).toEqual({
      kind: "apply",
      filterKey: "type1",
      rawValue: "fire",
    });
  });

  it("tipo1 Fuego → apply (alias español + etiqueta como valor)", () => {
    expect(parseCommand("tipo1 Fuego")).toEqual({
      kind: "apply",
      filterKey: "type1",
      rawValue: "Fuego",
    });
  });

  it("generation generation-i → apply filterKey=generation", () => {
    expect(parseCommand("generation generation-i")).toEqual({
      kind: "apply",
      filterKey: "generation",
      rawValue: "generation-i",
    });
  });

  it("habitat bosque → apply filterKey=habitat", () => {
    expect(parseCommand("habitat bosque")).toEqual({
      kind: "apply",
      filterKey: "habitat",
      rawValue: "bosque",
    });
  });

  it("altura 0-1 → apply filterKey=height (bucket min-max)", () => {
    expect(parseCommand("altura 0-1")).toEqual({
      kind: "apply",
      filterKey: "height",
      rawValue: "0-1",
    });
  });

  it("<filtro> sin valor → unknown con sugerencia", () => {
    const cmd = parseCommand("type1");
    expect(cmd.kind).toBe("unknown");
    if (cmd.kind === "unknown") {
      expect(cmd.message).toMatch(/type1 <valor>/);
      expect(cmd.message).toMatch(/help|options/);
    }
  });

  it("valor con espacios se conserva entero (p. ej. color 'dark gray')", () => {
    expect(parseCommand("color dark gray")).toEqual({
      kind: "apply",
      filterKey: "color",
      rawValue: "dark gray",
    });
  });
});

describe("parseCommand — búsqueda libre <texto>", () => {
  it("texto que no es comando ni filtro → search", () => {
    expect(parseCommand("pikachu")).toEqual({
      kind: "search",
      term: "pikachu",
    });
  });

  it("búsqueda multi-palabra: 'Charman Pika' → search term='Charman Pika'", () => {
    expect(parseCommand("Charman Pika")).toEqual({
      kind: "search",
      term: "Charman Pika",
    });
  });

  it("'search Charman Pika' → search (keyword explícito)", () => {
    expect(parseCommand("search Charman Pika")).toEqual({
      kind: "search",
      term: "Charman Pika",
    });
  });

  it("buscar pikachu → search (alias 'buscar')", () => {
    expect(parseCommand("buscar pikachu")).toEqual({
      kind: "search",
      term: "pikachu",
    });
  });

  it("texto con signos y mayúsculas → search (conserva el original)", () => {
    expect(parseCommand("PÍKACHU!!!")).toEqual({
      kind: "search",
      term: "PÍKACHU!!!",
    });
  });
});

describe("parseCommand — normalización de alias", () => {
  it("commandos con acentos: 'opciónes' → options (sin tilde)", () => {
    // 'opciones' sin tilde; el parser normaliza tildes
    expect(parseCommand("opciones tipo1")).toEqual({
      kind: "options",
      filterKey: "type1",
    });
  });

  it("filtro con acento: 'generación' → generation", () => {
    expect(parseCommand("generación generation-i")).toEqual({
      kind: "apply",
      filterKey: "generation",
      rawValue: "generation-i",
    });
  });
});

describe("resolveFilterKey", () => {
  it("resuelve alias canónico", () => {
    expect(resolveFilterKey("type1")).toBe("type1");
    expect(resolveFilterKey("tipo1")).toBe("type1");
    expect(resolveFilterKey("Tipo 1")).toBe("type1");
    expect(resolveFilterKey("habilidad")).toBe("ability");
    expect(resolveFilterKey("HÁBITAT")).toBe("habitat");
  });

  it("devuelve undefined para alias desconocido", () => {
    expect(resolveFilterKey("foo")).toBeUndefined();
    expect(resolveFilterKey("")).toBeUndefined();
  });
});

describe("filterKeyToOptionKey", () => {
  it("type1 y type2 comparten 'type'", () => {
    expect(filterKeyToOptionKey("type1")).toBe("type");
    expect(filterKeyToOptionKey("type2")).toBe("type");
  });

  it("height/weight mapean a sí mismos (buckets estáticos)", () => {
    expect(filterKeyToOptionKey("height")).toBe("height");
    expect(filterKeyToOptionKey("weight")).toBe("weight");
  });

  it("search no tiene opciones (undefined)", () => {
    expect(filterKeyToOptionKey("search")).toBeUndefined();
  });
});

describe("filterKeyLabel", () => {
  it("devuelve la etiqueta en español", () => {
    expect(filterKeyLabel("type1")).toBe("Tipo 1");
    expect(filterKeyLabel("generation")).toBe("Generación");
    expect(filterKeyLabel("search")).toBe("Búsqueda");
  });
});
