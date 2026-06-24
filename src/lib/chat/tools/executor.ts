import { applyFiltersToList } from "@/src/lib/pokemon/fetchListFiltered";
import { fetchPokemonDetail } from "@/src/lib/pokemon/fetchDetail";
import type {
  Generation,
  Habitat,
  PokemonType,
} from "@/src/lib/types/pokemon";

export type ToolResult =
  | { success: true; data: unknown }
  | { success: false; error: string };

export interface PokedexCommand {
  action: "apply_filters" | "show_pokemon";
  payload: Record<string, unknown>;
}

export interface ToolExecutionResult {
  result: ToolResult;
  pokedexCommand?: PokedexCommand;
}

function parseType(v: unknown): PokemonType | undefined {
  if (typeof v !== "string") return undefined;
  return v as PokemonType;
}

function parseGeneration(v: unknown): Generation | undefined {
  if (typeof v !== "string") return undefined;
  return v as Generation;
}

function parseHabitat(v: unknown): Habitat | undefined {
  if (typeof v !== "string") return undefined;
  return v as Habitat;
}

async function execSearchPokemon(
  args: Record<string, unknown>,
): Promise<ToolResult> {
  try {
    const limit =
      typeof args.limit === "number" && Number.isInteger(args.limit)
        ? Math.min(Math.max(args.limit, 1), 20)
        : 5;

    const type1 = parseType(args.type);
    const generation = parseGeneration(args.generation);
    const habitat = parseHabitat(args.habitat);

    const filters: Record<string, unknown> = {};
    if (type1) filters.type1 = type1;
    if (generation) filters.generation = generation;
    if (habitat) filters.habitat = habitat;

    const search =
      typeof args.name === "string" && args.name.trim().length > 0
        ? args.name.trim()
        : undefined;

    const page = await applyFiltersToList(
      filters as never,
      0,
      { search, limit, withTotal: false },
    );

    const items = page.items.map((p) => ({
      name: p.name,
      id: p.id,
      types: p.types.map((t) => t.name),
      habitat: p.habitat,
      generation: p.generation,
    }));

    return {
      success: true,
      data: {
        items,
        total: page.total,
        hasMore: page.nextOffset !== null,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error buscando pokémons",
    };
  }
}

function formatStatsForModel(
  stats: ReadonlyArray<{ name: string; baseStat: number }>,
): string {
  return stats.map((s) => `${s.name}: ${s.baseStat}`).join(", ");
}

function formatAbilitiesForModel(
  abilities: ReadonlyArray<{ name: string; isHidden: boolean }>,
): string {
  return abilities
    .map((a) => `${a.name}${a.isHidden ? " (oculta)" : ""}`)
    .join(", ");
}

async function execGetPokemonInfo(
  args: Record<string, unknown>,
): Promise<ToolResult> {
  try {
    const name = typeof args.name === "string" ? args.name.trim() : "";
    if (!name) {
      return { success: false, error: "Nombre del pokémon requerido" };
    }

    const detail = await fetchPokemonDetail(name.toLowerCase());

    const data = {
      name: detail.name,
      id: detail.id,
      types: detail.types.map((t) => t.name),
      stats: formatStatsForModel(detail.stats),
      abilities: formatAbilitiesForModel(detail.abilities),
      height: detail.height !== null ? `${(detail.height / 10).toFixed(1)} m` : null,
      weight: detail.weight !== null ? `${(detail.weight / 10).toFixed(1)} kg` : null,
      description: detail.flavorText?.replace(/[\u000c\n]/g, " ").trim() ?? null,
      generation: detail.generation,
      habitat: detail.habitat,
      isLegendary: detail.isLegendary,
      isMythical: detail.isMythical,
      evolutions: detail.evolutionChain.map((e) => ({
        name: e.name,
        id: e.id,
        trigger: e.evolutionDetail?.trigger ?? null,
        minLevel: e.evolutionDetail?.minLevel ?? null,
      })),
      baseExperience: detail.baseExperience,
      captureRate: detail.captureRate,
    };

    return { success: true, data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error obteniendo info";
    return { success: false, error: msg };
  }
}

function extractWikipediaParagraphs(html: string): string {
  const bodyMatch = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html);
  const content = bodyMatch ? bodyMatch[1] : html;

  const paragraphs: string[] = [];
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let match: RegExpExecArray | null;

  while ((match = pRegex.exec(content)) !== null) {
    const text = match[1]
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
      .replace(/\s+/g, " ")
      .trim();

    if (text.length > 30) {
      paragraphs.push(text);
    }
  }

  if (paragraphs.length === 0) {
    paragraphs.push(
      "El Profesor Oak es el científico Pokémon más reconocido del mundo, " +
        "con su laboratorio en Pueblo Paleta, región Kanto.",
    );
  }

  return paragraphs.slice(0, 5).join("\n\n");
}

async function execGetOakInfo(): Promise<ToolResult> {
  try {
    const res = await fetch(
      "https://es.wikipedia.org/wiki/Profesor_Oak",
      { next: { revalidate: 86400 } },
    );

    if (!res.ok) {
      return {
        success: false,
        error: `Wikipedia respondió con HTTP ${res.status}`,
      };
    }

    const html = await res.text();
    const text = extractWikipediaParagraphs(html);

    return {
      success: true,
      data: { text },
    };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Error al consultar Wikipedia",
    };
  }
}

function execApplyFilters(
  args: Record<string, unknown>,
): ToolExecutionResult {
  const payload: Record<string, unknown> = {};
  if (args.type1 !== undefined) payload.type1 = args.type1;
  if (args.type2 !== undefined) payload.type2 = args.type2;
  if (args.generation !== undefined) payload.generation = args.generation;
  if (args.habitat !== undefined) payload.habitat = args.habitat;

  return {
    result: {
      success: true,
      data: { filtersApplied: payload },
    },
    pokedexCommand: {
      action: "apply_filters",
      payload,
    },
  };
}

function execShowPokemon(
  args: Record<string, unknown>,
): ToolExecutionResult {
  const name = typeof args.name === "string" ? args.name.trim() : "";

  return {
    result: {
      success: true,
      data: { pokemon: name },
    },
    pokedexCommand: {
      action: "show_pokemon",
      payload: { name },
    },
  };
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  switch (name) {
    case "search_pokemon": {
      const result = await execSearchPokemon(args);
      return { result };
    }
    case "get_pokemon_info": {
      const result = await execGetPokemonInfo(args);
      return { result };
    }
    case "get_oak_info": {
      const result = await execGetOakInfo();
      return { result };
    }
    case "apply_filters":
      return execApplyFilters(args);
    case "show_pokemon":
      return execShowPokemon(args);
    default:
      return {
        result: {
          success: false,
          error: `Herramienta desconocida: ${name}`,
        },
      };
  }
}

export function getToolResultForModel(
  _name: string,
  result: ToolResult,
): string {
  return JSON.stringify(result);
}
