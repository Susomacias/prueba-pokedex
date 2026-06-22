/**
 * Tipos compartidos del cliente GraphQL contra PokeAPI.
 *
 * Estos tipos describen únicamente la envoltura del protocolo GraphQL
 * (data/errors) y los errores devueltos por el endpoint. Los tipos
 * específicos de cada query viven en `src/lib/types/pokemon.ts`.
 */

/** Error individual devuelto por el endpoint GraphQL. */
export interface GraphQLResponseError {
  readonly message: string;
  readonly locations?: ReadonlyArray<{
    readonly line: number;
    readonly column: number;
  }>;
  readonly path?: ReadonlyArray<string | number>;
  readonly extensions?: Record<string, unknown>;
}

/** Respuesta cruda del endpoint GraphQL. */
export interface GraphQLResponse<T = unknown> {
  readonly data?: T;
  readonly errors?: readonly GraphQLResponseError[];
}

/**
 * Error lanzado por el cliente cuando la respuesta GraphQL incluye
 * `errors`. Expone el listado original para depuración.
 */
export interface GraphQLRequestError extends Error {
  readonly errors: readonly GraphQLResponseError[];
}
