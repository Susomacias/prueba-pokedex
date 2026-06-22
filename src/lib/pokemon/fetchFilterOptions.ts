import {
  GENERATIONS,
  HABITATS,
  POKEMON_TYPES,
  type FilterBucket,
  type FilterOption,
  type FilterOptionMap,
  type Generation,
  type Habitat,
  type PokemonType,
} from "@/src/lib/types/pokemon";
import { HABITAT_IMAGES } from "@/src/lib/constants/habitats";
import { request } from "@/src/lib/graphql/client";
import {
  ABILITIES_QUERY,
  COLORS_QUERY,
  FILTER_OPTIONS_QUERY,
  GENERATIONS_QUERY,
  HABITATS_QUERY,
  TYPES_QUERY,
} from "@/src/lib/graphql/queries/filterOptions.gql";
import { FILTER_CACHE } from "@/src/lib/pokemon/cacheStrategy";

/**
 * Tipos excluidos del filtro "Tipo" según el plan: no aportan
 * información útil al usuario final.
 */
const EXCLUDED_TYPES: ReadonlySet<string> = new Set([
  "unknown",
  "shadow",
]);

/** Mapa inglés → clave en español usado para los hábitats. */
const HABITAT_ALIAS: Record<string, Habitat> = {
  cave: "caverna",
  forest: "bosque",
  grassland: "pradera",
  mountain: "montana",
  "rough-terrain": "montana",
  field: "campo",
  freshwater: "agua_dulce",
  "waters-edge": "agua_dulce",
  sea: "agua_salada",
  urban: "ciudad",
  rare: "raro",
};

const HABITAT_LABEL: Record<Habitat, string> = {
  caverna: "Caverna",
  bosque: "Bosque",
  pradera: "Pradera",
  campo: "Campo",
  montana: "Montaña",
  agua_dulce: "Agua dulce",
  agua_salada: "Agua salada",
  ciudad: "Ciudad",
  raro: "Raro",
  generico: "Genérico",
};

const GENERATION_LABEL: Record<Generation, string> = {
  "generation-i": "Generación I",
  "generation-ii": "Generación II",
  "generation-iii": "Generación III",
  "generation-iv": "Generación IV",
  "generation-v": "Generación V",
  "generation-vi": "Generación VI",
  "generation-vii": "Generación VII",
  "generation-viii": "Generación VIII",
  "generation-ix": "Generación IX",
};

const TYPE_LABEL: Record<PokemonType, string> = {
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

/**
 * Capitaliza un nombre slug (`electric` → `Electric`) y luego aplica
 * el override en español cuando exista.
 */
function labelFor(value: string, override?: string): string {
  if (override) return override;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/* -------------------------------------------------------------------------- *
 * Buckets numéricos (altura / peso)
 * -------------------------------------------------------------------------- */

/**
 * Buckets predefinidos de altura en decímetros (la PokeAPI devuelve
 * `height` en dm). Se eligen cortes que agrupan pokemons pequeños,
 * medianos, grandes y muy grandes.
 */
const HEIGHT_BUCKETS: ReadonlyArray<FilterBucket> = [
  { value: "xs", label: "XS (< 3 dm)", min: -Infinity, max: 3 },
  { value: "s", label: "S (3–10 dm)", min: 3, max: 10 },
  { value: "m", label: "M (10–20 dm)", min: 10, max: 20 },
  { value: "l", label: "L (20–50 dm)", min: 20, max: 50 },
  { value: "xl", label: "XL (≥ 50 dm)", min: 50, max: Infinity },
];

/**
 * Buckets predefinidos de peso en hectogramos (la PokeAPI devuelve
 * `weight` en hg).
 */
const WEIGHT_BUCKETS: ReadonlyArray<FilterBucket> = [
  { value: "light", label: "Ligero (< 100 hg)", min: -Infinity, max: 100 },
  { value: "medium", label: "Medio (100–500 hg)", min: 100, max: 500 },
  { value: "heavy", label: "Pesado (500–1000 hg)", min: 500, max: 1000 },
  { value: "giant", label: "Gigante (≥ 1000 hg)", min: 1000, max: Infinity },
];

/** Devuelve los buckets de altura predefinidos. */
export function fetchHeightBuckets(): ReadonlyArray<FilterBucket> {
  return HEIGHT_BUCKETS;
}

/** Devuelve los buckets de peso predefinidos. */
export function fetchWeightBuckets(): ReadonlyArray<FilterBucket> {
  return WEIGHT_BUCKETS;
}

/* -------------------------------------------------------------------------- *
 * Mappers → FilterOption
 * -------------------------------------------------------------------------- */

interface RawType {
  id: number;
  name: string;
}

function mapTypes(raw: ReadonlyArray<RawType>): ReadonlyArray<FilterOption> {
  const out: FilterOption[] = [];
  for (const t of raw) {
    if (EXCLUDED_TYPES.has(t.name)) continue;
    if (!(POKEMON_TYPES as ReadonlyArray<string>).includes(t.name)) continue;
    const type = t.name as PokemonType;
    out.push({
      value: type,
      label: TYPE_LABEL[type],
    });
  }
  return out;
}

function mapGenerations(
  raw: ReadonlyArray<RawType>,
): ReadonlyArray<FilterOption> {
  const out: FilterOption[] = [];
  for (const g of raw) {
    if (!(GENERATIONS as ReadonlyArray<string>).includes(g.name)) continue;
    const gen = g.name as Generation;
    out.push({ value: gen, label: GENERATION_LABEL[gen] });
  }
  return out;
}

function mapColors(raw: ReadonlyArray<RawType>): ReadonlyArray<FilterOption> {
  return raw.map((c) => ({
    value: c.name,
    label: labelFor(c.name),
    // `POKEMON_TYPE_COLORS.default` se reutiliza como swatch neutro.
    image: undefined,
  }));
}

function mapHabitats(
  raw: ReadonlyArray<RawType>,
): ReadonlyArray<FilterOption> {
  const seen = new Set<Habitat>();
  const out: FilterOption[] = [];
  for (const h of raw) {
    const key = HABITAT_ALIAS[h.name];
    if (!key) continue;
    if (!(HABITATS as ReadonlyArray<string>).includes(key)) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      value: key,
      label: HABITAT_LABEL[key],
      image: HABITAT_IMAGES[key],
    });
  }
  return out;
}

