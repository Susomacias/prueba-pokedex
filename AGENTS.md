<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Comandos obligatorios al final de cada fase

Tras completar el código de una fase, ejecuta SIEMPRE estos comandos y confirma que pasan en verde antes de dar la fase por terminada:

```bash
npm run lint
npx tsc --noEmit
npm run build
npm run test:run
npm run test:e2e   # requiere servidor dev (Playwright lo levanta vía webServer)
```

## Metodología TDD

Antes de empezar una fase con código, escribir sus tests. Al terminar, ejecutar `npm run test:run` y `npm run test:e2e`.

## Fuente de verdad de constantes

`src/lib/constants/` es la **única** ubicación autorizada para colores por tipo/generación de Pokémon, hábitats y la paleta base del proyecto. Cualquier nuevo color o constante compartida debe añadirse ahí.

## Estado de filtros — único punto de mutación

El estado de filtros SIEMPRE se maneja con `useFilters()` (`src/hooks/useFilters.ts`).
NO duplicar en `useState` locales. La consola, los dropdowns y el buscador
deben consumir el hook (o sus derivados en `src/components/filters/` una vez
montado el `FiltersProvider` del Plan 02.3). La sincronización con la URL es
**bidireccional**: mutar actualiza la URL vía `router.replace({ scroll: false })`
(sin recarga); cambiar la URL por back/forward o link compartido actualiza el
estado.

Serialización URL: `filtersToSearchParams` / `searchParamsToFilters` /
`applyFilterChange` en `src/lib/filters/serialization.ts`. El mapa de
filtros vive en `src/lib/filters/types.ts` (`FILTERS`).

## Capas / slots de la carcasa (Plan 05)

Cada capa del SVG (`public/pokedex_vertical.svg`,
`public/pokedex_horizontal.svg`) tiene su componente slot dedicado
en `src/components/pokedex/slots/`:

| Slot del SVG              | Componente                     |
|---------------------------|--------------------------------|
| `BOTON_3D`                | `Button3DSlot.tsx`             |
| `TIPO1_TIPO2_GENERACION`  | `ChipsSlot.tsx`                |
| `PUNTOS_CARRUSEL`         | `CarouselDotsSlot.tsx`         |
| `CARRUSEL_IMAGENES_DESCRIPCION` | `CarouselSlot.tsx`       |
| `BOTONES_CARRUSEL`        | `CarouselButtonsSlot.tsx`      |
| `SONIDO_POKEMON`          | `SoundSlot.tsx`                |
| `EVOLUCIONES`             | `EvolutionsSlot.tsx`           |
| `STATS`                   | `StatsSlot.tsx`                |
| `VER_HABILIDADES_VER_STATS` | `ToggleStatsAbilitiesSlot.tsx`|
| `CONSOLA_FILTROS`         | `FilterConsoleSlot.tsx`        |
| `DROPDOWNS_FILTROS`       | `FilterDropdownsSlot.tsx`      |
| `BUSCAR_RESET_FILTRAR`    | `SearchResetFilterSlot.tsx`    |

Reglas:

- La carcasa (`PokedexVerticalSvg` / `PokedexHorizontalSvg`) sólo
  recibe `SlotMap` con `ReactNode`s. NO contiene lógica de UI ni
  estado propio.
- El ensamblador (`src/components/pokedex/PokedexShell.tsx`) es el
  único componente que conoce el estado global de la Pokédex y
  construye el `SlotMap` a partir de él. Consume
  `PokedexPageProvider` (Context) y el hook `useViewportLayout` para
  decidir la carcasa según el viewport.
- Cada slot emite `data-stub` y `data-pokemon` (cuando aplica) en su
  nodo raíz para que tests E2E y unitarios puedan inspeccionar qué
  slot está activo y con qué pokemon. Esto lo aplica
  `buildSlotAttrs()` en `src/components/pokedex/slots/types.ts`.

## Lista de pokemons — patrón de scroll infinito (Plan 06.1, revisado)

`PokemonList` (`src/components/pokedex/list/PokemonList.tsx`) usa el
**patrón estándar y probado de scroll infinito acumulativo**. NO hay
virtualización, NO hay ventana deslizante, NO hay librerías externas
de windowing.

**Componentes:**

