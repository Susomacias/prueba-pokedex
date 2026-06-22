import type {
  GraphQLRequestError,
  GraphQLResponse,
  GraphQLResponseError,
} from "./types";

/**
 * Endpoint por defecto de la GraphQL de PokeAPI (v1beta2).
 *
 * v1beta2 es la versión pública recomendada (`https://graphql.pokeapi.co/v1beta2`)
 * y expone los tipos sin el prefijo `pokemon_v2_` (ver
 * `doc/pokeapi/graphql/v1beta2/metadata/databases/default/tables/`).
 *
 * Se puede sobrescribir con `NEXT_PUBLIC_POKEAPI_GRAPHQL_URL`.
 */
export const DEFAULT_POKEAPI_GRAPHQL_URL = "https://graphql.pokeapi.co/v1beta2";

/**
 * Devuelve la URL configurada para el endpoint GraphQL de PokeAPI.
 *
 * Lee `NEXT_PUBLIC_POKEAPI_GRAPHQL_URL` (público, accesible desde cliente)
 * y cae en el endpoint v1beta2 oficial si no está definida.
 */
export function getPokeApiEndpoint(): string {
  const fromEnv = process.env.NEXT_PUBLIC_POKEAPI_GRAPHQL_URL;
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_POKEAPI_GRAPHQL_URL;
}

/**
 * Error lanzado cuando la respuesta GraphQL contiene `errors`.
 * Expone el listado original para depuración y logging.
 */
export class GraphQLError extends Error implements GraphQLRequestError {
  readonly errors: readonly GraphQLResponseError[];

  constructor(errors: readonly GraphQLResponseError[]) {
    const first = errors[0];
    super(first?.message ?? "GraphQL response contained errors");
    this.name = "GraphQLError";
    this.errors = errors;
  }
}

interface RequestOptions {
  /** Cabeceras adicionales a enviar en el POST. */
  readonly headers?: Record<string, string>;
  /**
   * Configuración de caché del `fetch` de Next.js.
   * Útil para marcar la query como cacheable sin usar `use cache`.
   */
  readonly next?:
    | RequestInit["next"]
    | Readonly<Record<string, unknown>>;
}

/**
 * Ejecuta una query GraphQL contra el endpoint de PokeAPI.
 *
 * @typeParam T - Forma esperada de `data` en la respuesta.
 * @param query        - Documento GraphQL en texto (query/mutation).
 * @param variables    - Variables inyectadas en el documento.
 * @param operationName- Nombre de la operación cuando el documento tiene varias.
 * @param options      - Cabeceras/caché adicionales.
 *
 * @throws {GraphQLError} cuando la respuesta incluye `errors`.
 * @throws {Error}        para errores de red o HTTP no correctos.
 */
export async function request<T>(
  query: string,
  variables?: Record<string, unknown>,
  operationName?: string,
  options?: RequestOptions,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(getPokeApiEndpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...options?.headers,
      },
      body: JSON.stringify({ query, variables, operationName }),
      ...(options?.next ? { next: options.next as RequestInit["next"] } : {}),
    });
  } catch (cause) {
    if (cause instanceof Error) throw cause;
    throw new Error("Network error while contacting PokeAPI GraphQL endpoint", {
      cause,
    });
  }

  if (!response.ok) {
    let payload: GraphQLResponse<unknown> | undefined;
    try {
      payload = (await response.json()) as GraphQLResponse<unknown>;
    } catch {
      payload = undefined;
    }
    if (payload?.errors && payload.errors.length > 0) {
      throw new GraphQLError(payload.errors);
    }
    throw new Error(
      `PokeAPI GraphQL request failed: ${response.status} ${response.statusText}`,
    );
  }

  const json = (await response.json()) as GraphQLResponse<T>;

  if (json.errors && json.errors.length > 0) {
    throw new GraphQLError(json.errors);
  }

  if (json.data === undefined) {
    throw new Error("PokeAPI GraphQL response did not include data");
  }

  return json.data;
}
