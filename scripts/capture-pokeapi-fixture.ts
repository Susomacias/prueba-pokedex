/**
 * Captura respuestas reales de la PokeAPI GraphQL y las guarda como
 * fixtures JSON versionados en `__tests__/fixtures/pokeapi/`.
 *
 * Uso:
 *   npx tsx scripts/capture-pokeapi-fixture.ts
 *
 * Los fixtures son la base para los tests que verifican la **forma
 * real** de los datos de PokeAPI (no objetos inventados). Si la API
 * cambia de schema, este script falla o produce un diff visible al
 * commitear, lo que avisa de la necesidad de actualizar tests.
 *
 * Ver AGENTS.md → "Fixtures de tests basadas en PokeAPI real".
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ENDPOINT =
  process.env.NEXT_PUBLIC_POKEAPI_GRAPHQL_URL ??
  "https://beta.pokeapi.co/graphql/v1beta";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, "..");
const FIXTURES_DIR = resolve(ROOT, "__tests__/fixtures/pokeapi");

interface CaptureTarget {
  readonly path: string;
  readonly query: string;
  readonly variables?: Record<string, unknown>;
}

/**
 * Targets de captura. Mantener sincronizado con las queries de
 * `src/lib/graphql/queries/` (mismo texto) para que el fixture
 * refleje exactamente lo que produce la query del proyecto.
 *
 * Endpoint v1beta (`beta.pokeapi.co/graphql/v1beta`): todas las
 * tablas llevan el prefijo `pokemon_v2_` (ver AGENTS.md → "Endpoint
 * GraphQL de PokeAPI — REGLAS DURAS").
 */
const TARGETS: readonly CaptureTarget[] = [
  {
    path: "filter-options/types.json",
    query: `query Types { pokemon_v2_type(order_by: {id: asc}) { id name } }`,
  },
  {
    path: "filter-options/generations.json",
    query: `query Generations { pokemon_v2_generation(order_by: {id: asc}) { id name } }`,
  },
  {
    path: "filter-options/colors.json",
    query: `query Colors { pokemon_v2_pokemoncolor(order_by: {id: asc}) { id name } }`,
  },
  {
    path: "filter-options/habitats.json",
    query: `query Habitats { pokemon_v2_pokemonhabitat(order_by: {id: asc}) { id name } }`,
  },
  {
    path: "filter-options/abilities.json",
    query: `query Abilities { pokemon_v2_ability(order_by: {id: asc}) { id name } }`,
  },
];

async function fetchGql(target: CaptureTarget): Promise<string> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: target.query, variables: target.variables }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `HTTP ${res.status} ${res.statusText} para ${target.path}\n${text}`,
    );
  }
  // Valida que no sea una respuesta de errores de GraphQL.
  const parsed = JSON.parse(text) as { errors?: unknown };
  if (parsed.errors) {
    throw new Error(
      `Errores de GraphQL para ${target.path}:\n${JSON.stringify(parsed.errors, null, 2)}`,
    );
  }
  return text;
}

async function main(): Promise<void> {
  console.log(`Endpoint: ${ENDPOINT}`);
  console.log(`Destino:  ${FIXTURES_DIR}\n`);

  for (const target of TARGETS) {
    const fullPath = resolve(FIXTURES_DIR, target.path);
    console.log(`Capturando ${target.path} ...`);
    const raw = await fetchGql(target);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, raw, "utf8");
    console.log(`  OK (${raw.length} bytes)`);
  }

  console.log("\nFixtures actualizados.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