- `useFilteredPokemonList` (`src/components/filters/useFilteredPokemonList.ts`):
  hook que encapsula la paginación acumulativa. Mantiene `items[]`
  acumulado, expone `nextOffset`, `loadMore()`, `single`, `error`,
  `status` (`"loading" | "loadingMore" | "ready" | "error"`). Re-fetch
  automático cuando cambian los filtros (vía `filterKey` estable).
- `PokemonList`: contenedor con scroll interno (`overflowY: auto`)
  que renderiza los items en flujo normal del DOM y dispara
  `loadMore()` cuando el usuario se acerca al final.

**Disparo de carga adicional — evento `scroll` nativo con throttle:**

El componente escucha el evento `scroll` del propio contenedor (no
`IntersectionObserver`) porque `IntersectionObserver` con `root`
apuntando a un elemento dentro de un `<foreignObject>` SVG da
resultados inconsistentes en Chromium. El evento `scroll` nativo es
100% fiable y permite un control fino del umbral.

El cálculo es:

```ts
const distanceToBottom = scrollHeight - scrollTop - clientHeight;
if (distanceToBottom <= LOOKAHEAD_PX /* 400 */) triggerLoadMore();
```

- `LOOKAHEAD_PX = 400` ≈ 1.7 pantallas antes del final real. Así la
  siguiente tanda llega a tiempo y el scroll nunca se interrumpe.
- Throttle por `requestAnimationFrame` para no saturar al hacer
  scroll rápido.
- Re-evaluación adicional en un `useEffect` que depende de `items`:
  si el contenedor crece y el usuario ya estaba cerca del final,
  se dispara la siguiente carga sin esperar al próximo evento
  `scroll`.

**Anti-patrones prohibidos (prohibido reintroducir):**

- Virtualización con `@tanstack/react-virtual` o similar. Provoca:
  re-mediciones constantes, `position: absolute` con `transform`
  compitiendo con animaciones CSS, scroll saltando, pop-in.
- Ventana deslizante que descarta páginas al alejarse. Provoca
  re-renders visibles al volver atrás.
- Animación CSS de entrada por card (`pokemon-list-card-enter`).
  Aplicada con `animation-fill-mode: both` mantiene la card en su
  estado inicial durante 280 ms, lo que reduce la altura efectiva
  visible y rompe el `min-height: 64px`.

**Reglas para listas filtradas en el futuro:**

Cualquier nueva lista que muestre pokemons con filtros (búsqueda por
nombre, favoritos, equipo, etc.) DEBE usar el mismo patrón:
`useFilteredPokemonList` + `loadMore()` disparado por el evento
`scroll` con `LOOKAHEAD_PX`. NO reinventar la rueda con
virtualización, ni con `IntersectionObserver` dentro de un
`<foreignObject>`.

## Estrategia de caché de la capa de datos (Plan 01.6)

Toda la PokeAPI se consulta desde `src/lib/pokemon/`. La estrategia
de caché está centralizada en `src/lib/pokemon/cacheStrategy.ts`
y aplicada por las funciones crudas (`fetchList.ts`,
`fetchDetail.ts`, `fetchFilterOptions.ts`) más la capa cacheada
`src/lib/pokemon/cachedPokemonApi.ts` (que añade `React.cache`
para dedupe intra-render y `preload*` para precarga en background).

| Recurso | `revalidate` | Tags | Notas |
| --- | --- | --- | --- |
| Lista paginada (sin filtros) | 3600 s (1 h) | `pokemon-data` | Aplica también a la variante filtrable |
| Detalle de un pokemon | 86400 s (24 h) | `pokemon-data`, `pokemon:<name>` | Permite invalidar un pokemon concreto con `revalidateTag('pokemon:<name>')` |
| Opciones de filtros | 604800 s (7 d) | `pokemon-data`, `filter-options` | Datos esencialmente estáticos |

**Dedupe intra-render:** las funciones de `cachedPokemonApi.ts`
están envueltas con `React.cache`. Dentro de un mismo Server
Component / render, dos llamadas idénticas (mismo `name` o misma
página) solo hacen UN fetch real. En jsdom (tests) `React.cache`
no memoiza, pero la API pública se mantiene estable.

**Precarga:** `preloadPokemonDetails(names, max=3)` y
`preloadPokemonList(args)` se usan en Server Components antes de
`await`ar el fetch principal del usuario para iniciar la carga en
background. La cota de 3 evita saturar la PokeAPI.