function mapAbilities(
  raw: ReadonlyArray<RawType>,
): ReadonlyArray<FilterOption> {
  return raw.map((a) => ({ value: a.name, label: labelFor(a.name) }));
}

/* -------------------------------------------------------------------------- *
 * Formas crudas de la respuesta
 * -------------------------------------------------------------------------- */

export interface RawFilterOptionsResponse {
  pokemon_v2_type: Array<{ id: number; name: string }>;
  pokemon_v2_generation: Array<{ id: number; name: string }>;
  pokemon_v2_pokemoncolor: Array<{ id: number; name: string }>;
  pokemon_v2_pokemonhabitat: Array<{ id: number; name: string }>;
  pokemon_v2_ability: Array<{ id: number; name: string }>;
  pokemon_v2_pokemon_aggregate: {
    aggregate: {
      min: { height: number | null; weight: number | null };
      max: { height: number | null; weight: number | null };
    };
  };
}

/* -------------------------------------------------------------------------- *
 * Funciones individuales — carga bajo demanda
 * -------------------------------------------------------------------------- */

/** Carga solo los tipos. */
export async function fetchTypeOptions(): Promise<ReadonlyArray<FilterOption>> {
  const data = await request<{
    pokemon_v2_type: Array<{ id: number; name: string }>;
  }>(TYPES_QUERY, undefined, "Types", { next: FILTER_CACHE });
  return mapTypes(data.pokemon_v2_type);
}

/** Carga solo las generaciones. */
export async function fetchGenerationOptions(): Promise<ReadonlyArray<FilterOption>> {
  const data = await request<{
    pokemon_v2_generation: Array<{ id: number; name: string }>;
  }>(GENERATIONS_QUERY, undefined, "Generations", { next: FILTER_CACHE });
  return mapGenerations(data.pokemon_v2_generation);
}

/** Carga solo los colores. */
export async function fetchColorOptions(): Promise<ReadonlyArray<FilterOption>> {
  const data = await request<{
    pokemon_v2_pokemoncolor: Array<{ id: number; name: string }>;
  }>(COLORS_QUERY, undefined, "Colors", { next: FILTER_CACHE });
  return mapColors(data.pokemon_v2_pokemoncolor);
}

/** Carga solo los hábitats (mapeados a claves en español). */
export async function fetchHabitatOptions(): Promise<ReadonlyArray<FilterOption>> {
  const data = await request<{
    pokemon_v2_pokemonhabitat: Array<{ id: number; name: string }>;
  }>(HABITATS_QUERY, undefined, "Habitats", { next: FILTER_CACHE });
  return mapHabitats(data.pokemon_v2_pokemonhabitat);
}

/** Carga solo las habilidades. */
export async function fetchAbilityOptions(): Promise<ReadonlyArray<FilterOption>> {
  const data = await request<{
    pokemon_v2_ability: Array<{ id: number; name: string }>;
  }>(ABILITIES_QUERY, undefined, "Abilities", { next: FILTER_CACHE });
  return mapAbilities(data.pokemon_v2_ability);
}

/* -------------------------------------------------------------------------- *
 * Carga conjunta
 * -------------------------------------------------------------------------- */

/**
 * Carga todos los filtros en una sola petición al endpoint
 * GraphQL. Útil cuando se monta el panel de filtros completo de
 * golpe. Para carga bajo demanda, usar las funciones individuales
 * `fetchTypeOptions`, etc.
 */
export async function fetchFilterOptions(): Promise<FilterOptionMap> {
  const data = await request<RawFilterOptionsResponse>(
    FILTER_OPTIONS_QUERY,
    undefined,
    "FilterOptions",
    { next: FILTER_CACHE },
  );

  const types = mapTypes(data.pokemon_v2_type);
  return {
    type1: types,
    type2: types,
    generation: mapGenerations(data.pokemon_v2_generation),
    color: mapColors(data.pokemon_v2_pokemoncolor),
    habitat: mapHabitats(data.pokemon_v2_pokemonhabitat),
    ability: mapAbilities(data.pokemon_v2_ability),
    height: HEIGHT_BUCKETS,
    weight: WEIGHT_BUCKETS,
  };
}