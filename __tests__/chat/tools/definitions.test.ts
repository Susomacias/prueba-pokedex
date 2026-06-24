import { describe, expect, it } from "vitest";
import { validateToolArgs, TOOL_DEFINITIONS } from "@/src/lib/chat/tools/definitions";

describe("tool definitions", () => {
  it("cada herramienta tiene los campos requeridos en formato OpenAI", () => {
    for (const tool of TOOL_DEFINITIONS) {
      expect(tool).toHaveProperty("type", "function");
      expect(tool.function).toHaveProperty("name");
      expect(typeof tool.function.name).toBe("string");
      expect(tool.function).toHaveProperty("description");
      expect(tool.function).toHaveProperty("parameters");
    }
  });

  it("las 5 herramientas están definidas", () => {
    const names = TOOL_DEFINITIONS.map((t) => t.function.name);
    expect(names).toContain("search_pokemon");
    expect(names).toContain("get_pokemon_info");
    expect(names).toContain("get_oak_info");
    expect(names).toContain("apply_filters");
    expect(names).toContain("show_pokemon");
  });
});

describe("validateToolArgs", () => {
  describe("search_pokemon", () => {
    it("acepta argumentos correctos", () => {
      const r = validateToolArgs("search_pokemon", {
        type: "fire",
        limit: 5,
      });
      expect(r.valid).toBe(true);
    });

    it("acepta búsqueda vacía (todos opcionales)", () => {
      const r = validateToolArgs("search_pokemon", {});
      expect(r.valid).toBe(true);
    });

    it("rechaza type inválido", () => {
      const r = validateToolArgs("search_pokemon", { type: "galaxia" });
      expect(r.valid).toBe(false);
      if (!r.valid) {
        expect(r.error).toContain("type");
        expect(r.example).toBeDefined();
      }
    });

    it("rechaza generation inválida", () => {
      const r = validateToolArgs("search_pokemon", {
        generation: "generation-x",
      });
      expect(r.valid).toBe(false);
      if (!r.valid) expect(r.error).toContain("generation");
    });

    it("rechaza habitat inválido", () => {
      const r = validateToolArgs("search_pokemon", { habitat: "espacio" });
      expect(r.valid).toBe(false);
      if (!r.valid) expect(r.error).toContain("habitat");
    });

    it("rechaza name vacío", () => {
      const r = validateToolArgs("search_pokemon", { name: "" });
      expect(r.valid).toBe(false);
      if (!r.valid) expect(r.error).toContain("name");
    });

    it("rechaza limit fuera de rango", () => {
      const rMin = validateToolArgs("search_pokemon", { limit: 0 });
      expect(rMin.valid).toBe(false);
      if (!rMin.valid) expect(rMin.error).toContain("limit");

      const rMax = validateToolArgs("search_pokemon", { limit: 21 });
      expect(rMax.valid).toBe(false);
      if (!rMax.valid) expect(rMax.error).toContain("limit");
    });

    it("acepta limit en el límite superior (20)", () => {
      const r = validateToolArgs("search_pokemon", { limit: 20 });
      expect(r.valid).toBe(true);
    });

    it("acepta limit en el límite inferior (1)", () => {
      const r = validateToolArgs("search_pokemon", { limit: 1 });
      expect(r.valid).toBe(true);
    });

    it("rechaza tipos no-string para name", () => {
      const r = validateToolArgs("search_pokemon", { name: 123 });
      expect(r.valid).toBe(false);
    });

    it("rechaza limit no entero", () => {
      const r = validateToolArgs("search_pokemon", { limit: 3.5 });
      expect(r.valid).toBe(false);
    });

    it("acepta generation válida", () => {
      const r = validateToolArgs("search_pokemon", {
        generation: "generation-i",
      });
      expect(r.valid).toBe(true);
    });

    it("acepta habitat válido", () => {
      const r = validateToolArgs("search_pokemon", { habitat: "bosque" });
      expect(r.valid).toBe(true);
    });

    it("devuelve ejemplo con argumentos correctos en el error", () => {
      const r = validateToolArgs("search_pokemon", { type: "galaxia" });
      expect(r.valid).toBe(false);
      if (!r.valid) {
        expect(r.example).toBeDefined();
      }
    });
  });

  describe("get_pokemon_info", () => {
    it("acepta name válido", () => {
      const r = validateToolArgs("get_pokemon_info", { name: "pikachu" });
      expect(r.valid).toBe(true);
    });

    it("rechaza name vacío", () => {
      const r = validateToolArgs("get_pokemon_info", { name: "" });
      expect(r.valid).toBe(false);
      if (!r.valid) expect(r.error).toContain("name");
    });

    it("rechaza name ausente", () => {
      const r = validateToolArgs("get_pokemon_info", {});
      expect(r.valid).toBe(false);
      if (!r.valid) expect(r.error).toContain("name");
    });

    it("rechaza name no-string", () => {
      const r = validateToolArgs("get_pokemon_info", { name: 42 });
      expect(r.valid).toBe(false);
    });
  });

  describe("get_oak_info", () => {
    it("acepta sin argumentos", () => {
      const r = validateToolArgs("get_oak_info", {});
      expect(r.valid).toBe(true);
    });

    it("acepta query opcional", () => {
      const r = validateToolArgs("get_oak_info", { query: "laboratorio" });
      expect(r.valid).toBe(true);
    });

    it("rechaza query no-string", () => {
      const r = validateToolArgs("get_oak_info", { query: 123 });
      expect(r.valid).toBe(false);
    });

    it("rechaza query vacío", () => {
      const r = validateToolArgs("get_oak_info", { query: "" });
      expect(r.valid).toBe(false);
    });
  });

  describe("apply_filters", () => {
    it("acepta un filtro de tipo válido", () => {
      const r = validateToolArgs("apply_filters", { type1: "fire" });
      expect(r.valid).toBe(true);
    });

    it("acepta múltiples filtros", () => {
      const r = validateToolArgs("apply_filters", {
        type1: "water",
        generation: "generation-i",
      });
      expect(r.valid).toBe(true);
    });

    it("acepta sin argumentos (todos opcionales)", () => {
      const r = validateToolArgs("apply_filters", {});
      expect(r.valid).toBe(true);
    });

    it("rechaza type1 inválido", () => {
      const r = validateToolArgs("apply_filters", { type1: "galaxia" });
      expect(r.valid).toBe(false);
      if (!r.valid) expect(r.error).toContain("type1");
    });

    it("rechaza type2 inválido", () => {
      const r = validateToolArgs("apply_filters", { type2: "oscuridad" });
      expect(r.valid).toBe(false);
      if (!r.valid) expect(r.error).toContain("type2");
    });

    it("rechaza generation inválida", () => {
      const r = validateToolArgs("apply_filters", { generation: "generacion-1" });
      expect(r.valid).toBe(false);
    });

    it("rechaza habitat inválido", () => {
      const r = validateToolArgs("apply_filters", { habitat: "desierto" });
      expect(r.valid).toBe(false);
      if (!r.valid) expect(r.error).toContain("habitat");
    });

    it("acepta habitat válido", () => {
      const r = validateToolArgs("apply_filters", { habitat: "caverna" });
      expect(r.valid).toBe(true);
    });
  });

  describe("show_pokemon", () => {
    it("acepta name válido", () => {
      const r = validateToolArgs("show_pokemon", { name: "pikachu" });
      expect(r.valid).toBe(true);
    });

    it("rechaza name vacío", () => {
      const r = validateToolArgs("show_pokemon", { name: "" });
      expect(r.valid).toBe(false);
      if (!r.valid) expect(r.error).toContain("name");
    });

    it("rechaza name ausente", () => {
      const r = validateToolArgs("show_pokemon", {});
      expect(r.valid).toBe(false);
      if (!r.valid) expect(r.error).toContain("name");
    });

    it("rechaza name no-string", () => {
      const r = validateToolArgs("show_pokemon", { name: 999 });
      expect(r.valid).toBe(false);
    });
  });

  describe("nombre de herramienta desconocido", () => {
    it("devuelve inválido para herramienta inexistente", () => {
      const r = validateToolArgs("unknown_tool", {});
      expect(r.valid).toBe(false);
      if (!r.valid) expect(r.error).toContain("unknown_tool");
    });
  });
});