**Modelo de caché activo:** el proyecto NO usa `cacheComponents`
(`next.config.ts` no activa la flag). Por tanto se usa el modelo
"anterior" de Next.js 16 con `next: { revalidate, tags }` en el
`fetch` subyacente, vía `request()` en `src/lib/graphql/client.ts`.
Si en el futuro se activa `cacheComponents: true`, las constantes
de `cacheStrategy.ts` se pueden migrar a directivas `'use cache'`
con `cacheLife(...)` y `cacheTag(...)` manteniendo los mismos
valores nominales (ver `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache.md`).

## Fixtures de tests basadas en PokeAPI real

Todo test que valide la **forma de los datos** que devuelve PokeAPI
(shape de `pokemonsprites`, `pokemontypes`, `pokemonspecies`,
`pokemonhabitat`, `pokemonstats`, `pokemonevolutions`, `cry`, etc.)
debe usar **fixtures capturados de respuestas reales** de PokeAPI,
NO objetos literales inventados en el test.

- **Ubicación**: `__tests__/fixtures/pokeapi/<scope>/<name>.json`
  (p.ej. `__tests__/fixtures/pokeapi/pikachu.json`,
  `__tests__/fixtures/pokeapi/filter-options/types.json`).
- **Generación**: `scripts/capture-pokeapi-fixture.ts` ejecuta la
  query GraphQL correspondiente (`POKEMON_LIST_QUERY`,
  `POKEMON_LIST_FILTERED_QUERY`, `POKEMON_DETAIL_QUERY`,
  `TYPES_QUERY`, etc.) contra `https://graphql.pokeapi.co/v1beta2`
  y guarda la respuesta cruda. Los fixtures son commits binarios
  versionados: si PokeAPI cambia de schema, el script avisa y se
  regenera.
- **Mocks vs fixtures**: un mock sirve para verificar que el
  componente **hace** la llamada correcta (URL, query, headers) o
  para simular errores de red. Un fixture sirve para verificar que
  el componente **procesa** los datos reales (mapeos, colores,
  formatos, caracteres de control, claves con guiones como
  `special-attack`). Mezclar ambos tipos en el mismo test está
  prohibido — si necesitas ambos, son dos tests separados.
- **E2E contra PokeAPI real**: los specs marcados con `@live-api`
  en `playwright.config.ts` ejercitan el camino real (red habilitada
  a `graphql.pokeapi.co` y a `raw.githubusercontent.com` para los
  `.glb`). Se **skippean** automáticamente si `POKEAPI_REACHABLE` no
  está definido en CI. **Prohibido** usar `page.route()` para mockear
  respuestas de PokeAPI en estos specs — el objetivo es validar la
  integración real. Ver Planes 07.5, 09.5 y 10.6 para el detalle
  por spec.

## Política de navegación y URL (Plan 11 — overlay lista ↔ carrusel)

La Pokédex es una SPA de una sola página (`/`) pero la URL **siempre
refleja el estado real**: `/`, `/pokedex`, `/pokemon/<name>`. Esto
permite compartir links, recargar, usar back/forward. La diferencia
entre cambiar la URL **desde la propia UI** vs **desde una fuente
externa** es crucial y debe respetarse en cualquier desarrollo futuro:

| Origen del cambio                                       | API                                                                                                                  | Animación de vista global (home↔pokedex) | Animación del overlay lista↔carrusel |
|---------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------|------------------------------------------|--------------------------------------|
| Card de la lista → `onSelect(name)`                     | `useAppShell().goToPokemon(name)` → `history.pushState({}, '', '/pokemon/<name>')` + `setPathname` + `setView("pokedex")` | **NO** (la Pokédex ya está visible, la lista sigue debajo) | SÍ (scale + fade del carrusel) |
| Botón X del overlay → `onClose()`                       | `useAppShell().goToPokedex()` → `history.pushState({}, '', '/pokedex')` + `setPathname` + `setView("pokedex")` (la Pokédex sigue visible) | **NO** (la Pokédex sigue visible) | SÍ (encoge y desaparece) |
| Evolución → pulsar nodo                                 | `goToPokemon(name)` (igual que card)                                                                                  | **NO** | SÍ |
| Aplicar filtros / cambiar dropdowns                     | `useFilters()` → `router.replace(..., { scroll: false })` (Next router)                                              | **NO** (la Pokédex ya está visible)      | n/a |
| Deep-link externo: refresh, link compartido, `/pokedex` | El servidor renderiza esa ruta; el cliente detecta `view="home"` en el primer paint y dispara la transición de entrada | **SÍ** (transición coreografiada home → pokedex) | SÍ (el carrusel aparece tras la transición) |
| Botón "atrás" del navegador / popstate                  | `useAppShell` ya escucha `popstate` y sincroniza `view` y `pathname`                                                   | **SÍ** (interpretamos que el usuario viene "de fuera") | SÍ |

