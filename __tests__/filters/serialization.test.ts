import { describe, it, expect } from "vitest";
import {
  filtersToSearchParams,
  searchParamsToFilters,
  applyFilterChange,
} from "@/src/lib/filters/serialization";
import { FILTERS } from "@/src/lib/filters/types";

describe("filtersToSearchParams", () => {
  it("omite filtros con valor undefined", () => {
    const params = filtersToSearchParams({});
    expect([...params.keys()]).toEqual([]);
  });

  it("serializa type1 y type2", () => {
    const params = filtersToSearchParams({ type1: "fire", type2: "flying" });
    expect(params.get("type1")).toBe("fire");
    expect(params.get("type2")).toBe("flying");
  });

  it("serializa filtros de rango con el formato min-max", () => {
    const params = filtersToSearchParams({
      height: { value: "0-1", label: "0-1m", min: 0, max: 1 },
    });
    expect(params.get("height")).toBe("0-1");
  });

  it("incluye todos los filtros definidos cuando están presentes", () => {
    const params = filtersToSearchParams({
      type1: "fire",
      type2: "flying",
      generation: "generation-i",
      color: "red",
      habitat: "pradera",
      ability: "blaze",
      height: { value: "0-1", label: "0-1m", min: 0, max: 1 },
      weight: { value: "0-10", label: "0-10kg", min: 0, max: 10 },
    });
    expect(params.get("type1")).toBe("fire");
    expect(params.get("type2")).toBe("flying");
    expect(params.get("generation")).toBe("generation-i");
    expect(params.get("color")).toBe("red");
    expect(params.get("habitat")).toBe("pradera");
    expect(params.get("ability")).toBe("blaze");
    expect(params.get("height")).toBe("0-1");
    expect(params.get("weight")).toBe("0-10");
  });
});

describe("searchParamsToFilters", () => {
  it("parsea URLSearchParams a Filters", () => {
    const params = new URLSearchParams("type1=fire&habitat=pradera");
    const filters = searchParamsToFilters(params);
    expect(filters.type1).toBe("fire");
    expect(filters.habitat).toBe("pradera");
    expect(filters.generation).toBeUndefined();
  });

  it("parsea filtros de rango a FilterBucket", () => {
    const params = new URLSearchParams("height=0-1");
    const filters = searchParamsToFilters(params);
    expect(filters.height).toEqual({
      value: "0-1",
      label: "0-1",
      min: 0,
      max: 1,
    });
  });

  it("ignora entradas con valores vacíos", () => {
    const params = new URLSearchParams("type1=");
    const filters = searchParamsToFilters(params);
    expect(filters.type1).toBeUndefined();
  });

  it("ignora entradas con valores inválidos", () => {
    const params = new URLSearchParams("height=abc");
    const filters = searchParamsToFilters(params);
    expect(filters.height).toBeUndefined();
  });

  it("acepta un objeto plano tipo Record", () => {
    const filters = searchParamsToFilters({
      type1: "water",
      generation: "generation-ii",
      ability: undefined,
    });
    expect(filters.type1).toBe("water");
    expect(filters.generation).toBe("generation-ii");
    expect(filters.ability).toBeUndefined();
  });
});

describe("round-trip filters ↔ URLSearchParams", () => {
  for (const def of FILTERS) {
    it(`mantiene la clave ${def.key} tras serializar y parsear`, () => {
      const original = {
        [def.key]: def.parse(
          def.format(
            (def.kind === "range"
              ? { value: "0-1", label: "0-1", min: 0, max: 1 }
              : (def.key === "type1" || def.key === "type2"
                  ? "fire"
                  : def.key === "generation"
                    ? "generation-i"
                    : def.key === "habitat"
                      ? "pradera"
                      : "red")) as never,
          ),
        ),
      };

      const params = filtersToSearchParams(original as never);
      const back = searchParamsToFilters(params);

      expect(back[def.key]).toEqual(original[def.key]);
    });
  }
});

describe("applyFilterChange", () => {
  it("añade un filtro nuevo", () => {
    const next = applyFilterChange({}, "type1", "fire");
    expect(next.type1).toBe("fire");
  });

  it("reemplaza un filtro existente", () => {
    const next = applyFilterChange(
      { type1: "fire" },
      "type1",
      "water",
    );
    expect(next.type1).toBe("water");
  });

  it("elimina un filtro cuando el siguiente valor es undefined", () => {
    const next = applyFilterChange({ type1: "fire" }, "type1", undefined);
    expect(next.type1).toBeUndefined();
    expect(Object.keys(next)).not.toContain("type1");
  });

  it("no muta el objeto previo", () => {
    const prev = { type1: "fire" as const };
    const next = applyFilterChange(prev, "type1", "water");
    expect(prev.type1).toBe("fire");
    expect(next.type1).toBe("water");
  });
});
