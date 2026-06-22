# Plan 01 — Capa de Datos PokeAPI (GraphQL)

## Objetivo

Implementar toda la capa de acceso a datos contra `https://beta.pokeapi.co/graphql/v1beta` de forma optimizada, tipada, cacheable y testeable. Esta capa es **el fundamento** de todo lo demás: el resto de planes consume exclusivamente las funciones aquí definidas.

## Principios del borrador aplicables

- Traer **solo los campos necesarios** para cada vista (lista vs detalle vs filtros).
- **Precargar** información previsible sin sobrecargar.
- **Caché de servidor** cuando sea menester (Next 16: usar `fetch` con `cache`, `revalidate`, o directiva `use cache` si aplica — leer `node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md`).
- Consultas en **español** cuando la PokeAPI ofrezca `pokemon_v2_language: {name: {_eq: "es"}}` (flavor text, nombres, etc.).

## Contexto / Dependencias

- **Requiere**: Plan 00 (tokens, tipos base).
- **Habilita**: Planes 02 (routing), 06 (lista/carrusel), 07 (filtros), 08 (detalle), 09 (3D).

## Referencias útiles

- Endpoint y patrón de fetch: `doc/pokeapi/graphql/v1beta/examples/node/pokemon.js`.
- Ejemplos de queries: `doc/pokeapi/graphql/v1beta/examples/*.gql`.
- Modelos de datos: `doc/pokeapi/pokemon_v2/models.py` y `serializers.py`.

## Fases

---

### Fase 01.1 — Cliente GraphQL tipado

**Objetivo:** crear un cliente `fetch`-based reutilizable, con tipos de respuesta genéricos, manejo de errores y soporte para variables/operationName.

**Tareas:**
- Crear `src/lib/graphql/client.ts` con función `request<T>(query, variables, operationName): Promise<T>`.
- Endpoint desde variable de entorno `NEXT_PUBLIC_POKEAPI_GRAPHQL_URL` (fallback al beta).
- Manejo de errores: lanzar `GraphQLError` si `result.errors` existe.
- Crear tipos en `src/lib/graphql/types.ts` para errores y respuesta base.
- Añadir `.env.local` y `.env.example` con la URL.

**Skills recomendadas:**
- `next-best-practices` (data patterns, route handlers, RSC boundaries).
- `next-cache-components` (decidir entre `fetch` cache, `unstable_cache`, o `use cache`).
- `vercel-react-best-practices` (server serialization, hoisted IO).

**Tests a diseñar (antes):**
- Test unitario del cliente con `vi.fn(fetch)` mockeado: éxito, error GraphQL, error de red.

**Tests a ejecutar (después):**
- `npm run test:run`
- `npm run lint`

**Criterios de aceptación:**
- El cliente es tipado genérico y maneja errores.
- URL configurable por env.

**Documentación:** `README.md` — explicar que hace falta `.env.local`.

**Revisión humana:** No.

---

### Fase 01.2 — Queries: lista paginada de pokemons

**Objetivo:** obtener listas de 30 pokemons con datos mínimos para la card (id, nombre, sprite, tipo1, tipo2, habitat, generación). Soporte de paginación cursor/offset.

**Tareas:**
- Crear `src/lib/graphql/queries/pokemonList.gql.ts` (exporta el string de la query).
- Query base (sin filtros,首批 30):
  - `pokemon_v2_pokemon(limit: 30, offset: 0, where: { is_default: { _eq: true } }, order_by: { id: asc })` con campos: `id`, `name`, `height`, `weight`, `sprites` (solo `front_default`), `types` (slot + type name), species → habitat name y generation name.
- Función `fetchPokemonList(offset, filters)` en `src/lib/pokemon/fetchList.ts`.
- Paginación: función `fetchNextPage` que mantenga estado del offset.
- Tipos de respuesta en `src/lib/types/pokemon.ts` (`PokemonListItem`).

**Skills recomendadas:**
- `next-cache-components` (marcar como cacheable la lista sin filtros).
- `vercel-react-best-practices` (server parallel fetching).

