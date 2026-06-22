import { describe, expect, it } from "vitest";
import { POKEMON_LIST_QUERY } from "@/src/lib/graphql/queries/pokemonList.gql";
import { POKEMON_LIST_FILTERED_QUERY } from "@/src/lib/graphql/queries/pokemonListFiltered.gql";
import { POKEMON_DETAIL_QUERY } from "@/src/lib/graphql/queries/pokemonDetail.gql";
import {
  FILTER_OPTIONS_QUERY,
  TYPES_QUERY,
  GENERATIONS_QUERY,
  COLORS_QUERY,
  HABITATS_QUERY,
  ABILITIES_QUERY,
  HEIGHT_WEIGHT_AGGREGATE_QUERY,
} from "@/src/lib/graphql/queries/filterOptions.gql";

/**
 * Plan 06.2 — Validación sintáctica de las queries GraphQL.
 *
 * Estos tests no hacen peticiones de red. Su único objetivo es
 * garantizar que las queries que enviamos a PokeAPI v1beta2 son
 * sintácticamente válidas y usan la nomenclatura correcta.
 *
 * El bug histórico que motivó estos tests: la query usaba
 * `where: { is_default: { _eq: true }, ...$where }` (spread JS)
 * que NO es sintaxis GraphQL válida — la PokeAPI respondía con
 * `"not a valid graphql query"`. Los tests previos solo verificaban
 * la variable `$where` enviada, no el string de la query, por lo
 * que el bug pasaba inadvertido.
 *
 * Reglas validadas:
 *   1. No queda spread JavaScript (`...$`) en ninguna query.
 *   2. No queda nombre con prefijo `pokemon_v2_` (v1beta).
 *   3. Los `_and` arrays no contienen `null` literales (Hasura
 *      rechaza elementos null en arrays `_and`).
 *   4. Los `order_by` usan valores en minúsculas (`asc`/`desc`),
 *      no `ASC`/`DESC` (Hasura los rechaza).
 *
 * Para validación contra el endpoint real (no sintaxis, sino
 * respuesta) ver `__tests__/integration/pokeapi.integration.test.ts`
 * y `e2e/pokedex-list.spec.ts`.
 */

const ALL_QUERIES: ReadonlyArray<{ name: string; query: string }> = [
  { name: "POKEMON_LIST_QUERY", query: POKEMON_LIST_QUERY },
  { name: "POKEMON_LIST_FILTERED_QUERY", query: POKEMON_LIST_FILTERED_QUERY },
  { name: "POKEMON_DETAIL_QUERY", query: POKEMON_DETAIL_QUERY },
  { name: "FILTER_OPTIONS_QUERY", query: FILTER_OPTIONS_QUERY },
  { name: "TYPES_QUERY", query: TYPES_QUERY },
  { name: "GENERATIONS_QUERY", query: GENERATIONS_QUERY },
  { name: "COLORS_QUERY", query: COLORS_QUERY },
  { name: "HABITATS_QUERY", query: HABITATS_QUERY },
  { name: "ABILITIES_QUERY", query: ABILITIES_QUERY },
  { name: "HEIGHT_WEIGHT_AGGREGATE_QUERY", query: HEIGHT_WEIGHT_AGGREGATE_QUERY },
];

describe("sintaxis GraphQL de las queries (Plan 06.2)", () => {
  for (const { name, query } of ALL_QUERIES) {
    describe(name, () => {
      it("no usa spread JavaScript (`...$where`)", () => {
        // GraphQL no soporta spread. Debe usarse `_and: [...]`.
        expect(query).not.toMatch(/\.\.\.\$[a-zA-Z]+/);
      });

      it("no usa nombres con prefijo `pokemon_v2_` (v1beta)", () => {
        // v1beta2 expone los mismos tipos sin el prefijo.
        // Si aparece `pokemon_v2_` es que la migración está incompleta.
        expect(query).not.toContain("pokemon_v2_");
      });

      it("los `_and` arrays no contienen `null` literal", () => {
        // Hasura rechaza elementos null en arrays `_and`. Si usamos
        // `_and: [X, $y]`, la variable `$y` debe ser non-null (`!`).
        // Buscamos `_and: [..., null, ...]` como anti-patrón literal.
        expect(query).not.toMatch(/_and:\s*\[[^\]]*\bnull\b/);
      });

      it("los `order_by` usan valores en minúsculas (asc/desc)", () => {
        // Hasura espera `asc`/`desc` en minúsculas. `ASC`/`DESC` son
        // rechazados con error de validación.
        const orderByMatches = query.match(/order_by:\s*{[^}]*}/g) ?? [];
        for (const match of orderByMatches) {
          expect(match).not.toMatch(/:\s*(ASC|DESC)\b/);
        }
      });

      it("define el nombre de operación correcto", () => {
        // Cada query debe tener un operationName explícito (útil para
        // tracing y para que `request()` pueda pasar `operationName`).
        expect(query).toMatch(new RegExp(`query\\s+${name.replace("_QUERY", "").replace(/_/g, "[A-Za-z0-9]*")}\\b`));
      });
    });
  }
});

describe("queries con filtros (`$where`)", () => {
  const QUERIES_WITH_WHERE = [
    { name: "POKEMON_LIST_QUERY", query: POKEMON_LIST_QUERY },
    { name: "POKEMON_LIST_FILTERED_QUERY", query: POKEMON_LIST_FILTERED_QUERY },
  ];

  for (const { name, query } of QUERIES_WITH_WHERE) {
    describe(name, () => {
      it("declara `$where` como non-null con default `{}` para uso en `_and`", () => {
        // Si `$where` aparece dentro de un array `_and`, debe ser
        // non-null (`!`). Le damos default `{}` para que el caller
        // pueda omitirlo (caso sin filtros).
        expect(query).toMatch(
          /\$where:\s*pokemon_bool_exp!\s*=\s*{}\s/,
        );
      });

      it("combina `is_default` con `$where` vía `_and`", () => {
        // En v1beta2 no podemos hacer `{ is_default: {...}, ...$where }`
        // (spread inválido). Debe ser `{ _and: [{ is_default: {...} }, $where] }`.
        expect(query).toMatch(/_and:\s*\[\s*\{\s*is_default:\s*\{\s*_eq:\s*true\s*\}\s*\}\s*,\s*\$where\s*\]/);
      });
    });
  }
});
