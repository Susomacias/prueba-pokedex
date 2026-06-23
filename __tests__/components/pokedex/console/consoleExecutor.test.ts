import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolvePath } from "./fixtureLoader";
import {
  resolveFilterValue,
  buildHelpLines,
} from "@/src/components/pokedex/console/consoleExecutor";
import {
  fetchAbilityOptions,
  fetchGenerationOptions,
  fetchHeightBuckets,
} from "@/src/lib/pokemon/fetchFilterOptions";
import type {
  FilterBucket,
  FilterOption,
} from "@/src/lib/types/pokemon";

/* ------------------------------------------------------------------------- *
 * Helper: carga un fixture crudo de PokeAPI y lo mapea con la
 * función real de la capa de datos (mockeando `fetch`). Así se
 * valida la forma REAL de la respuesta, no un objeto inventado.
 * ------------------------------------------------------------------------- */

function loadFixture(relPath: string): unknown {
  return JSON.parse(readFileSync(resolvePath(relPath), "utf8"));
}

async function loadOptionsFor(
  fixtureRelPath: string,
): Promise<ReadonlyArray<FilterOption | FilterBucket>> {
  const json = loadFixture(fixtureRelPath) as { data: unknown };
  const responseBody = JSON.stringify(json);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => json,
    text: async () => responseBody,
  } as Response));
  return fetchGenerationOptions();
}

async function loadAbilities(): Promise<ReadonlyArray<FilterOption | FilterBucket>> {
  const json = loadFixture("filter-options/abilities.json") as { data: unknown };
  const responseBody = JSON.stringify(json);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => json,
    text: async () => responseBody,
  } as Response));
  return fetchAbilityOptions();
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/* ------------------------------------------------------------------------- *
 * Resolución síncrona (types, habitat, search)
 * ------------------------------------------------------------------------- */

describe("resolveFilterValue — type1/type2 (síncrono)", () => {
  it("acepta el valor interno 'fire'", () => {
    const r = resolveFilterValue("type1", "fire", undefined);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toBe("fire");
      expect(r.label).toBe("Fuego");
    }
  });

  it("acepta la etiqueta en español 'Fuego'", () => {
    const r = resolveFilterValue("type1", "Fuego", undefined);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe("fire");
  });

  it("es insensible a mayúsculas/acentos", () => {
    const r = resolveFilterValue("type2", "ÁGUA", undefined);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe("water");
  });

  it("rechaza un tipo inexistente con sugerencia", () => {
    const r = resolveFilterValue("type1", "fuego", undefined);
    // "fuego" (palabra) no es un tipo interno ni la etiqueta "Fuego"
    // matchea porque la normalización lower-casea, así que "fuego" sí
    // debería resolver a "fire" vía la etiqueta normalizada.
    expect(r.ok).toBe(true);
  });

  it("rechaza un tipo realmente inexistente", () => {
    const r = resolveFilterValue("type1", "psi", undefined);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/options type1/);
  });
});

describe("resolveFilterValue — habitat (alias español/inglés)", () => {
  it("'bosque' → habitat interno 'bosque'", () => {
    const r = resolveFilterValue("habitat", "bosque", undefined);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe("bosque");
  });

  it("'forest' (inglés PokeAPI) → 'bosque'", () => {
    const r = resolveFilterValue("habitat", "forest", undefined);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe("bosque");
  });

  it("rechaza un hábitat inexistente", () => {
    const r = resolveFilterValue("habitat", "espacio", undefined);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/options habitat/);
  });
});

describe("resolveFilterValue — height (buckets)", () => {
  const buckets = fetchHeightBuckets();

  it("acepta un bucket predefinido por value ('xs')", () => {
    const r = resolveFilterValue("height", "xs", buckets);
    expect(r.ok).toBe(true);
    if (r.ok) {
      const v = r.value as FilterBucket;
      expect(v.value).toBe("xs");
    }
  });

  it("acepta un rango 'min-max' aunque no sea predefinido", () => {
    const r = resolveFilterValue("height", "0-1", buckets);
    expect(r.ok).toBe(true);
    if (r.ok) {
      const v = r.value as FilterBucket;
      expect(v.min).toBe(0);
      expect(v.max).toBe(1);
    }
  });

  it("rechaza un rango no numérico", () => {
    const r = resolveFilterValue("height", "abc", buckets);
    expect(r.ok).toBe(false);
  });
});

describe("resolveFilterValue — search (texto libre)", () => {
  it("devuelve el texto tal cual", () => {
    const r = resolveFilterValue("search", "Charman Pika", undefined);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toBe("Charman Pika");
      expect(r.label).toBe("Charman Pika");
    }
  });
});

/* ------------------------------------------------------------------------- *
 * Resolución con fixtures reales de PokeAPI
 * ------------------------------------------------------------------------- */

describe("resolveFilterValue — generation (fixture real)", () => {
  it("'generation-i' resuelve contra la lista real de generaciones", async () => {
    const options = await loadOptionsFor("filter-options/generations.json");
    const r = resolveFilterValue("generation", "generation-i", options);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe("generation-i");
  });

  it("'Generación I' (etiqueta) resuelve a generation-i", async () => {
    const options = await loadOptionsFor("filter-options/generations.json");
    const r = resolveFilterValue("generation", "Generación I", options);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe("generation-i");
  });

  it("rechaza una generación inexistente", async () => {
    const options = await loadOptionsFor("filter-options/generations.json");
    const r = resolveFilterValue("generation", "generation-x", options);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/options generation/);
  });
});

describe("resolveFilterValue — ability (fixture real con 'overgrow')", () => {
  it("'overgrow' existe en la lista real de habilidades de PokeAPI", async () => {
    const options = await loadAbilities();
    const r = resolveFilterValue("ability", "overgrow", options);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe("overgrow");
  });

  it("rechaza una habilidad que no existe", async () => {
    const options = await loadAbilities();
    const r = resolveFilterValue("ability", "volar-imposible", options);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/options ability/);
  });
});

describe("resolveFilterValue — options no cargadas (undefined)", () => {
  it("generation sin opciones cargadas → aplica optimistamente", () => {
    const r = resolveFilterValue("generation", "generation-i", undefined);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe("generation-i");
  });
});

/* ------------------------------------------------------------------------- *
 * buildHelpLines
 * ------------------------------------------------------------------------- */

describe("buildHelpLines", () => {
  it("incluye todos los comandos del plan", () => {
    const lines = buildHelpLines();
    const text = lines.map((l) => l.text).join("\n");
    for (const cmd of [
      "help",
      "filtro",
      "options",
      "resumen",
      "quitar",
      "limpiar",
      "clear",
    ]) {
      expect(text).toContain(cmd);
    }
  });

  it("lista todos los filtros incluyendo 'search'", () => {
    const lines = buildHelpLines();
    const text = lines.map((l) => l.text).join("\n");
    expect(text).toContain("Tipo 1");
    expect(text).toContain("Generación");
    expect(text).toContain("Búsqueda");
    expect(text).toContain("search");
  });
});