**Tests a diseñar (antes):**
- Test: `fetchPokemonList(0)` devuelve 30 items con todos los campos.
- Test: paginación offset 30 devuelve los siguientes 30 distintos.
- Test: la query no pide campos innecesarios (snapshot del query string).

**Tests a ejecutar (después):**
- `npm run test:run` (mockeando el endpoint).

**Criterios de aceptación:**
- La función devuelve tipos correctos.
- La query pide exactamente los campos listados.

**Documentación:** No.

**Revisión humana:** No.

---

### Fase 01.3 — Queries: detalle de pokemon

**Objetivo:** obtener todos los datos para la ficha: stats, habilidades, evoluciones, sprites (máx 7), cry (sonido), flavor text en español, tipos, generación, habitat.

**Tareas:**
- Crear `src/lib/graphql/queries/pokemonDetail.gql.ts`.
- Query `pokemon_v2_pokemonspecies(where: { name: { _eq: $name } })` con:
  - `pokemon_v2_pokemons(limit: 1)` → `id`, `name`, `height`, `weight`, `base_experience`.
  - `pokemon_v2_pokemonstats` → `base_stat`, stat name.
  - `pokemon_v2_pokemonabilities` → `ability.name`, `is_hidden`, slot.
  - `pokemon_v2_pokemontypes` → `slot`, `type.name`.
  - `pokemon_v2_pokemonsprites` → `sprites` (JSON, extraer front_default + otros).
  - `pokemon_v2_pokemoncries` → `latest` (url del sonido).
  - `pokemon_v2_generation` → `name`.
  - `pokemon_v2_pokemonhabitat` → `name`.
  - `pokemon_v2_pokemonspeciesflavortexts(where: { language: es })` → `flavor_text`.
  - Evolution chain vía `pokemon_v2_evolutionchain` → lista de species con `evolves_from_species_id`, `min_level`, `trigger`, etc.
- Función `fetchPokemonDetail(name: string)` en `src/lib/pokemon/fetchDetail.ts`.
- Normalizar la cadena evolutiva en un árbol plano ordenado.

**Skills recomendadas:**
- `next-cache-components` (cache por nombre de pokemon, `cacheTag("pokemon", name)`).
- `typescript-advanced-types` (tipos para evolution chain).

**Tests a diseñar (antes):**
- Test: `fetchPokemonDetail("pikachu")` devuelve stats, abilities, types, evolution.
- Test: flavor text en español si está disponible.
- Test: el árbol de evolución está ordenado.

**Tests a ejecutar (después):**
- `npm run test:run`

**Criterios de aceptación:**
- Todos los datos necesarios para el plan 08 están disponibles.
- Sin campos extras desperdiciados.

**Documentación:** No.

**Revisión humana:** No.

---

### Fase 01.4 — Queries: opciones para filtros

**Objetivo:** obtener las listas de valores posibles para cada uno de los 8 filtros del borrador, de forma asíncrona (no bloqueante).

**Tareas:**
Filtros requeridos:
1. Tipo 1 / Tipo 2 → `pokemon_v2_type` (excluir `unknown` y `shadow`).
2. Generación → `pokemon_v2_generation`.
3. Color → `pokemon_v2_pokemoncolor`.
4. Hábitat → `pokemon_v2_pokemonhabitat`.
5. Altura → rangos agregados (`pokemon_v2_pokemon_aggregate` con `max`/`min` o buckets predefinidos).
6. Peso → igual que altura.
7. Habilidad → `pokemon_v2_ability`.

- Crear `src/lib/graphql/queries/filterOptions.gql.ts`.
- Función `fetchFilterOptions()` que devuelve un mapa `FilterKey -> Option[]`.
- Funciones individuales `fetchTypes()`, `fetchGenerations()`, etc., para cargar bajo demanda.
- Cada opción incluye `value`, `label` (en español cuando aplique), e icono/imagen si procede (ej. color con swatch).

