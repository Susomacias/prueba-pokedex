import { describe, it, expect } from "vitest";
import {
  normalizeSearchTerm,
  splitSearchTokens,
  buildNameSearchWhere,
  buildExpandedSearchWhere,
} from "@/src/lib/graphql/where";

describe("normalizeSearchTerm", () => {
  it("pasa a minúsculas", () => {
    expect(normalizeSearchTerm("PIKACHU")).toBe("pikachu");
    expect(normalizeSearchTerm("Charmander")).toBe("charmander");
  });

  it("elimina acentos y diacríticos", () => {
    expect(normalizeSearchTerm("PÍKACHU")).toBe("pikachu");
    expect(normalizeSearchTerm("cañón")).toBe("canon");
    expect(normalizeSearchTerm(" Pokémon ")).toBe("pokemon");
  });

  it("elimina signos de puntuación y caracteres especiales", () => {
    expect(normalizeSearchTerm("pikachu!!!")).toBe("pikachu");
    expect(normalizeSearchTerm("char@mander#")).toBe("charmander");
    expect(normalizeSearchTerm("[bulbasaur]")).toBe("bulbasaur");
  });

  it("conserva espacios (para multi-palabra)", () => {
    expect(normalizeSearchTerm("Charman Pika")).toBe("charman pika");
    expect(normalizeSearchTerm("  Charman   Pika  ")).toBe("charman pika");
  });

  it("cadena vacía o sólo ruido → vacío", () => {
    expect(normalizeSearchTerm("")).toBe("");
    expect(normalizeSearchTerm("!!!")).toBe("");
    expect(normalizeSearchTerm("   ")).toBe("");
  });
});

describe("splitSearchTokens", () => {
  it("una palabra → array de 1 token", () => {
    expect(splitSearchTokens("pikachu")).toEqual(["pikachu"]);
  });

  it("multi-palabra → un token por palabra (normalizado)", () => {
    expect(splitSearchTokens("Charman Pika")).toEqual(["charman", "pika"]);
  });

  it("normaliza acentos y mayúsculas de cada token", () => {
    expect(splitSearchTokens("PÍKA Chármán")).toEqual(["pika", "charman"]);
  });

  it("vacío o ruido → array vacío", () => {
    expect(splitSearchTokens("")).toEqual([]);
    expect(splitSearchTokens("!!!")).toEqual([]);
  });
});

describe("buildNameSearchWhere — multi-palabra", () => {
  it("término simple → _ilike %term% sobre name", () => {
    expect(buildNameSearchWhere("pikachu")).toEqual({
      name: { _ilike: "%pikachu%" },
    });
  });

  it("término con acentos/mayúsculas → se normaliza", () => {
    expect(buildNameSearchWhere("PÍKACHU")).toEqual({
      name: { _ilike: "%pikachu%" },
    });
  });

  it("multi-palabra 'Charman Pika' → OR de dos _ilike sobre name", () => {
    const where = buildNameSearchWhere("Charman Pika");
    expect(where).toEqual({
      _or: [
        { name: { _ilike: "%charman%" } },
        { name: { _ilike: "%pika%" } },
      ],
    });
  });

  it("'Charman Pika' puede matchear Charmander O Pikachu (semántica OR)", () => {
    const where = buildNameSearchWhere("Charman Pika");
    // La estructura garantiza OR: cualquier nombre que contenga alguno
    // de los tokens aparece en resultados.
    expect(where).toHaveProperty("_or");
    const orClauses = (where as { _or: unknown[] })._or;
    expect(orClauses).toHaveLength(2);
  });

  it("término vacío → objeto vacío (sin cláusula)", () => {
    expect(buildNameSearchWhere("")).toEqual({});
    expect(buildNameSearchWhere("!!!")).toEqual({});
  });
});

describe("buildExpandedSearchWhere — multi-palabra", () => {
  it("un token → 4 cláusulas OR (flavor, tipo, hábitat, generación)", () => {
    const where = buildExpandedSearchWhere("fuego");
    expect(where).toHaveProperty("_or");
    const orClauses = (where as { _or: unknown[] })._or;
    // 4 campos expandidos por token
    expect(orClauses).toHaveLength(4);
  });

  it("multi-palabra 'fuego pradera' → 8 cláusulas OR (4 por token)", () => {
    const where = buildExpandedSearchWhere("fuego pradera");
    const orClauses = (where as { _or: unknown[] })._or;
    expect(orClauses).toHaveLength(8);
  });

  it("normaliza el término (acentos/mayúsculas)", () => {
    const where = buildExpandedSearchWhere("FUEGO");
    const json = JSON.stringify(where);
    expect(json).toContain("%fuego%");
  });

  it("término vacío → objeto vacío", () => {
    expect(buildExpandedSearchWhere("")).toEqual({});
  });
});