**Reglas duras:**

1. **NUNCA** usar `router.push` del `next/navigation` para cambiar el
   pokemon seleccionado desde la UI interna. El árbol NO debe
   desmontarse: la Pokédex y la lista siguen montadas, sólo cambia
   `selectedName` y la URL se actualiza con `pushState` para que el
   back/forward del navegador funcione.

2. **NUNCA** recargar la página al cambiar de pokemon. La animación
   del overlay (scale + fade) ES la única transición que debe ver el
   usuario cuando navega por la Pokédex. Recargar rompería la música,
   el scroll de la lista, los filtros aplicados y la sensación de SPA.

3. La transición home↔pokedex (subir la Pokédex, esconder la home)
   **sólo** se ejecuta cuando la URL cambia "desde fuera":
   - Carga inicial en `/pokedex` o `/pokemon/<name>`.
   - `popstate` (back/forward del navegador).
   - Link externo a `/pokedex` o `/pokemon/<name>` que provoque
     navegación real.
   En esos casos `PokedexPageTransition` fija `view="home"` en el
   primer paint y dispara la transición.

4. Al pulsar una card, una evolución o aplicar un filtro, la URL **se
   actualiza siempre** (`pushState` para cambios de pokemon,
   `router.replace` para filtros) para que la URL siga siendo fiel al
   estado y se pueda compartir/recargar.

5. El botón X del overlay `pokedex-overlay` cierra el carrusel y
   deja `selectedName=null` (vuelve a `/pokedex`), pero NO oculta la
   Pokédex. La animación es local al slot
   `CARRUSEL_IMAGENES_DESCRIPCION` (scale 1 → 0.6, opacity 1 → 0).

**Implementación:**
- `useAppShell().goToPokemon(name)` y `goToPokedex()` son las
  funciones canónicas para cambiar la URL desde la UI. Usan
  `history.pushState` y NO causan re-mount.
- `useFilters()` usa `useNavigation().router.replace(...)` para
  sincronizar la URL con el estado de filtros sin recargar.
- El flag "venimos de fuera" lo gestiona `PokedexPageTransition`
  fijando `view="home"` en `initialView` para `/pokedex` y
  `/pokemon/[name]`. Después del primer paint, `AppShellProvider`
  recalcula `view` desde el pathname y dispara la transición.

## Overlay lista ↔ carrusel (Plan 11)

El slot `CARRUSEL_IMAGENES_DESCRIPCION` muestra **siempre la lista
de pokemons** como base. Cuando hay un pokemon seleccionado
(`selectedName != null`), el carrusel se monta ENCIMA con
`position: absolute; inset: 0` ocupando el 100% del slot.

- Lista visible siempre que no haya pokemon seleccionado
  (`data-stub="list"`, `data-active="false"`).
- Carrusel con animación de entrada (`scale(0.6) opacity:0 →
  scale(1) opacity:1`, duración 350ms) cuando se selecciona un
  pokemon desde la lista.
- Botón X (esquina superior derecha del slot) cierra el carrusel
  con la animación inversa y restaura `selectedName=null`.
- Cuando `selectedName` cambia (otro pokemon), el carrusel hace
  crossfade del contenido (350ms) sin tocar la lista detrás.
- `pointer-events: auto` en el overlay del carrusel mientras esté
  visible; `none` cuando no. La lista detrás queda inerte.

**Anti-patrón prohibido:** volver al modelo antiguo donde el slot
era "lista o carrusel, según haya pokemon". Eso rompía la sensación
de continuidad al explorar la Pokédex y obligaba a recargar. La
lista debe quedarse SIEMPRE detrás.