**Skills recomendadas:**
- `next-cache-components` (estas listas son estáticas → `cacheLife("hours")` o similar).
- `vercel-react-best-practices` (parallel fetching para cargar todas a la vez).

**Tests a diseñar (antes):**
- Test: cada `fetch*` devuelve array no vacío.
- Test: las opciones están en español cuando el campo lo permite.

**Tests a ejecutar (después):**
- `npm run test:run`

**Criterios de aceptación:**
- Los 8 filtros tienen sus opciones.
- Tipos TypeScript discriminados por `FilterKey`.

**Documentación:** No.

**Revisión humana:** No.

---

### Fase 01.5 — Filtros aplicados a la lista + buscador

**Objetivo:** extender `fetchPokemonList` para aceptar filtros combinables y un término de búsqueda.

**Tareas:**
- Construir el `where` de GraphQL dinámicamente desde un objeto `Filters`.
- Buscador: primero busca por nombre exacto/parcial (`name: { _like: "%term%" }`); si hay 3+ letras y no hay resultados, ampliar a flavor_text/types/habitat/generation.
- Función `applyFiltersToList(filters, offset)`.
- Caso especial del borrador: si el resultado tiene un único pokemon → devolver flag `single: true` con el pokemon, para que la UI cargue la ficha directamente.
- Contar total de resultados (para mostrar en consola de filtros).

**Skills recomendadas:**
- `typescript-advanced-types` (builder tipado de `where`).

**Tests a diseñar (antes):**
- Test: filtro por tipo `fire` devuelve solo pokemons de fuego.
- Test: combinar 2 filtros (tipo + generación) aplica AND.
- Test: búsqueda por nombre devuelve coincidencias.
- Test: búsqueda fallida por nombre con 4 letras expande a descripción.
- Test: resultado único devuelve `single: true`.

**Tests a ejecutar (después):**
- `npm run test:run`

**Criterios de aceptación:**
- Todos los filtros del borrador funcionan combinables.
- Buscador con fallback.

**Documentación:** No.

**Revisión humana:** No.

---

### Fase 01.6 — Caché, dedupe y precarga

**Objetivo:** aplicar estrategia de caché de servidor y precarga inteligente.

**Tareas:**
- Revisar `node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md` y `09-revalidating.md`.
- Marcar como cacheables:
  - Lista sin filtros: `revalidate: 3600` (1h).
  - Detalle de pokemon: `revalidate: 86400` (24h) con `cacheTag("pokemon", name)`.
  - Opciones de filtros: estáticas, `cacheLife("days")` o `revalidate: 604800`.
- Precarga: al mostrar la lista actual, precargar en background los detalles de los primeros N (3) pokemons visibles usando `Promise.all` en paralelo (server side) o prefetch en cliente.
- Limitar precarga para no saturar (máx 3 simultáneas).

**Skills recomendadas:**
- `next-cache-components` (central).
- `vercel-react-best-practices` (parallel nested fetching).

**Tests a diseñar (antes):**
- Test: dos llamadas idénticas a `fetchPokemonDetail("pikachu")` solo hacen 1 fetch real (dedupe).
- Test: la precarga no excede de 3 requests en paralelo.

**Tests a ejecutar (después):**
- `npm run test:run`
- `npm run build` (verificar que no rompe por uso de cache en RSC).

**Criterios de aceptación:**
- Cache aplicado y verificado en build.
- Precarga funcional y acotada.

**Documentación:**
- `AGENTS.md`: anotar la estrategia de caché para referencia futura.

**Revisión humana:** No.

---

## Riesgos

- **Rate limiting de PokeAPI**: las consultas GraphQL pueden tener límites. Centralizar y cachear reduce el riesgo.
- **Esquema GraphQL cambiante**: si una query falla, validar contra `doc/pokeapi/graphql/v1beta/metadata/`.
- **Evolución chain compleja**: algunas cadenas (Eevee) tienen múltiples ramas; el árbol debe soportarlo.
