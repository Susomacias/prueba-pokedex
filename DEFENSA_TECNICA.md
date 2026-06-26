# Defensa Técnica — Pokédex Virtual

> Guía para entrevista técnica. Estructura del proyecto, decisiones arquitectónicas y
> su justificación.

---

## Índice

1. [Visión general](#1-visión-general)
2. [Stack tecnológico](#2-stack-tecnológico)
3. [Estructura del proyecto](#3-estructura-del-proyecto)
4. [Decisiones técnicas y su defensa](#4-decisiones-técnicas-y-su-defensa)
   - [4.1 SPA con ambas vistas siempre montadas](#41-spa-con-ambas-vistas-siempre-montadas)
   - [4.2 Navegación con pushState en vez de router.push](#42-navegación-con-pushstate-en-vez-de-routerpush)
   - [4.3 Carcasa SVG con slots foreignObject](#43-carcasa-svg-con-slots-foreignobject)
   - [4.4 Endpoint GraphQL de PokeAPI](#44-endpoint-graphql-de-pokeapi)
   - [4.5 React.cache para deduplicación intra-render](#45-reactcache-para-deduplicación-intra-render)
   - [4.6 Scroll infinito con evento scroll nativo](#46-scroll-infinito-con-evento-scroll-nativo)
   - [4.7 Filtros bidireccionales con URL](#47-filtros-bidireccionales-con-url)
   - [4.8 Tailwind CSS v4](#48-tailwind-css-v4)
   - [4.9 Metodología TDD](#49-metodología-tdd)
   - [4.10 Sistema de slots con atributos data-stub/data-pokemon](#410-sistema-de-slots-con-atributos-data-stubdata-pokemon)
   - [4.11 Auto-retry con backoff del upstream](#411-auto-retry-con-backoff-del-upstream)
   - [4.12 Estrategia de caché](#412-estrategia-de-caché)
   - [4.13 Three.js para el visor 3D](#413-threejs-para-el-visor-3d)
   - [4.14 SSE para el chat de IA](#414-sse-para-el-chat-de-ia)
   - [4.15 Profesor Oak con function calling](#415-profesor-oak-con-function-calling)
   - [4.16 Output standalone para Docker](#416-output-standalone-para-docker)
   - [4.17 E2E con Playwright (uso moderado)](#417-e2e-con-playwright-uso-moderado)
   - [4.18 Fixtures de PokeAPI real en tests](#418-fixtures-de-pokeapi-real-en-tests)
   - [4.19 Sin virtualización en la lista](#419-sin-virtualización-en-la-lista)
   - [4.20 Interfaz en español](#420-interfaz-en-español)
   - [4.21 Transiciones solo con CSS (sin librerías de animación)](#421-transiciones-solo-con-css-sin-librerías-de-animación)
5. [Diagrama de arquitectura](#5-diagrama-de-arquitectura)
6. [Mapa de archivos](#6-mapa-de-archivos)
7. [Banco de preguntas de entrevista](#7-banco-de-preguntas-de-entrevista)

---

## 1. Visión general

La **Pokédex Virtual** es una aplicación web interactiva que emula una Pokédex física
con carcasa SVG, pantalla funcional y comandos de consola retro. Permite explorar los
1025+ Pokémon mediante lista con scroll infinito, carrusel de imágenes, visor 3D,
sistema de filtros avanzado y un chat con el Profesor Oak impulsado por IA.

**Dos principios rectores del desarrollo:**

- **Single Page Application real**: la Pokédex y la pantalla de inicio están siempre
  montadas en el DOM. La navegación entre vistas es puramente CSS (transiciones
  coreografiadas). No hay recargas ni desmontajes de árbol.
- **URL como fuente de verdad**: cada estado (vista, filtros, pokémon seleccionado)
  se refleja en la URL. Compartir un link, recargar la página o usar los botones de
  atrás/adelante del navegador restaura exactamente el mismo estado.

---

## 2. Stack tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | Next.js (App Router) | 16.2.9 |
| UI | React | 19.2.4 |
| Estilos | Tailwind CSS | v4 |
| Lenguaje | TypeScript | 5.x (strict) |
| 3D | Three.js | 0.184 |
| IA chat | MiniMax M3 (SSE + function calling) | — |
| Datos | PokeAPI GraphQL | v1beta |
| Tests unitarios | Vitest + Testing Library | 4.x / 16.x |
| Tests E2E | Playwright | 1.61 |
| Despliegue | Docker (standalone output) | — |
| Fuente | Press Start 2P (pixel art) | — |

---

## 3. Estructura del proyecto

```
src/
├── app/                        # Next.js App Router (rutas y layouts)
│   ├── layout.tsx              # Layout raíz (fuente, metadata, SEO)
│   ├── page.tsx                # Ruta / (home)
│   ├── not-found.tsx           # 404 personalizado
│   ├── globals.css             # Estilos globales + animaciones CSS
│   ├── pokedex/page.tsx        # Ruta /pokedex
│   ├── pokemon/[name]/page.tsx # Ruta /pokemon/<name>
│   └── api/
│       ├── pokeapi/route.ts    # Proxy GraphQL (CORS)
│       └── oak-chat/route.ts   # Chat IA (SSE)
│
├── components/
│   ├── app/                    # Shell de la SPA, routing, contexto de vista
│   ├── pokedex/                # Pokédex: carcasa SVG, slots, lista, carrusel, 3D
│   │   ├── carcases/           # SVG vertical y horizontal
│   │   ├── slots/              # 12 slots que rellenan la carcasa
│   │   ├── list/               # Lista con scroll infinito
│   │   ├── carousel/           # Carrusel de imágenes del pokémon
│   │   ├── console/            # Consola de comandos retro
│   │   └── 3d/                 # Visor 3D (Three.js)
│   ├── filters/                # Sistema de filtros (dropdowns, búsqueda)
│   ├── home/                   # Pantalla de inicio
│   ├── chat/                   # Chat del Profesor Oak
│   ├── loading/                # Indicadores de carga
│   └── decorative/             # Elementos decorativos (Pokéball SVG)
│
├── hooks/                      # Hooks globales
│   ├── useFilters.ts           # Estado de filtros (fuente única de verdad)
│   ├── useNavigation.ts        # Navegación SPA (pushState, popstate)
│   ├── useViewportLayout.ts    # Detección responsive (vertical vs horizontal)
│   └── NavigationSSRContext.tsx# Puente SSR a cliente para navegación
│
└── lib/                        # Lógica de negocio
    ├── graphql/                # Cliente GraphQL + queries + where builder
    ├── pokemon/                # Capa de datos (fetch, caché, mapeo)
    ├── filters/                # Serialización de filtros a URL
    ├── constants/              # Colores, tipos, generaciones, hábitats
    ├── chat/tools/             # Herramientas del agente IA
    └── utils/                  # Utilidades puras
```

---

## 4. Decisiones técnicas y su defensa

### 4.1 SPA con ambas vistas siempre montadas

**Qué hicimos:** La pantalla de inicio (home) y la Pokédex están siempre en el DOM.
La visibilidad se controla exclusivamente con CSS (`data-view="home"` /
`data-view="pokedex"` y `transform: translateY`).

**Por qué:**

- **Transiciones fluidas sin parpadeo**: si desmontáramos la Pokédex al volver al
  inicio, perderíamos el estado (filtros aplicados, posición de scroll en la lista,
  pokémon seleccionado). Al mantener ambas vistas montadas, la transición es una
  animación CSS pura de 600ms sin ningún trabajo de React.

- **Música sin interrupción**: la música de fondo (MP3) se reproduce en bucle.
  Desmontar el árbol mataría el `HTMLAudioElement`. Al mantenerlo montado, podemos
  hacer crossfade del volumen entre vistas sin cortes.

- **Renderizado instantáneo al volver**: el usuario puede alternar entre home y
  Pokédex sin esperar. Todo está ya en el DOM.

- **Coste**: tener ambas vistas montadas consume memoria, pero el árbol de la home
  es ligero (~10 SVGs estáticos) y el de la Pokédex es el núcleo de la app. El
  trade-off memoria vs experiencia de usuario es claramente favorable.

**Archivos implicados:**

| Archivo | Funciones/componentes |
|---------|----------------------|
| `src/components/app/AppShell.tsx` | Componente raíz: renderiza `.home-view` + `.pokedex-view` como hermanos |
| `src/components/app/ViewContext.tsx` | `AppShellProvider`, `useAppShell()` — estado `view` que controla `data-view` |
| `src/app/globals.css` | Selectores `[data-view="home"]`, `[data-view="pokedex"]`, transiciones `home-*` |

---

### 4.2 Navegación con pushState en vez de router.push

**Qué hicimos:** Implementamos nuestro propio sistema de navegación
(`useNavigation.ts`) basado en `window.history.pushState` y el evento `popstate`,
en lugar de usar `router.push` de Next.js.

**Por qué:**

1. **Next.js desmonta el árbol en navegaciones**: `router.push('/pokemon/pikachu')`
   provocaría que Next.js tratara la ruta como una página nueva, desmontando el
   árbol de componentes y perdiendo todo el estado (música, scroll, filtros,
   contexto 3D).

2. **Sin recarga de RSC**: cuando solo cambian los search params (filtros), Next.js
   re-ejecuta los Server Components, mostrando el fallback de `<Suspense>`. Con
   `pushState`, la URL cambia sin tocar el árbol React.

3. **La URL siempre refleja el estado**: implementamos un sistema de suscripción
   global donde cualquier componente puede reaccionar a cambios de URL (pathname
   o search params). Esto permite que `useFilters` lea y escriba filtros en la URL,
   y que `useAppShell` sincronice la vista activa con el pathname.

4. **Back/forward del navegador**: el listener de `popstate` en `ViewContext.tsx`
   interpreta los cambios externos de URL (botones del navegador, links compartidos)
   y dispara las transiciones de entrada/salida apropiadas. Esto distingue entre
   un cambio "desde dentro" (click en una card, `pushState` + animación del
   carrusel) y "desde fuera" (botón atrás, transición completa home a pokedex).

5. **SSR sin hydration mismatch**: el contexto `NavigationSSRContext` inyecta el
   pathname y search params renderizados en el servidor. Durante la hydratación,
   `useNavigation` los usa como valor inicial, evitando diferencias entre servidor
   y cliente.

**Archivos implicados:**

| Archivo | Funciones/componentes |
|---------|----------------------|
| `src/hooks/useNavigation.ts` | `useNavigation()` — suscripción global a cambios de URL, expone `pathname`, `searchParams`, `router` (con `replace`, `push`, `back`, `forward`) |
| `src/hooks/NavigationSSRContext.tsx` | `NavigationSSRContext` + `NavigationSSRProvider` — puente SSR a cliente |
| `src/components/app/ViewContext.tsx` | `goToHome()`, `goToPokedex()`, `goToPokemon(name)` — usan `history.pushState`; `handlePopState()` — listener de `popstate` |
| `src/components/app/PokedexPageTransition.tsx` | Shell para deep-links: fija `initialView="home"` y dispara transición de entrada |
| `src/hooks/useFilters.ts` | `setFilter()` — usa `router.replace({ scroll: false })` para actualizar la URL sin recarga |

---

### 4.3 Carcasa SVG con slots foreignObject

**Qué hicimos:** La Pokédex se renderiza como un SVG con elementos `<foreignObject>`
que actúan como "slots" donde inyectamos componentes React. Hay dos variantes:
vertical (móvil, <768px) y horizontal (desktop, >=768px).

**Por qué SVG y no HTML/CSS:**

1. **Fidelidad al diseño**: el SVG es una réplica exacta de la Pokédex física, con
   curvas, gradientes y proporciones precisas. Intentar recrear esta forma compleja
   con CSS (bordes redondeados, recortes, ángulos) sería frágil y difícil de
   mantener.

2. **Responsive real**: en lugar de usar `transform: scale()` o media queries para
   encoger el mismo diseño, creamos dos SVGs distintos optimizados para cada
   orientación. En vertical, los controles (consola, dropdowns) van abajo. En
   horizontal, van a la derecha. Esto aprovecha mejor el espacio disponible.

3. **`foreignObject` como patrón de composición**: los slots nos dan una separación
   limpia entre la "carcasa decorativa" (SVG puro, sin lógica) y el "contenido
   funcional" (componentes React con estado, fetching, interacciones). La carcasa
   no sabe nada de Pokémon, filtros o navegación. El ensamblador (`PokedexShell`)
   es el único punto que une ambos mundos.

4. **Testabilidad**: cada slot emite `data-stub` y `data-pokemon` en su nodo raíz.
   Los tests pueden verificar exactamente qué slot está activo y con qué datos,
   sin depender de la posición visual dentro del SVG.

5. **Limitación asumida**: `foreignObject` tiene soporte completo en todos los
   navegadores modernos. El único caso problemático conocido es
   `IntersectionObserver` con `root` dentro de un `foreignObject` en Chromium
   (inconsistente), que esquivamos usando el evento `scroll` nativo en la lista.

**Archivos implicados:**

| Archivo | Funciones/componentes |
|---------|----------------------|
| `src/components/pokedex/carcases/PokedexVerticalSvg.tsx` | SVG vertical con 12 `SlotLayer` en coordenadas específicas |
| `src/components/pokedex/carcases/PokedexHorizontalSvg.tsx` | SVG horizontal con 12 `SlotLayer` en coordenadas específicas |
| `src/components/pokedex/carcases/SlotLayer.tsx` | `SlotLayer` — inyecta contenido React como hijo de `<foreignObject>` |
| `src/components/pokedex/carcases/slots.ts` | `SlotName`, `SlotMap`, `createEmptySlots()`, `SLOT_NAMES` |
| `src/components/pokedex/PokedexShell.tsx` | Ensamblador: elige carcasa según viewport y construye el `SlotMap` |
| `src/hooks/useViewportLayout.ts` | `useViewportLayout()` — devuelve `"vertical"` o `"horizontal"` (breakpoint 768px) |
| `public/pokedex_vertical.svg` | Diseño original del SVG vertical |
| `public/pokedex_horizontal.svg` | Diseño original del SVG horizontal |
| `src/components/pokedex/slots/types.ts` | `buildSlotAttrs()` — genera `data-stub` y `data-pokemon` |
| `src/components/pokedex/slots/` (12 archivos) | Componentes de slot individuales |

---

### 4.4 Endpoint GraphQL de PokeAPI

**Qué hicimos:** Usamos exclusivamente `https://beta.pokeapi.co/graphql/v1beta`
con el prefijo `pokemon_v2_` en todos los tipos y campos.

**Por qué:**

- **Contexto**: el endpoint documentado en la web de PokeAPI
  (`graphql.pokeapi.co/v1beta2`) dejó de funcionar en junio de 2026 (Cloudflare 521
  `origin_down`). El endpoint `beta.pokeapi.co/graphql/v1beta` es el que realmente
  funciona y expone el schema con prefijo `pokemon_v2_`.

- **GraphQL sobre REST**: una sola query nos trae datos anidados (tipos, sprites,
  evoluciones, stats, habilidades, hábitat, generación) que requerirían 8-10
  llamadas REST. La query de detalle de un pokémon (88 líneas de GraphQL)
  reemplaza ~12 endpoints REST.

- **Proxy same-origin**: aunque `beta.pokeapi.co` envía `Access-Control-Allow-Origin: *`,
  mantenemos un proxy en `/api/pokeapi` por si en el futuro cambia la política CORS
  o necesitamos añadir rate-limiting, logging o transformación de respuestas.

- **Mapeo de nombres**: mantuvimos una tabla de equivalencias entre el schema caído
  (sin prefijo) y el actual (con `pokemon_v2_`). Si PokeAPI vuelve a migrar,
  el cambio está localizado en las queries GraphQL (4 archivos) y el mapeo de tipos
  (1 archivo).

**Archivos implicados:**

| Archivo | Funciones/componentes |
|---------|----------------------|
| `src/lib/graphql/client.ts` | `request<T>()` — cliente HTTP unificado; `getPokeApiEndpoint()` — selección de endpoint |
| `src/lib/graphql/queries/pokemonList.gql.ts` | `POKEMON_LIST_QUERY` |
| `src/lib/graphql/queries/pokemonListFiltered.gql.ts` | `POKEMON_LIST_FILTERED_QUERY` |
| `src/lib/graphql/queries/pokemonDetail.gql.ts` | `POKEMON_DETAIL_QUERY` |
| `src/lib/graphql/queries/filterOptions.gql.ts` | 7 queries: `TYPES_QUERY`, `GENERATIONS_QUERY`, `COLORS_QUERY`, `HABITATS_QUERY`, `ABILITIES_QUERY`, `FILTER_OPTIONS_QUERY`, `ALL_POKEMON_FILTER_FIELDS_QUERY` |
| `src/app/api/pokeapi/route.ts` | `POST` handler — proxy que reenvía al endpoint upstream |

---

### 4.5 React.cache para deduplicación intra-render

**Qué hicimos:** Envolvimos todas las funciones públicas de fetching
(`cachedPokemonApi.ts`) con `React.cache`. Cada función se comporta como un singleton
por render: dos componentes que pidan `fetchPokemonDetail('pikachu')` dentro del
mismo render comparten una única promesa.

**Por qué:**

- **Patrón de React 19**: `React.cache` es la API nativa para memoizar resultados en
  Server Components. A diferencia de `useMemo`, funciona en el servidor y en
  componentes asíncronos.

- **Sin estado global**: no necesitamos una capa de caché en memoria (como React Query
  o SWR) para evitar llamadas duplicadas. `React.cache` lo resuelve automáticamente.

- **Limitación conocida**: `React.cache` no memoiza en jsdom (entorno de tests). Lo
  documentamos explícitamente y los tests validan el comportamiento funcional sin
  depender de la memoización.

- **Precarga en background**: las funciones `preloadPokemonDetails()`,
  `preloadPokemonList()` disparan el fetch antes de que el componente lo necesite,
  iniciando la descarga mientras el usuario aún está decidiendo. Limitamos a 3
  precargas concurrentes para no saturar la PokeAPI.

**Archivos implicados:**

| Archivo | Funciones/componentes |
|---------|----------------------|
| `src/lib/pokemon/cachedPokemonApi.ts` | `fetchPokemonList`, `fetchPokemonDetail`, `fetchFilterOptions`, `applyFiltersToList`, `fetchNextPage`, `preloadPokemonDetails`, `preloadPokemonList`, `preloadPokemonDetailsFireAndForget` — todas envueltas en `React.cache` |
| `src/lib/pokemon/cacheStrategy.ts` | `MAX_CONCURRENT_PREFETCHES = 3` |
| `__tests__/pokemon/cachedPokemonApi.test.ts` | Test de dedupe con `React.cache` |

---

### 4.6 Scroll infinito con evento scroll nativo

**Qué hicimos:** `PokemonList` usa el evento `scroll` nativo del contenedor
(throttle vía `requestAnimationFrame`) para detectar cuándo cargar más Pokémon.
El umbral es `LOOKAHEAD_PX = 400` (1.7 pantallas antes del final).

**Por qué no IntersectionObserver:**

- **Chromium + foreignObject**: `IntersectionObserver` con `root` apuntando a un
  elemento dentro de `<foreignObject>` produce resultados inconsistentes en
  Chromium (los elementos dentro del `foreignObject` a veces se reportan como no
  intersectando aunque sean visibles). El evento `scroll` nativo es 100% fiable.

**Por qué no virtualización:**

- **Lista pequeña**: con 1025 Pokémon y 30 por página, el máximo de elementos en
  DOM son ~1025 tarjetas. Cada tarjeta mide ~64px de alto. El DOM total es de
  ~65,000px de altura. Los navegadores modernos manejan esto sin problemas.

- **Virtualización añade complejidad innecesaria**: librerías como
  `@tanstack/react-virtual` usan `position: absolute` con `transform`, lo que
  compite con las animaciones CSS (las tarjetas tienen animación de entrada) y
  causa re-mediciones constantes. El scroll con virtualización a menudo "salta"
  porque el navegador re-calcula posiciones.

- **Patrón más simple, más robusto**: el evento `scroll` + acumulación de items
  es el patrón probado para listas de tamaño moderado. No hay ventana deslizante,
  no se descartan elementos al hacer scroll.

**Doble verificación de carga**: además del evento `scroll`, un `useEffect` que
depende de `items` re-evalúa si el contenedor creció y el usuario ya estaba cerca
del final. Así la siguiente tanda se dispara aunque el usuario no haga más scroll.

**Archivos implicados:**

| Archivo | Funciones/componentes |
|---------|----------------------|
| `src/components/pokedex/list/PokemonList.tsx` | Evento `scroll` con `requestAnimationFrame` throttle, `distanceToBottom = scrollHeight - scrollTop - clientHeight`, `LOOKAHEAD_PX = 400` |
| `src/components/filters/useFilteredPokemonList.ts` | `useFilteredPokemonList()` — hook de paginación acumulativa: `items[]`, `nextOffset`, `loadMore()`, `status` |
| `src/components/pokedex/list/PokemonListCard.tsx` | `PokemonListCard` — tarjeta individual de 64px |

---

### 4.7 Filtros bidireccionales con URL

**Qué hicimos:** El estado de filtros (`useFilters`) es la única fuente de verdad.
Se sincroniza bidireccionalmente con la URL:

- **Escritura**: `setFilter(key, value)` llama a `router.replace(url)` con `scroll: false`.
- **Lectura**: al montar o al recibir un `popstate`, `searchParamsToFilters()` parsea
  la URL y reconstruye el estado.
- **Consola**: comandos como `tipo1 fuego` se parsean y canalizan a través del mismo hook.
- **Dropdowns**: seleccionar una opción llama a `setFilter` y la URL se actualiza.
- **Búsqueda**: escribir en el buscador aplica el filtro `search` a la URL.

**Por qué:**

1. **URLs compartibles**: un enlace como `/pokedex?tipo1=Fuego&generacion=generacion-i`
   lleva al usuario exactamente a la lista filtrada.

2. **Back/forward del navegador**: como usamos `router.replace`, cada cambio de
   filtro crea una entrada en el historial. El usuario puede deshacer filtros con
   el botón atrás.

3. **Sin recarga**: `router.replace({ scroll: false })` actualiza la URL sin
   disparar una navegación real.

4. **Separación valor interno / etiqueta**: los tipos se almacenan internamente
   en inglés (`"fire"`) pero se serializan a la URL en español (`"Fuego"`).
   La función `parse` acepta ambos formatos (inglés y español) al leer la URL.

5. **Filtros disponibles dinámicos**: `useFilterAvailability` calcula en cliente
   qué opciones de filtro siguen teniendo resultados dados los filtros ya activos.
   Los dropdowns muestran solo opciones viables.

**Archivos implicados:**

| Archivo | Funciones/componentes |
|---------|----------------------|
| `src/hooks/useFilters.ts` | `useFilters()` — hook canónico: `filters`, `setFilter()`, `removeFilter()`, `clearAll()`, `summary()`, `activeCount` |
| `src/lib/filters/serialization.ts` | `filtersToSearchParams()`, `searchParamsToFilters()`, `applyFilterChange()` |
| `src/lib/filters/types.ts` | `FILTERS` array (9 definiciones de filtro con `parse` y `format`), `FilterKey`, `Filters` interface |
| `src/components/filters/FiltersProvider.tsx` | `FiltersProvider` — Context wrapper de `useFilters` |
| `src/components/filters/FilterDropdowns.tsx` | Grid de 8 dropdowns + panel con opciones disponibles |
| `src/components/filters/SearchInput.tsx` | Combobox con debounce 300ms y sugerencias |
| `src/components/filters/useFilterAvailability.ts` | `useFilterAvailability()` — cómputo O(n) de disponibilidad cruzada |
| `src/components/filters/useFilterOptions.ts` | Carga asíncrona de opciones con caché en módulo |
| `src/components/pokedex/console/FilterConsole.tsx` | Terminal REPL — comandos de filtro hacia `setFilter()` |
| `src/components/pokedex/console/consoleParser.ts` | `parseCommand(input)` — texto a `ConsoleCommand` tipado |
| `src/components/pokedex/console/consoleExecutor.ts` | `resolveFilterValue(key, rawValue, options)` — resuelve alias |
| `src/lib/graphql/where.ts` | `buildPokemonWhere(filters)` — filtros a `pokemon_v2_pokemon_bool_exp`; `buildNameSearchWhere(term)`; `buildExpandedSearchWhere(term)` |

---

### 4.8 Tailwind CSS v4

**Qué hicimos:** Usamos Tailwind CSS v4 con el plugin de PostCSS y configuración
CSS-first (`@theme inline` en `globals.css`).

**Por qué v4 (y no v3):**

- **CSS-first configuration**: toda la configuración de diseño vive en CSS
  (`@theme`, `@layer`), no en JavaScript. Esto aprovecha las capacidades nativas
  del CSS moderno (cascada, herencia, custom properties).
- **Menos configuración**: v4 elimina `tailwind.config.ts`. Los colores, fuentes,
  breakpoints se definen directamente en CSS con `@theme`.
- **Zero-config friction**: no hay purgado de CSS no usado. v4 genera los estilos
  bajo demanda sin escanear el código fuente.

**Archivos implicados:**

| Archivo | Funciones/componentes |
|---------|----------------------|
| `src/app/globals.css` | `@import "tailwindcss"`, `@theme inline { ... }`, custom properties del proyecto |
| `postcss.config.mjs` | Plugin `@tailwindcss/postcss` |

---

### 4.9 Metodología TDD

**Qué hicimos:** Cada funcionalidad comenzó con tests unitarios antes del código.
87 archivos de test unitario cubren: utilidades, constantes, hooks, componentes,
capa de datos, GraphQL, filtros, chat IA y sistema de slots.

**Por qué TDD en este proyecto:**

- **PokeAPI es inestable**: el endpoint de GraphQL cayó durante el desarrollo. Los
  tests con fixtures capturados de respuestas reales nos permitieron seguir
  desarrollando sin depender de la disponibilidad del upstream.

- **Animaciones CSS coreografiadas**: la transición home a pokedex involucra ~20
  propiedades CSS sincronizadas. Sin tests, cualquier cambio accidental rompía el
  timing. Los tests validan que los atributos `data-view` cambian correctamente.

- **Contratos de filtros**: el mapeo valor con etiqueta (inglés con español) es propenso
  a errores. Los tests de serialización validan el round-trip completo.

- **Refactorización segura**: al tener cobertura amplia, pudimos migrar de
  `IntersectionObserver` a `scroll` nativo, cambiar el modelo de overlay lista-carrusel,
  y refactorizar la navegación sin miedo a regresiones.

**Archivos implicados:**

| Archivo | Funciones/componentes |
|---------|----------------------|
| `__tests__/` (87 archivos) | Tests unitarios con Vitest + Testing Library + jsdom |
| `__tests__/fixtures/pokeapi/` | Fixtures JSON capturados de PokeAPI real |
| `e2e/` (6 specs) | Tests E2E con Playwright |
| `scripts/capture-pokeapi-fixture.ts` | Script para regenerar fixtures desde PokeAPI |
| `vitest.config.ts`, `vitest.setup.ts` | Configuración de Vitest |
| `playwright.config.ts` | Configuración de Playwright |

---

### 4.10 Sistema de slots con atributos data-stub/data-pokemon

**Qué hicimos:** Cada componente slot emite atributos `data-stub` y `data-pokemon`
en su nodo raíz mediante la función `buildSlotAttrs()`.

```tsx
// Ejemplo en Button3DSlot.tsx
<div data-stub="button-3d" data-pokemon={pokemonName}>
```

**Por qué:**

- **Testabilidad sin depender de la posición visual**: los tests no necesitan
  inspeccionar el SVG ni las coordenadas de `foreignObject`. Basta con buscar
  `[data-stub="button-3d"]` para verificar que el slot existe.
- **E2E sin selectores frágiles**: `data-stub` es estable aunque cambie la
  estructura interna del SVG.
- **Depuración en desarrollo**: con React DevTools, inspeccionar `data-stub`
  identifica instantáneamente qué slot es cuál.

**Archivos implicados:**

| Archivo | Funciones/componentes |
|---------|----------------------|
| `src/components/pokedex/slots/types.ts` | `buildSlotAttrs({ stub, pokemonName, mode3D })` — retorna `SlotDataAttrs` con `data-stub`, `data-pokemon`, `data-mode` |
| `src/components/pokedex/slots/Button3DSlot.tsx` | `data-stub="button-3d"` |
| `src/components/pokedex/slots/ChipsSlot.tsx` | `data-stub="chips"` |
| `src/components/pokedex/slots/CarouselDotsSlot.tsx` | `data-stub="carousel-dots"` |
| `src/components/pokedex/slots/CarouselSlot.tsx` | `data-stub="carousel"` |
| `src/components/pokedex/slots/CarouselButtonsSlot.tsx` | `data-stub="carousel-buttons"` |
| `src/components/pokedex/slots/SoundSlot.tsx` | `data-stub="sound"` |
| `src/components/pokedex/slots/EvolutionsSlot.tsx` | `data-stub="evolutions"` |
| `src/components/pokedex/slots/StatsSlot.tsx` | `data-stub="stats"` |
| `src/components/pokedex/slots/ToggleStatsAbilitiesSlot.tsx` | `data-stub="toggle-stats"` |
| `src/components/pokedex/slots/FilterConsoleSlot.tsx` | `data-stub="filter-console"` |
| `src/components/pokedex/slots/FilterDropdownsSlot.tsx` | `data-stub="filter-dropdowns"` |
| `src/components/pokedex/slots/SearchResetFilterSlot.tsx` | `data-stub="search-reset"` |

---

### 4.11 Auto-retry con backoff del upstream

**Qué hicimos:** El cliente GraphQL detecta errores 5xx del upstream y los normaliza
con metadatos `retryable`, `retryAfter`. El hook `useFilteredPokemonList` reintenta
automáticamente hasta 3 veces, respetando el `retryAfterMs` sugerido.

**Por qué:**

- **Cloudflare 521 (`origin_down`) es común**: el endpoint de PokeAPI cae con
  frecuencia (a veces 1-2h). Cloudflare sugiere reintentar en 120s. Sin esta
  lógica, la app mostraría un error genérico.
- **Experiencia de usuario**: la UI muestra un mensaje específico
  ("La PokéAPI está temporalmente caída (Cloudflare 521). Reintentaremos
  automáticamente en 2:00") y un botón "Reintentar".
- **Sin dependencia externa**: no usamos librerías de retry. La lógica completa
  está en `client.ts` y `useFilteredPokemonList.ts`.

**Archivos implicados:**

| Archivo | Funciones/componentes |
|---------|----------------------|
| `src/lib/graphql/client.ts` | `GraphQLUpstreamError` (clase con `status`, `retryable`, `retryAfterMs`); `request<T>()` — parsea `Retry-After` header |
| `src/components/filters/useFilteredPokemonList.ts` | `useFilteredPokemonList()` — auto-retry con hasta 3 reintentos, backoff respetando `retryAfterMs`, expone `retry()` y `refresh()` |
| `src/app/api/pokeapi/route.ts` | Normalización de errores Cloudflare 521 a shape GraphQL con `extensions.code`, `retryable`, `retryAfter` |
| `src/components/pokedex/list/PokemonList.tsx` | Mensajes de error en español según código (`UPSTREAM_CLOUDFLARE_521`, `UPSTREAM_5XX`, etc.) + botón "Reintentar" |

---

### 4.12 Estrategia de caché

**Qué hicimos:** Definimos una política de caché centralizada en `cacheStrategy.ts`:

| Recurso | `revalidate` | Tags |
|---------|-------------|------|
| Lista de Pokémon | 3600s (1h) | `pokemon-data` |
| Detalle de Pokémon | 86400s (24h) | `pokemon-data`, `pokemon:<name>` |
| Opciones de filtros | 604800s (7d) | `pokemon-data`, `filter-options` |

**Por qué estos valores:**

- **Lista 1h**: los datos de la lista (nombres, tipos, sprites) cambian muy raramente.
- **Detalle 24h**: los datos de un Pokémon específico son esencialmente inmutables.
  Tag individual `pokemon:<name>` permite invalidar un Pokémon concreto con
  `revalidateTag('pokemon:pikachu')` sin tirar toda la caché.
- **Filtros 7d**: tipos, generaciones, colores y hábitats no han cambiado en años.
- **Sin `cacheComponents`**: usamos el modelo `next: { revalidate, tags }` en el
  `fetch` subyacente en lugar del nuevo `'use cache'` con `cacheLife`. Compatible
  con `output: "standalone"`.

**Archivos implicados:**

| Archivo | Funciones/componentes |
|---------|----------------------|
| `src/lib/pokemon/cacheStrategy.ts` | `POKEMON_LIST_CACHE_SECONDS`, `POKEMON_DETAIL_CACHE_SECONDS`, `FILTER_OPTIONS_CACHE_SECONDS`; `pokemonDetailTag(name)`, `LIST_CACHE`, `detailCache(name)`, `FILTER_CACHE` |
| `src/lib/pokemon/cachedPokemonApi.ts` | Todas las funciones de fetch pasan las configuraciones de `cacheStrategy.ts` a `request()` |
| `src/lib/graphql/client.ts` | `request<T>()` acepta `next?: { revalidate, tags }` y lo pasa al `fetch` nativo |

---

### 4.13 Three.js para el visor 3D

**Qué hicimos:** Implementamos un visor 3D que carga modelos GLB de Pokémon desde
un repositorio comunitario en GitHub (`Pokemon-3D-api`). Usa Three.js con
`GLTFLoader` + `DRACOLoader` para decodificación eficiente.

**Por qué Three.js y no React Three Fiber:**

- **Control directo**: necesitábamos control preciso sobre la cámara, iluminación,
  post-procesado (shader de saturación) y correcciones por modelo (Pikachu #25
  necesita rotación -90 grados en X). Con Three.js vanilla tenemos acceso completo.
- **Carga progresiva**: `usePokemonModel` tiene una caché a nivel de módulo
  (`Map<number, object>`). El preloader (`Model3DPreloader`) descarga el modelo
  en cuanto se selecciona un Pokémon, antes de que el usuario active el modo 3D.
- **Correcciones por modelo**: centralizadas en `MODEL_CORRECTIONS` para no
  manchar el código del visor con casos especiales.

**Archivos implicados:**

| Archivo | Funciones/componentes |
|---------|----------------------|
| `src/components/pokedex/3d/PokemonViewer3D.tsx` | Three.js scene: `GLTFLoader`, `DRACOLoader`, `EffectComposer`, shader de saturación, auto-rotación, drag-to-rotate |
| `src/components/pokedex/3d/usePokemonModel.ts` | `usePokemonModel(id)` — caché `Map<number, object>`, estados `idle-loading-ready-error`, `clearModelCache()` |
| `src/components/pokedex/3d/Model3DPreloader.tsx` | Precarga en background al seleccionar Pokémon |
| `src/components/pokedex/3d/Mode3DHabitatOverlay.tsx` | Overlay full-viewport vía `createPortal` con fondo de hábitat + visor 3D |
| `src/components/pokedex/3d/Mode3DViewBinder.tsx` | Sincroniza atributo `data-mode-3d` en `.pokedex-view` para el desplazamiento CSS |
| `public/draco/` | Decodificador Draco WASM para GLB comprimidos |

---

### 4.14 SSE para el chat de IA

**Qué hicimos:** El endpoint `/api/oak-chat` usa Server-Sent Events para enviar la
respuesta del modelo token por token, incluyendo eventos de razonamiento, llamadas
a herramientas y comandos de la Pokédex.

**Por qué SSE y no WebSockets:**

- **Unidireccional es suficiente**: el chat envía un mensaje y recibe una respuesta
  en streaming. No hay necesidad de comunicación bidireccional persistente.
- **Más simple**: SSE es HTTP plano. No requiere handshake de upgrade. Next.js lo
  soporta nativamente con `Response` y `ReadableStream`.
- **Rate limiting**: implementamos límite de 10 req/min por IP directamente en la ruta.
- **Reconexión nativa**: `EventSource` en el navegador reconecta automáticamente.

**Archivos implicados:**

| Archivo | Funciones/componentes |
|---------|----------------------|
| `src/app/api/oak-chat/route.ts` | `POST` handler — agente con MiniMax M3, emite eventos SSE (`delta`, `reasoning`, `tool_start`, `tool_end`, `tool_error`, `pokedex_command`, `done`, `error`) |
| `src/components/chat/OakChatContext.tsx` | `OakChatProvider` — parsea el stream SSE, gestiona `messages[]`, `status`, `pendingCommand`, `externalCommand` |
| `src/components/chat/OakChat.tsx` | Componente raíz del chat con avatar + burbuja |
| `src/components/chat/usePokedexCommand.ts` | `usePokedexCommand()` — escucha `pendingCommand` y ejecuta `apply_filters`/`show_pokemon` en la Pokédex |

---

### 4.15 Profesor Oak con function calling

**Qué hicimos:** El chat implementa un agente con 5 herramientas que permiten a la
IA controlar la Pokédex: buscar Pokémon, obtener info detallada, aplicar filtros,
mostrar un Pokémon y obtener info del propio Oak.

**Por qué function calling en vez de solo texto:**

- **Control real de la UI**: cuando el usuario dice "muéstrame a Pikachu", la IA
  emite un comando `show_pokemon` que la Pokédex ejecuta, navegando al carrusel.
- **Validación de argumentos**: `validateToolArgs` comprueba que los argumentos de
  la IA son válidos (tipos, generaciones, hábitats existentes) antes de ejecutar
  la herramienta.
- **Typewriter en la consola**: cuando la IA aplica filtros, el comando aparece
  en la consola retro con efecto typewriter.
- **Sistema extensible**: añadir una nueva capacidad es definir su schema JSON,
  su validador y su ejecutor. El agente está desacoplado.

**Archivos implicados:**

| Archivo | Funciones/componentes |
|---------|----------------------|
| `src/lib/chat/tools/definitions.ts` | `TOOL_DEFINITIONS` (5 schemas JSON con OpenAI function-calling format), `validateToolArgs(name, args)`, `TOOL_NAMES` |
| `src/lib/chat/tools/executor.ts` | `executeTool(name, args)` — dispatch a `search_pokemon`, `get_pokemon_info`, `get_oak_info`, `apply_filters`, `show_pokemon`; `getToolResultForModel(result)` |
| `src/components/chat/usePokedexCommand.ts` | `usePokedexCommand()` — ejecuta comandos de la IA: `apply_filters` a `setFilter()`, `show_pokemon` a `goToPokemon()` |
| `src/components/pokedex/console/FilterConsole.tsx` | Efecto typewriter para `externalCommand` del chat |
| `__tests__/chat/tools/definitions.test.ts` | Validación de argumentos para cada herramienta |
| `__tests__/chat/tools/executor.test.ts` | Ejecución de herramientas contra datos reales |

---

### 4.16 Output standalone para Docker

**Qué hicimos:** Configuramos `next.config.ts` con `output: "standalone"` y
creamos un `Dockerfile` multi-stage que genera una imagen de ~200MB.

**Por qué standalone:**

- **Build reproducible**: el output incluye todas las dependencias necesarias
  (node_modules mínimo) y el servidor Next.js. No requiere `npm install` en producción.
- **Imagen ligera**: el stage final usa `node:20-alpine`, copia solo el output de
  standalone (~50MB comprimido) y los assets estáticos de `public/`.
- **Non-root user**: el contenedor ejecuta como usuario `nextjs`.
- **Sin dependencia de Vercel**: la app puede desplegarse en cualquier hosting que
  soporte Docker (Fly.io, Railway, AWS ECS, VPS con Docker Compose).

**Archivos implicados:**

| Archivo | Funciones/componentes |
|---------|----------------------|
| `next.config.ts` | `output: "standalone"` |
| `Dockerfile` | Multi-stage build: `node:20-alpine` builder a runner con usuario `nextjs` |
| `.dockerignore` | Exclusiones para el contexto de build |

---

### 4.17 E2E con Playwright (uso moderado)

**Qué hicimos:** 6 specs E2E que cubren exclusivamente comportamientos que cruzan
la barrera cliente/servidor o requieren un navegador real.

**Por qué solo 6 specs y no más:**

- **Coste-beneficio**: los tests E2E requieren `npm run dev` + navegador real.
  Son lentos (~60-90s por spec) y frágiles (cualquier cambio de CSS los rompe).
  La mayoría de comportamientos se validan mejor con tests unitarios (rápidos,
  deterministas, aislados).

- **Cobertura estratégica**: cada spec E2E cubre un escenario que NO puede
  validarse en jsdom:
  - `not-found.spec.ts` — respuesta HTTP 404 real.
  - `pokedex-shell.spec.ts` — viewport responsive con dimensiones reales.
  - `transition.spec.ts` — smoke de la transición home a pokedex.
  - `filter-console.spec.ts` — scroll real del contenedor.
  - `filters-bidirectional.spec.ts` — flujo completo consola, dropdowns, URL, buscador.
  - `oak-chat.spec.ts` — integración real con MiniMax M3 (requiere API key,
    skippeable con `POKEAPI_REACHABLE`).

- **Anti-patrón evitado**: NO hay un E2E por componente visual (card, dropdown,
  chip). Esas validaciones viven en tests unitarios con `data-testid`.

**Archivos implicados:**

| Archivo | Funciones/componentes |
|---------|----------------------|
| `e2e/not-found.spec.ts` | HTTP 404, mensaje español, link "VOLVER AL INICIO" |
| `e2e/pokedex-shell.spec.ts` | SVG render, no-scroll, carcasa vertical/horizontal según viewport |
| `e2e/transition.spec.ts` | Smoke mínimo: home renderiza con `data-view="home"`, Pokédex pre-renderizada |
| `e2e/filter-console.spec.ts` | Consola: `overflow-y: auto`, scrollHeight crece con comandos, input multi-word |
| `e2e/filters-bidirectional.spec.ts` | Flujo completo mockeando PokeAPI: dropdown a URL, consola a URL, URL a dropdowns, search a URL, reset |
| `e2e/oak-chat.spec.ts` | `@live-api`: avatar visible, respuesta >5 chars, show_pokemon, filter, persona Oak |
| `playwright.config.ts` | Configuración: Chromium, 90s timeout, webServer auto-start |

---

### 4.18 Fixtures de PokeAPI real en tests

**Qué hicimos:** En lugar de inventar objetos literales para los tests, capturamos
respuestas reales del endpoint GraphQL con `scripts/capture-pokeapi-fixture.ts` y
las guardamos como JSON versionado en `__tests__/fixtures/pokeapi/`.

**Por qué:**

- **Fidelidad de datos**: un objeto inventado podría tener un campo `cry` donde
  la API real no lo devuelve (el endpoint v1beta no expone cries, usamos REST
  fallback). Los fixtures reales revelan estas discrepancias inmediatamente.
- **Control de cambios de API**: si PokeAPI cambia su schema, al regenerar los
  fixtures el script avisa de diferencias.
- **Tests offline**: los tests de capa de datos no dependen de conectividad.
  Ejecutan en CI sin red, en milisegundos.

**Archivos implicados:**

| Archivo | Funciones/componentes |
|---------|----------------------|
| `scripts/capture-pokeapi-fixture.ts` | Script que ejecuta queries reales contra `beta.pokeapi.co/graphql/v1beta` y guarda el JSON |
| `__tests__/fixtures/pokeapi/pikachu.json` | Respuesta completa de pikachu (id=25) |
| `__tests__/fixtures/pokeapi/eevee.json` | Respuesta completa de eevee (id=133) |
| `__tests__/fixtures/pokeapi/magikarp.json` | Respuesta completa de magikarp (id=129) |
| `__tests__/fixtures/pokeapi/mewtwo.json` | Respuesta completa de mewtwo (id=150) |
| `__tests__/fixtures/pokeapi/filter-options/` | Fixtures para tipos, generaciones, colores, hábitats, habilidades |
| `__tests__/pokemon/fetchDetail.test.ts` | Usa `pikachu.json`, `eevee.json`, `magikarp.json` para validar mapeos |
| `__tests__/pokemon/fetchFilterOptions.test.ts` | Usa fixtures de `filter-options/` para validar opciones y buckets |

---

### 4.19 Sin virtualización en la lista

**Qué hicimos:** La lista de Pokémon renderiza todos los items cargados en el DOM
sin virtualización ni windowing.

**Por qué NO virtualizar:**

- **Escala manejable**: el máximo teórico son 1025 tarjetas de 64px cada una.
  El DOM resultante (~65,000px de scroll) es perfectamente manejable por cualquier
  navegador moderno.
- **Animaciones de entrada**: cada tarjeta tiene una animación CSS
  (`pokemon-list-card-enter`) de 280ms. La virtualización con `position: absolute`
  + `transform` rompería esta animación.
- **Experiencia de scroll**: con virtualización, el navegador debe reciclar y
  reposicionar elementos constantemente, causando "pop-in" perceptible.
- **Simplicidad**: `PokemonList.tsx` son ~100 líneas. Una solución virtualizada
  triplicaría el código y añadiría una dependencia externa.

**Archivos implicados:**

| Archivo | Funciones/componentes |
|---------|----------------------|
| `src/components/pokedex/list/PokemonList.tsx` | Renderizado directo de items sin virtualización: `items.map(item => <PokemonListCard>)` |
| `src/components/pokedex/list/pokemon-list.css` | Animación `pokemon-list-card-enter` de 280ms con `animation-fill-mode: both` |

---

### 4.20 Interfaz en español

**Qué hicimos:** Toda la interfaz está en español: etiquetas, mensajes de error,
comandos de consola, metadata SEO, respuestas del chat.

**Por qué español:**

- **Público objetivo**: el proyecto se presentó a un equipo hispanohablante.
- **Consistencia con el lore**: Pokémon siempre se ha localizado al español. Los
  nombres de tipos (`Fuego`, `Agua`), hábitats (`Bosque`, `Caverna`) y comandos
  (`tipo1 fuego`, `generacion i`) usan la terminología oficial de los juegos.
- **Mapeo bidireccional en filtros**: los valores internos son ingleses (`"fire"`)
  porque la API los devuelve así, pero la URL los serializa en español
  (`type1=Fuego`). El parser acepta ambos formatos.

**Archivos implicados:**

| Archivo | Funciones/componentes |
|---------|----------------------|
| `src/lib/constants/pokemonTypes.ts` | `POKEMON_TYPE_LABELS` — 18 tipos en español (inglés a español) |
| `src/lib/filters/types.ts` | `format()` — serializa tipos a etiqueta española; `parse()` — acepta inglés y español |
| `src/lib/filters/serialization.ts` | `filtersToSearchParams()` — URL con etiquetas en español |
| `src/lib/pokemon/mapRawList.ts` | `asHabitat()` — inglés (API) a español (interno) |
| `src/lib/pokemon/fetchFilterOptions.ts` | `mapTypes()`, `mapGenerations()`, `mapColors()`, `mapHabitats()` — todos mapean a español |
| `src/lib/graphql/where.ts` | `HABITAT_REVERSE_ALIAS` — español (filtro) a inglés (GraphQL where) |
| `src/app/layout.tsx` | `<html lang="es">` |
| `src/app/not-found.tsx` | "POKÉMON NO ENCONTRADO", "VOLVER AL INICIO" |
| `src/components/pokedex/console/welcome.ts` | Mensaje ASCII en español del Prof. Oak |

---

### 4.21 Transiciones solo con CSS (sin librerías de animación)

**Qué hicimos:** Todas las animaciones y transiciones de la app se implementan con
CSS vanilla (@keyframes, `transition`, `animation`). No usamos Framer Motion, GSAP
ni ninguna librería de animación JS.

**Por qué:**

- **Tamaño de bundle**: Framer Motion pesa ~30KB gzipped. Para las animaciones
  que necesitamos (fade, slide, scale, rotate), CSS es más que suficiente.
- **Performance**: las animaciones CSS se ejecutan en el compositor del navegador,
  fuera del hilo principal de JavaScript. No compiten con React por tiempo de CPU.
- **`prefers-reduced-motion`**: las media queries CSS deshabilitan instantáneamente
  todas las animaciones, respetando la configuración de accesibilidad del SO.
- **Coreografía compleja con `data-view`**: la transición home a pokedex coordina
  ~10 elementos independientes usando selectores `[data-view="home"]` y
  `[data-view="pokedex"]` con CSS custom properties.

**Archivos implicados:**

| Archivo | Funciones/componentes |
|---------|----------------------|
| `src/app/globals.css` | `@keyframes` para `pokeball-rotate`, `pokeball-bob`, `home-tile-drift`, `home-slider-enter/exit`, `home-ash-breathe`, `home-pokedex-glow`, `home-press-start-pulse`; selectores `[data-view]` con custom properties |
| `src/components/pokedex/list/pokemon-list.css` | `pokemon-list-card-enter` |
| `src/components/pokedex/carousel/pokemon-carousel.css` | Transiciones de slide y crossfade del carrusel |
| `src/components/pokedex/carcases/pokedex-carcase.css` | Layout de la carcasa SVG |
| `src/components/filters/filter-controls.css` | Estilos de dropdowns y búsqueda |
| `src/components/chat/oak-chat.css` | Animaciones del chat |
| `src/components/loading/loading-pikachu.css` | Animación del Pikachu de carga |

---

## 5. Diagrama de arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                        NEXT.JS APP ROUTER                        │
│                                                                  │
│  /            /pokedex        /pokemon/[name]       /api/...     │
│  page.tsx     page.tsx        page.tsx              route.ts     │
│  │            │               │                     │            │
│  └────────────┴───────────────┘                     │            │
│       │                                              │            │
│       ▼                                              ▼            │
│  ┌──────────────────┐                    ┌─────────────────────┐ │
│  │   AppShell.tsx    │                    │  GraphQL proxy      │ │
│  │  (SPA container)  │                    │  Oak Chat SSE       │ │
│  └──────┬───────────┘                    └─────────────────────┘ │
│         │                                                        │
│    ┌────┴─────────────────────┐                                  │
│    │                          │                                  │
│    ▼                          ▼                                  │
│  ┌──────────────┐    ┌──────────────────────┐                    │
│  │  home-view   │    │   pokedex-view       │                    │
│  │  (siempre    │    │   (siempre montada)  │                    │
│  │   montada)   │    │                      │                    │
│  │              │    │  FiltersProvider     │                    │
│  │  HomeShell   │    │  PokedexPageProvider │                    │
│  │  SoundToggle │    │  OakChatProvider     │                    │
│  │  Slider      │    │                      │                    │
│  │              │    │  PokedexShell.tsx    │ ◄── Ensamblador    │
│  └──────────────┘    │  ├─ SVG carcasa      │                    │
│                      │  └─ 12 Slots         │                    │
│                      │                      │                    │
│                      │  CarouselProvider    │                    │
│                      │  PokemonList         │ ◄── Scroll infinito│
│                      │  CarouselOverlay     │ ◄── Overlay lista  │
│                      │  FilterConsole       │                    │
│                      │  FilterDropdowns     │                    │
│                      │  EvolutionsSlot      │                    │
│                      │  StatsSlot           │                    │
│                      │  3D Viewer (portal)  │                    │
│                      └──────────────────────┘                    │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                     DATA LAYER                             │  │
│  │                                                            │  │
│  │  cachedPokemonApi.ts (React.cache)                         │  │
│  │  ├─ fetchPokemonList()    ──► POKEMON_LIST_QUERY           │  │
│  │  ├─ applyFiltersToList()  ──► POKEMON_LIST_FILTERED_QUERY  │  │
│  │  ├─ fetchPokemonDetail()  ──► POKEMON_DETAIL_QUERY         │  │
│  │  └─ fetchFilterOptions()  ──► FILTER_OPTIONS_QUERY         │  │
│  │                                                            │  │
│  │  client.ts ──► request<T>() ──► beta.pokeapi.co/graphql   │  │
│  │  where.ts  ──► buildPokemonWhere() ──► Hasura bool_exp     │  │
│  │  cacheStrategy.ts ──► revalidate + tags                    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                     STATE LAYER                            │  │
│  │                                                            │  │
│  │  ViewContext.tsx ──► useAppShell() ──► pushState/popstate │  │
│  │  useFilters.ts  ──► setFilter()   ──► router.replace()    │  │
│  │  serialization.ts ──► filtersToSearchParams()              │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Jerarquía de providers

```
AppShellProvider (ViewContext)
 ├── .home-view (z-10, siempre montada)
 │    └── HomeViewContent (+ SoundToggle con crossfade propio)
 └── .pokedex-view (z-20, siempre montada)
           └── Suspense
                └── FiltersProvider (useFilters a URL sync)
                     └── PokedexPageProvider (selectedName, 3D, stats/abilities)
                          └── OakChatProvider (chat IA)
                               ├── PokedexHomeButton
                               ├── PokedexShell (ensamblador de slots)
                               │    └── CarouselProvider (fetch detail)
                               ├── DataLoadingAggregator (LoadingPikachu)
                               └── OakChat (avatar + burbuja)
```

### Flujo de selección de Pokémon

```
Click en card de la lista
        │
        ▼
goToPokemon("pikachu")
        │
        ▼
history.pushState({}, '', '/pokemon/pikachu')
        │
        ▼
setPathname('/pokemon/pikachu')
        │
        ▼
PokedexPageContext.selectedName = "pikachu"
        │
        ├──► CarouselController: fetchPokemonDetail("pikachu")
        │         │
        │         ▼
        │    Todos los slots reciben el detalle:
        │    - ChipsSlot: tipos + generación
        │    - CarouselSlot: overlay con carrusel
        │    - EvolutionsSlot: cadena evolutiva
        │    - StatsSlot: stats + habilidades
        │    - SoundSlot: botón de cry
        │
        └──► Model3DPreloader: precarga del GLB
```

### Flujo de aplicación de filtros

```
Usuario escribe "tipo1 fuego" en la consola
        │
        ▼
FilterConsole: parseCommand("tipo1 fuego")
        │
        ▼
consoleExecutor: resolveFilterValue("type1", "fuego", options)
        │ (traduce "fuego" a "fire" - valor interno)
        ▼
useFilters().setFilter("type1", "fire")
        │
        ├──► filtersToSearchParams({ type1: "fire" }) a "type1=Fuego"
        │         │
        │         ▼
        │    router.replace("/pokedex?type1=Fuego", { scroll: false })
        │
        ├──► useFilteredPokemonList reacciona al cambio de filtros
        │         │
        │         ▼
        │    applyFiltersToList({ type1: "fire" }, 0)
        │         │
        │         ▼
        │    buildPokemonWhere({ type1: "fire" })
        │         │
        │         ▼
        │    client.request(POKEMON_LIST_FILTERED_QUERY, { where, offset, limit })
        │         │
        │         ▼
        │    PokemonList recibe nuevos items
        │
        └──► useFilterAvailability recalcula opciones disponibles
                  │
                  ▼
             FilterDropdowns muestra solo tipos que tienen resultados
             (ej. si type1=fire, type2 muestra agua, volador, etc.)
```

---

## 6. Mapa de archivos

### 6.1 Entry points

| Archivo | Responsabilidad | Dependencias clave |
|---------|----------------|-------------------|
| `src/app/layout.tsx` | Layout raíz: fuente pixel, metadata SEO | — |
| `src/app/page.tsx` | Ruta `/` — pantalla de inicio | `AppShell`, `HomeShell` |
| `src/app/pokedex/page.tsx` | Ruta `/pokedex` | `PokedexPageTransition` |
| `src/app/pokemon/[name]/page.tsx` | Ruta `/pokemon/<name>` + metadata dinámica | `PokedexPageTransition` |
| `src/app/not-found.tsx` | 404 personalizado estilo pixel art | `Pokeball` SVG |
| `src/app/globals.css` | Tailwind v4 + animaciones globales + coreografía | — |
| `src/app/api/pokeapi/route.ts` | Proxy GraphQL (POST) con normalización de errores | `client.ts` |
| `src/app/api/oak-chat/route.ts` | Chat IA SSE con rate limiting | `executor.ts`, MiniMax API |

### 6.2 App Shell & Navegación

| Archivo | Responsabilidad | Dependencias clave |
|---------|----------------|-------------------|
| `src/components/app/AppShell.tsx` | Contenedor SPA: home + Pokédex siempre montados | `ViewContext` |
| `src/components/app/ViewContext.tsx` | Estado global: `view`, `pathname`, `selectedName` + `pushState` | `useNavigation` |
| `src/components/app/PokedexPageTransition.tsx` | Shell inverso para deep-links (transición de entrada) | `AppShell` |
| `src/components/app/PokedexOverlay.tsx` | Sub-árbol de la Pokédex con todos sus providers | `PokedexShell`, `OakChatProvider` |
| `src/hooks/useNavigation.ts` | Navegación SPA: `pushState`, `popstate`, `router` | `NavigationSSRContext` |
| `src/hooks/NavigationSSRContext.tsx` | Puente SSR a cliente para evitar hydration mismatch | — |
| `src/hooks/useViewportLayout.ts` | Detección responsive (vertical <768px, horizontal >=768px) | — |

### 6.3 Pokédex — Carcasa y Slots

| Archivo | Responsabilidad | Dependencias clave |
|---------|----------------|-------------------|
| `src/components/pokedex/PokedexShell.tsx` | Ensamblador: elige carcasa + rellena 12 slots | `useViewportLayout`, `PokedexPageProvider` |
| `src/components/pokedex/PokedexPageProvider.tsx` | Estado local de la Pokédex (3D, stats/abilities, selectedName) | `useAppShell` |
| `src/components/pokedex/PokedexHomeButton.tsx` | Botón flotante para volver a home | `useAppShell` |
| `src/components/pokedex/carcases/PokedexVerticalSvg.tsx` | SVG vertical con 12 `SlotLayer` | `slots.ts` |
| `src/components/pokedex/carcases/PokedexHorizontalSvg.tsx` | SVG horizontal con 12 `SlotLayer` | `slots.ts` |
| `src/components/pokedex/carcases/SlotLayer.tsx` | Inyecta contenido React en `<foreignObject>` SVG | — |
| `src/components/pokedex/carcases/slots.ts` | Tipos: `SlotName`, `SlotMap`, `SLOT_NAMES` | — |
| `src/components/pokedex/slots/types.ts` | `SlotStubProps`, `buildSlotAttrs()`, `SlotDataAttrs` | — |
| `src/components/pokedex/slots/Button3DSlot.tsx` | Toggle modo 3D | `PokedexPageProvider` |
| `src/components/pokedex/slots/ChipsSlot.tsx` | Chips de tipo1, tipo2, generación | `CarouselController` |
| `src/components/pokedex/slots/CarouselDotsSlot.tsx` | Puntos de navegación del carrusel | `CarouselController` |
| `src/components/pokedex/slots/CarouselSlot.tsx` | Overlay lista sobre carrusel | `useAppShell`, `PokemonList`, `PokemonCarousel` |
| `src/components/pokedex/slots/CarouselButtonsSlot.tsx` | Botones prev/next del carrusel | `CarouselController` |
| `src/components/pokedex/slots/SoundSlot.tsx` | Botón de cry del Pokémon | `CarouselController` |
| `src/components/pokedex/slots/EvolutionsSlot.tsx` | Cadena evolutiva (LCD green) | `CarouselController` |
| `src/components/pokedex/slots/StatsSlot.tsx` | Stats o habilidades (toggle) | `CarouselController`, `PokedexPageProvider` |
| `src/components/pokedex/slots/ToggleStatsAbilitiesSlot.tsx` | Botón toggle stats-habilidades | `PokedexPageProvider` |
| `src/components/pokedex/slots/FilterConsoleSlot.tsx` | Consola de comandos retro | `OakChatContext` (comando externo) |
| `src/components/pokedex/slots/FilterDropdownsSlot.tsx` | Grid de 8 dropdowns de filtro | `FilterDropdowns` |
| `src/components/pokedex/slots/SearchResetFilterSlot.tsx` | Búsqueda + botones Reset/Filtrar | `SearchInput`, `ResetFilterButtons` |

### 6.4 Carrusel de Pokémon

| Archivo | Responsabilidad | Dependencias clave |
|---------|----------------|-------------------|
| `src/components/pokedex/carousel/CarouselController.tsx` | Provider: fetch detail + estado del carrusel | `fetchPokemonDetail` |
| `src/components/pokedex/carousel/PokemonCarousel.tsx` | Presentación de slides (hero, flavor, gallery) | `CarouselController` |
| `src/components/pokedex/carousel/CarouselButtons.tsx` | Botones izquierda/derecha estilo arcade | — |
| `src/components/pokedex/carousel/CarouselDots.tsx` | Indicadores LED de posición | — |
| `src/components/pokedex/carousel/PokemonSoundButton.tsx` | Reproducción de cry con `Audio` API | — |

### 6.5 Lista de Pokémon

| Archivo | Responsabilidad | Dependencias clave |
|---------|----------------|-------------------|
| `src/components/pokedex/list/PokemonList.tsx` | Scroll infinito con evento `scroll` nativo | `useFilteredPokemonList` |
| `src/components/pokedex/list/PokemonListCard.tsx` | Tarjeta individual (nombre, chips, sprite) | `POKEMON_TYPE_COLORS`, `POKEMON_GENERATION_COLORS` |

### 6.6 Consola de Filtros

| Archivo | Responsabilidad | Dependencias clave |
|---------|----------------|-------------------|
| `src/components/pokedex/console/FilterConsole.tsx` | Terminal REPL con historial y typewriter | `useFilters` |
| `src/components/pokedex/console/consoleParser.ts` | `parseCommand()` — texto a comando tipado | — |
| `src/components/pokedex/console/consoleExecutor.ts` | `resolveFilterValue()` — resuelve alias | `fetchFilterOptions` |
| `src/components/pokedex/console/welcome.ts` | Mensaje ASCII de bienvenida del Prof. Oak | — |

### 6.7 Sistema de Filtros

| Archivo | Responsabilidad | Dependencias clave |
|---------|----------------|-------------------|
| `src/hooks/useFilters.ts` | Única fuente de verdad del estado de filtros | `serialization.ts`, `useNavigation` |
| `src/components/filters/FiltersProvider.tsx` | Context wrapper de `useFilters` | `useFilters` |
| `src/components/filters/FilterDropdowns.tsx` | Grid de 8 dropdowns con disponibilidad | `useFilterOptions`, `useFilterAvailability` |
| `src/components/filters/SearchInput.tsx` | Búsqueda con sugerencias (debounce 300ms) | `useFilters`, `useAppShell` |
| `src/components/filters/ResetFilterButtons.tsx` | Botones Reset y Filtrar | `useFilters` |
| `src/components/filters/useFilteredPokemonList.ts` | Hook: paginación + auto-retry + filtros | `applyFiltersToList` |
| `src/components/filters/useFilterOptions.ts` | Carga asíncrona de opciones con caché | `fetchFilterOptions` |
| `src/components/filters/useFilterAvailability.ts` | Disponibilidad cruzada de filtros | `fetchAllPokemonFilterFields` |
| `src/lib/filters/types.ts` | Definiciones de filtros (`FILTERS` array) | `POKEMON_TYPE_LABELS` |
| `src/lib/filters/serialization.ts` | `filtersToSearchParams` / `searchParamsToFilters` | `FILTERS` |

### 6.8 Visor 3D

| Archivo | Responsabilidad | Dependencias clave |
|---------|----------------|-------------------|
| `src/components/pokedex/3d/PokemonViewer3D.tsx` | Three.js: carga GLB, rotación, post-procesado | `usePokemonModel` |
| `src/components/pokedex/3d/usePokemonModel.ts` | Caché de modelos GLB (module-level Map) | `three` |
| `src/components/pokedex/3d/Model3DPreloader.tsx` | Precarga de modelo en background | `usePokemonModel` |
| `src/components/pokedex/3d/Mode3DHabitatOverlay.tsx` | Overlay full-viewport (portal) con hábitat + 3D | `usePokemonModel` |
| `src/components/pokedex/3d/Mode3DViewBinder.tsx` | Sincroniza `data-mode-3d` en `.pokedex-view` | — |

### 6.9 Chat Profesor Oak

| Archivo | Responsabilidad | Dependencias clave |
|---------|----------------|-------------------|
| `src/components/chat/OakChatContext.tsx` | Estado del chat + parseo de SSE | `EventSource` |
| `src/components/chat/OakChat.tsx` | Componente raíz del chat | `OakChatContext` |
| `src/components/chat/OakChatBubble.tsx` | Burbuja de chat (abierta/cerrada) | `OakChatContext` |
| `src/components/chat/OakChatInput.tsx` | Input con animación de placeholder | `OakChatContext` |
| `src/components/chat/OakChatAssistantMessage.tsx` | Mensaje del asistente (razonamiento + tools) | `react-markdown` |
| `src/components/chat/OakChatUserMessage.tsx` | Mensaje del usuario | — |
| `src/components/chat/OakChatReasoningBubble.tsx` | Burbuja de razonamiento expandible | — |
| `src/components/chat/OakChatToolBubble.tsx` | Visualización de tool call (spinner/check/error) | — |
| `src/components/chat/OakChatMarkdown.tsx` | Renderizado de Markdown | `react-markdown`, `remark-gfm` |
| `src/components/chat/OakChatLoading.tsx` | Indicador de carga (dots) | — |
| `src/components/chat/OakChatAvatar.tsx` | Avatar del Prof. Oak (click para abrir/cerrar) | `OakChatContext` |
| `src/components/chat/usePokedexCommand.ts` | Ejecuta comandos de la IA en la Pokédex | `OakChatContext`, `useFilters`, `useAppShell` |
| `src/lib/chat/tools/definitions.ts` | Schemas JSON de 5 herramientas + validación | — |
| `src/lib/chat/tools/executor.ts` | Ejecutor: `search_pokemon`, `get_pokemon_info`, etc. | `applyFiltersToList`, `fetchPokemonDetail` |

### 6.10 Home

| Archivo | Responsabilidad | Dependencias clave |
|---------|----------------|-------------------|
| `src/components/home/HomeShell.tsx` | Wrapper de home con `AppShell` + listeners | `AppShell`, `HomeViewNavListeners` |
| `src/components/home/HomeViewContent.tsx` | Server Component: layout de la home | `SoundToggle`, `PressStartButton`, `PokemonSlider` |
| `src/components/home/HomeViewNavListeners.tsx` | Teclado/click a navegar a Pokédex | `useAppShell` |
| `src/components/home/PressStartButton.tsx` | Botón arcade "PRESS START" | `useAppShell` |
| `src/components/home/PokemonSlider.tsx` | Slider de 10 Pokémon SVG (3 fases) | — |
| `src/components/home/SoundToggle.tsx` | Toggle de música con persistencia localStorage y crossfade por vista | `ViewContext` |
| `src/components/home/AnimatedBackground.tsx` | Fondo con tile drift diagonal (18s) | — |

### 6.11 Capa de Datos (GraphQL + Fetching)

| Archivo | Responsabilidad | Dependencias clave |
|---------|----------------|-------------------|
| `src/lib/graphql/client.ts` | `request<T>()` — cliente HTTP GraphQL unificado | `getPokeApiEndpoint` |
| `src/lib/graphql/types.ts` | Tipos: `GraphQLResponse`, `GraphQLRequestError` | — |
| `src/lib/graphql/where.ts` | `buildPokemonWhere()` — filtros a Hasura bool_exp | — |
| `src/lib/graphql/queries/pokemonList.gql.ts` | Query de lista sin filtros | — |
| `src/lib/graphql/queries/pokemonListFiltered.gql.ts` | Query de lista con filtros + aggregate | — |
| `src/lib/graphql/queries/pokemonDetail.gql.ts` | Query de detalle completo (88 líneas) | — |
| `src/lib/graphql/queries/filterOptions.gql.ts` | 7 queries para opciones de filtro | — |
| `src/lib/pokemon/cachedPokemonApi.ts` | API pública cacheada (`React.cache`) | Todas las `fetch*` |
| `src/lib/pokemon/cacheStrategy.ts` | Política de caché: revalidate + tags | — |
| `src/lib/pokemon/fetchList.ts` | Fetch de lista paginada sin filtros | `POKEMON_LIST_QUERY` |
| `src/lib/pokemon/fetchListFiltered.ts` | Fetch de lista con filtros + búsqueda expandida | `POKEMON_LIST_FILTERED_QUERY`, `where.ts` |
| `src/lib/pokemon/fetchDetail.ts` | Fetch de detalle + REST fallback para cry | `POKEMON_DETAIL_QUERY` |
| `src/lib/pokemon/fetchFilterOptions.ts` | Fetch de opciones para dropdowns | `FILTER_OPTIONS_QUERY` |
| `src/lib/pokemon/fetchFilterAvailability.ts` | Fetch de todos los Pokémon (solo campos de filtro) | `ALL_POKEMON_FILTER_FIELDS_QUERY` |
| `src/lib/pokemon/mapRawList.ts` | Normalización: raw JSON a `PokemonListItem` | — |
| `src/lib/pokemon/listRaw.ts` | Interfaces TypeScript para raw JSON | — |

### 6.12 Constantes y Tipos

| Archivo | Responsabilidad |
|---------|----------------|
| `src/lib/types/pokemon.ts` | Tipos centrales: `PokemonDetail`, `PokemonListItem`, `FilterOption`, `POKEMON_TYPES`, `GENERATIONS`, `HABITATS` |
| `src/lib/constants/colors.ts` | Paleta base: garnet, yellowOrange, green, cyanButton, bodyGradient |
| `src/lib/constants/pokemonTypes.ts` | `POKEMON_TYPE_LABELS` (18 tipos en español) + `POKEMON_TYPE_COLORS` |
| `src/lib/constants/pokemonGenerations.ts` | `POKEMON_GENERATION_COLORS` (I-IX) |
| `src/lib/constants/habitats.ts` | `HABITAT_IMAGES` (10 hábitats a .webp) |
| `src/lib/utils/capitalize.ts` | Utilidad: capitalizar primera letra |
| `src/lib/utils/search-params.ts` | Utilidad: `searchParams` Promise a query string |

### 6.13 Tests

| Directorio | Cobertura |
|-----------|-----------|
| `__tests__/capitalize.test.ts` | `capitalize()` |
| `__tests__/habitats.test.ts` | `HABITAT_IMAGES` |
| `__tests__/pokemonGenerations.test.ts` | `POKEMON_GENERATION_COLORS` |
| `__tests__/pokemonTypes.test.ts` | `POKEMON_TYPE_LABELS` + `POKEMON_TYPE_COLORS` |
| `__tests__/filters/serialization.test.ts` | Round-trip filtros a URL, `applyFilterChange` |
| `__tests__/graphql/client.test.ts` | `getPokeApiEndpoint`, `request()`, error handling |
| `__tests__/graphql/where.test.ts` | `normalizeSearchTerm`, `buildNameSearchWhere`, `buildExpandedSearchWhere` |
| `__tests__/pokemon/cachedPokemonApi.test.ts` | Dedupe React.cache, cache strategy, precarga |
| `__tests__/pokemon/fetchDetail.test.ts` | Query fields, `buildEvolutionChain`, `fetchPokemonDetail` |
| `__tests__/pokemon/fetchFilterOptions.test.ts` | Todos los mapeos de opciones, buckets, error handling |
| `__tests__/pokemon/fetchList.test.ts` | Paginación, mapeo, `createPokemonListPager` |
| `__tests__/pokemon/fetchListFiltered.test.ts` | Filtros, búsqueda, expanded search, paginación |
| `__tests__/hooks/useFilters.test.tsx` | Sincronización URL, setFilter, removeFilter, clearAll, summary |
| `__tests__/hooks/useViewportLayout.test.ts` | Breakpoint 768px, resize, server-safe |
| `__tests__/app/api/pokeapi/route.test.ts` | Proxy: reenvío, errores, Cloudflare 521, live integration |
| `__tests__/components/home/*` | AnimatedBackground, PokemonSlider, SoundToggle |
| `__tests__/components/loading/*` | LoadingPikachu (animationend), DataLoadingAggregator (minVisibleMs) |
| `__tests__/components/filters/*` | FilterDropdowns, FiltersProvider, ResetFilterButtons, SearchInput, useActiveFiltersCount, useFilteredPokemonList, useFilterOptions |
| `__tests__/components/pokedex/PokedexShell.test.tsx` | Ensamblador: 13 slots, atributos, orientación |
| `__tests__/components/pokedex/carcases/*` | SVG vertical/horizontal: viewBox, slots, CSS classes |
| `__tests__/components/pokedex/carousel/*` | CarouselButtons, CarouselDots, PokemonCarousel, PokemonSoundButton, integración |
| `__tests__/components/pokedex/console/*` | consoleParser, consoleExecutor, FilterConsole |
| `__tests__/components/pokedex/list/*` | PokemonListCard (chips, colores, accesibilidad) |
| `__tests__/components/pokedex/3d/*` | Mode3DHabitatOverlay, Mode3DViewBinder, usePokemonModel |
| `__tests__/components/pokedex/slots/*` | Button3DSlot, CarouselSlot (overlay), ChipsSlot, EvolutionsSlot, StatsSlot, ToggleStatsAbilitiesSlot |
| `__tests__/chat/*` | OakChatAvatar, OakChatBubble, OakChatInput, OakChatMessages, OakChatProvider, integración, usePokedexCommand, api/oak-chat, tools/definitions, tools/executor |
| `e2e/not-found.spec.ts` | 404: HTTP status, mensaje, link "VOLVER AL INICIO" |
| `e2e/pokedex-shell.spec.ts` | Shell: SVG render, no scroll, vertical/horizontal |
| `e2e/transition.spec.ts` | Smoke: home a pokedex view transition |
| `e2e/filter-console.spec.ts` | Consola: scroll, help command, input, multi-word search |
| `e2e/filters-bidirectional.spec.ts` | Flujo completo: dropdowns a URL a consola a buscador |
| `e2e/oak-chat.spec.ts` | Chat IA live: avatar, respuesta, show_pokemon, filtros, persona Oak |

---

## 7. Banco de preguntas de entrevista

Preguntas probables con referencias precisas a archivos y código para respaldar cada
respuesta.

---

### Navegación y SPA

**P1: ¿Cómo evitas que Next.js desmonte el árbol al cambiar de Pokémon?**

El router de Next.js trata cada cambio de pathname como una navegación nueva,
desmontando componentes y perdiendo estado (música, scroll, filtros). En su lugar,
`ViewContext.tsx` expone `goToPokemon(name)` que usa
`window.history.pushState({}, '', '/pokemon/<name>')` seguido de `setPathname()`.
Esto actualiza la URL sin que Next.js intervenga. El listener de `popstate` en el
mismo archivo sincroniza el estado cuando el usuario usa los botones atrás/adelante.

> **Archivos:** `src/components/app/ViewContext.tsx` — `goToPokemon()`, `handlePopState()`
> **Archivos:** `src/hooks/useNavigation.ts` — `subscribe()`, `router` proxy

---

**P2: ¿Cómo diferencias un cambio de URL "desde dentro" de uno "desde fuera"?**

Cuando el usuario hace click en una card, `goToPokemon(name)` llama a `pushState` y
establece `view="pokedex"` directamente. La animación es solo del overlay del
carrusel (scale + fade en `CarouselSlot.tsx`). Cuando la URL cambia "desde fuera"
(refresh, link compartido, botón atrás), el listener `popstate` en `ViewContext.tsx`
detecta que el pathname no coincide con el estado interno y dispara la transición
completa home a pokedex vía `PokedexPageTransition.tsx`, que fuerza
`initialView="home"` en el primer paint y luego transiciona a `"pokedex"`.

> **Archivos:** `src/components/app/ViewContext.tsx` — `handlePopState()`
> **Archivos:** `src/components/app/PokedexPageTransition.tsx`

---

**P3: ¿Por qué `useNavigation.ts` no usa `useRouter` de Next.js?**

Por dos razones. Primero, `router.push` provocaría que Next.js tratara la navegación
como cambio de página real, desmontando el árbol. Segundo, cuando solo cambian search
params (filtros), Next.js re-ejecuta Server Components y muestra el fallback de
`<Suspense>`, causando parpadeo. Nuestro `useNavigation` usa `history.pushState` +
`history.replaceState` directamente y expone un sistema de suscripción para que
cualquier componente reaccione a cambios de URL.

> **Archivos:** `src/hooks/useNavigation.ts` — `subscribe()` (global Set), `dispatchPopState()`

---

**P4: ¿Cómo evitas el hydration mismatch entre SSR y cliente en la navegación?**

El servidor renderiza la página con un pathname que puede no coincidir con
`window.location` (inexistente en SSR). `NavigationSSRContext.tsx` es un React Context
que el servidor rellena con los valores reales de la request. Durante la hydratación,
`useNavigation.ts` lee de este contexto en vez de `window.location`, garantizando que
el primer render del cliente coincida exactamente con el HTML del servidor.

> **Archivos:** `src/hooks/NavigationSSRContext.tsx` — `NavigationSSRProvider`
> **Archivos:** `src/hooks/useNavigation.ts` — lectura condicional de `ssrPathname`/`ssrSearch`

---

### SVG y Slots

**P5: ¿Cómo funciona el sistema de slots? ¿Cómo sabe cada slot qué Pokémon mostrar?**

`PokedexShell.tsx` es el ensamblador central. Lee `selectedName` de
`PokedexPageProvider` (que lo deriva del pathname vía `useAppShell`). Construye un
objeto `SlotMap` (`Record<SlotName, ReactNode>`) donde cada slot es un componente stub
(ej. `<ChipsSlot pokemonName="pikachu" />`). Este `SlotMap` se pasa a
`PokedexVerticalSvg` o `PokedexHorizontalSvg`, que itera sobre sus 12 `SlotLayer` y
renderiza el contenido dentro de `<foreignObject>`. Los slots que necesitan datos del
Pokémon obtienen el detalle del contexto `CarouselController`, que se activa cuando
`pokemonName` no es null.

> **Archivos:** `src/components/pokedex/PokedexShell.tsx` — construcción de `SlotMap`
> **Archivos:** `src/components/pokedex/carcases/SlotLayer.tsx` — `<foreignObject>` con `data-slot`
> **Archivos:** `src/components/pokedex/carcases/slots.ts` — tipos `SlotName`, `SlotMap`

---

**P6: ¿Por qué la lista de Pokémon y el carrusel comparten el mismo slot?**

El slot `CARRUSEL_IMAGENES_DESCRIPCION` siempre renderiza `PokemonList` como capa
base. Cuando hay un Pokémon seleccionado, `CarouselSlot.tsx` monta `PokemonCarousel`
encima con `position: absolute; inset: 0`, ocupando el 100% del slot. La lista sigue
detrás, invisible pero montada. Esto da continuidad visual: el usuario ve la lista,
pulsa una card, y el carrusel hace scale+fade (350ms) sobre la lista sin que esta
desaparezca. Al cerrar con X (`goToPokedex()`), el carrusel hace la animación inversa
(280ms) y la lista vuelve a ser visible. La lista nunca se desmonta, así que el
scroll y los filtros se preservan.

> **Archivos:** `src/components/pokedex/slots/CarouselSlot.tsx` — máquina de estados `idle/enter/shown/exit`

---

**P7: ¿Por qué usas `createPortal` para el overlay 3D y no lo renderizas dentro del SVG?**

El visor 3D necesita ocupar el viewport completo para ser inmersivo, pero está dentro
de un slot `<foreignObject>` que tiene dimensiones limitadas. `createPortal` en
`Mode3DHabitatOverlay.tsx` desacopla el overlay del árbol SVG y lo monta directamente
en `document.body`, evitando restricciones de stacking context y dimensiones del
`<foreignObject>`. El componente `Mode3DViewBinder` sincroniza el estado 3D con un
atributo `data-mode-3d` en `.pokedex-view` para que CSS desplace la Pokédex hacia
abajo cuando el overlay está activo.

> **Archivos:** `src/components/pokedex/3d/Mode3DHabitatOverlay.tsx` — `createPortal(...)`
> **Archivos:** `src/components/pokedex/3d/Mode3DViewBinder.tsx` — `data-mode-3d` binding

---

### Capa de datos

**P8: ¿Cómo construyes el where clause para GraphQL a partir de los filtros?**

`buildPokemonWhere(filters)` en `where.ts` traduce el objeto `PokemonFilters` (tipo1,
tipo2, generación, color, hábitat, habilidad, height, weight) a un
`pokemon_v2_pokemon_bool_exp` compatible con Hasura. Cada filtro se convierte en una
cláusula que navega las relaciones del schema:

- `type1: "fire"` se convierte en `{ pokemon_v2_pokemontypes: { pokemon_v2_type: { name: { _eq: "fire" } } } }`
- `generation: "generation-i"` se convierte en `{ pokemon_v2_pokemonspecy: { pokemon_v2_generation: { name: { _eq: "generation-i" } } } }`
- `height: "XS"` se convierte en `{ height: { _gte: 0, _lte: 2 } }`

Todas las cláusulas se combinan con `_and`. El hábitat requiere traducción
español a inglés vía `HABITAT_REVERSE_ALIAS`.

> **Archivos:** `src/lib/graphql/where.ts` — `buildPokemonWhere()`, `HABITAT_REVERSE_ALIAS`

---

**P9: ¿Cómo funciona la búsqueda expandida cuando no hay resultados por nombre?**

`applyFiltersToList()` en `fetchListFiltered.ts` primero intenta búsqueda por nombre
con `_ilike: "%term%"` (parcial, case-insensitive). Si devuelve 0 resultados y el
término tiene 3+ caracteres, ejecuta una segunda query con
`buildExpandedSearchWhere(term)`, que busca el término en `flavor_text`, tipos,
hábitat y generación (todos en OR). Los tokens multi-palabra se buscan
individualmente, y los acentos se normalizan con `normalizeSearchTerm()` (NFD + strip
diacríticos).

> **Archivos:** `src/lib/pokemon/fetchListFiltered.ts` — `applyFiltersToList()`
> **Archivos:** `src/lib/graphql/where.ts` — `buildExpandedSearchWhere()`, `normalizeSearchTerm()`

---

**P10: ¿Por qué el detalle del Pokémon usa GraphQL pero el cry necesita un fallback REST?**

El endpoint `beta.pokeapi.co/graphql/v1beta` no expone el campo
`pokemon_v2_pokemoncries` en el schema. Para obtener el cry, `fetchDetail.ts` hace una
llamada REST paralela a `https://pokeapi.co/api/v2/pokemon/{id}` y extrae
`cries.latest`. Ambas llamadas (GraphQL + REST) se ejecutan con `Promise.all`, por lo
que la latencia total es `max(graphql, rest)`, no la suma.

> **Archivos:** `src/lib/pokemon/fetchDetail.ts` — `fetchPokemonDetail()`, bloque `Promise.all`

---

**P11: ¿Por qué `filterOptions.gql.ts` exporta 7 queries distintas en vez de una genérica?**

Cada query tiene un propósito diferente y se cachea por separado. La query combinada
(`FILTER_OPTIONS_QUERY`) se usa en la carga inicial. Las queries individuales
(`TYPES_QUERY`, `GENERATIONS_QUERY`, etc.) permiten carga bajo demanda cuando el
usuario abre un dropdown específico por primera vez. `ALL_POKEMON_FILTER_FIELDS_QUERY`
es una query ligera (solo campos de filtro, sin sprites ni texto) que se usa para el
cómputo de disponibilidad cruzada en cliente.

> **Archivos:** `src/lib/graphql/queries/filterOptions.gql.ts` — 7 named exports

---

**P12: ¿Cómo funciona `React.cache` en `cachedPokemonApi.ts`?**

Cada función pública (`fetchPokemonList`, `fetchPokemonDetail`, etc.) está envuelta en
`React.cache(fn)`. Esto crea un memo por render: dos componentes que llamen
`fetchPokemonDetail('pikachu')` en el mismo render comparten la misma promesa. Es más
ligero que React Query (~12KB) y no requiere proveedores ni configuración de
stale-time. Para la caché HTTP usamos `next: { revalidate, tags }` en el `fetch`
subyacente. La limitación es que `React.cache` no memoiza en jsdom (tests), pero eso
está documentado y los tests no dependen de la memoización.

> **Archivos:** `src/lib/pokemon/cachedPokemonApi.ts` — wrappers `React.cache`
> **Archivos:** `src/lib/pokemon/cacheStrategy.ts` — constantes de revalidate

---

### Filtros y consola

**P13: ¿Cómo funciona el mapeo inglés a español en los filtros?**

La API devuelve tipos en inglés (`"fire"`, `"water"`). Internamente almacenamos el
valor en inglés. Pero la URL los serializa en español para que sea legible y
compartible. Esto se implementa con dos funciones en cada definición de filtro
(`FILTERS` array en `types.ts`):

- `format(value)`: traduce el valor interno a etiqueta para la URL. Para tipos usa
  `POKEMON_TYPE_LABELS["fire"]` devolviendo `"Fuego"`.
- `parse(raw)`: acepta tanto el valor inglés como la etiqueta española. Para tipos,
  construye un mapa inverso `label a value` y busca en ambas direcciones.

> **Archivos:** `src/lib/filters/types.ts` — `FILTERS` array, definiciones `format`/`parse`
> **Archivos:** `src/lib/constants/pokemonTypes.ts` — `POKEMON_TYPE_LABELS`

---

**P14: ¿Cómo funciona la disponibilidad cruzada de filtros?**

`useFilterAvailability` en cliente carga una vez todos los Pokémon con solo campos de
filtro (tipos, generación, color, hábitat, habilidades, altura, peso). Luego
`computeAvailableFilterValues()` itera los 1025 Pokémon en O(n) y para cada uno
verifica si cumple todos los filtros activos excepto el que se está evaluando. Esto
genera un `Set<string>` de valores disponibles para cada dimensión. Los dropdowns
llaman `isAvailable(key, value)` para decidir si muestran la opción en normal,
atenuada u oculta.

> **Archivos:** `src/components/filters/useFilterAvailability.ts` — `computeAvailableFilterValues()`
> **Archivos:** `src/lib/pokemon/fetchFilterAvailability.ts` — `fetchAllPokemonFilterFields()`

---

**P15: ¿Cómo funciona el intérprete de comandos de la consola?**

La consola es un REPL con tres capas:

1. **Parser** (`consoleParser.ts`): `parseCommand(input)` tokeniza el texto y lo
   clasifica mediante tablas de alias. Reconoce comandos (`help`/`ayuda`/`?`),
   aplicación de filtros (`tipo1 fuego`), búsqueda libre (`Charman Pika`), y
   comandos de gestión (`limpiar`, `quitar tipo1`, `resumen`, `options tipo1`).

2. **Executor** (`consoleExecutor.ts`): `resolveFilterValue(key, rawValue, options)`
   toma el valor en bruto y lo resuelve contra las opciones reales de PokeAPI.
   Implementa "fuzzy matching". Si no hay match exacto, sugiere la opción más cercana.

3. **UI** (`FilterConsole.tsx`): mantiene historial (`ArrowUp`/`ArrowDown`),
   auto-scroll con `scrollTop = scrollHeight` (NUNCA `scrollIntoView`, que
   desplazaría toda la página cuando la Pokédex está oculta), y efecto typewriter
   para comandos externos del chat IA (80ms/carácter).

> **Archivos:** `src/components/pokedex/console/consoleParser.ts` — `parseCommand()`
> **Archivos:** `src/components/pokedex/console/consoleExecutor.ts` — `resolveFilterValue()`
> **Archivos:** `src/components/pokedex/console/FilterConsole.tsx` — REPL UI, typewriter

---

### Errores y resiliencia

**P16: ¿Cómo manejas los errores 521 de Cloudflare desde el proxy?**

El proxy `/api/pokeapi` (`route.ts`) detecta respuestas 5xx del upstream. Si el body
contiene HTML de Cloudflare (lo normal en 521), lo normaliza a un JSON GraphQL
estándar: `{ data: null, errors: [{ message: "...", extensions: { code:
"UPSTREAM_CLOUDFLARE_521", retryable: true, retryAfter: 120, upstreamStatus: 521 }
}] }`. También propaga el header `Retry-After` si el upstream lo envía.

> **Archivos:** `src/app/api/pokeapi/route.ts` — `POST` handler, normalización de errores

---

**P17: ¿Cómo funciona el auto-retry en el cliente?**

El cliente GraphQL (`client.ts`) lanza `GraphQLUpstreamError` con propiedades
`status`, `retryable`, y `retryAfterMs`. `useFilteredPokemonList` implementa un bucle
de retry con backoff exponencial usando `retryAfterMs` como suelo (no reintenta antes
de lo que Cloudflare sugiere). Máximo 3 reintentos. Tras agotarlos, muestra el error
con mensaje específico y botón "Reintentar" manual.

> **Archivos:** `src/lib/graphql/client.ts` — `GraphQLUpstreamError` class
> **Archivos:** `src/components/filters/useFilteredPokemonList.ts` — auto-retry loop

---

### 3D y performance

**P18: ¿Cómo funciona la caché de modelos 3D?**

`usePokemonModel.ts` mantiene un `Map<number, { url, blobUrl }>` a nivel de módulo
(fuera de React). Cuando se solicita un modelo, primero verifica el Map. Si existe,
devuelve la URL cacheada instantáneamente. Si no, hace fetch del GLB desde
`raw.githubusercontent.com/Pokemon-3D-api/...`, crea un `blob:` URL, lo guarda en el
Map, y lo devuelve. La caché persiste entre montajes/desmontajes del visor.

> **Archivos:** `src/components/pokedex/3d/usePokemonModel.ts` — `modelCache` Map, `clearModelCache()`

---

**P19: ¿Por qué el preloader de modelos 3D no ralentiza la carga inicial?**

`Model3DPreloader` solo se activa cuando `selectedName` no es null (hay un Pokémon
seleccionado). Usa `useEffect` para disparar `usePokemonModel` en background sin
bloquear el render. El componente retorna `null` (sin markup). La descarga ocurre en
paralelo mientras el carrusel está cargando los datos del Pokémon, de modo que cuando
el usuario pulsa "3D", el modelo suele estar ya en memoria.

> **Archivos:** `src/components/pokedex/3d/Model3DPreloader.tsx` — retorna `null`, efecto asíncrono

---

### Testing

**P20: ¿Por qué los tests de slots validan atributos `data-stub` en vez de contenido visual?**

Los slots están dentro de `<foreignObject>` en un SVG. Testear su contenido visual
requeriría conocer las coordenadas exactas, lo que hace los tests frágiles ante
cambios de layout. `data-stub` es un contrato estable: si el slot "button-3d" existe
en el DOM con el atributo correcto, el SVG lo posicionará donde corresponda. Los
tests de integración visual se delegan a los specs E2E.

> **Archivos:** `src/components/pokedex/slots/types.ts` — `buildSlotAttrs()`
> **Archivos:** `__tests__/components/pokedex/PokedexShell.test.tsx` — busca `[data-stub="..."]`

---

**P21: ¿Cuándo mockeas PokeAPI y cuándo usas fixtures reales?**

**Mocks** (`vi.fn()`) se usan para verificar que el componente hace la llamada
correcta (URL, query, headers) o para simular errores de red. **Fixtures** (JSON
versionado de respuestas reales) se usan para verificar que el componente procesa
correctamente los datos reales (mapeos de tipos, colores, formatos, caracteres de
control, claves con guiones como `special-attack`). Mezclar ambos tipos en el mismo
test está prohibido: si necesitas ambos, son dos tests separados.

> **Archivos:** `__tests__/fixtures/pokeapi/` — 9 archivos JSON de respuestas reales
> **Archivos:** `scripts/capture-pokeapi-fixture.ts` — regeneración de fixtures

---

**P22: ¿Por qué hay un test de integración live que se skippea?**

`pokeapi-live.integration.test.ts` valida que la API real sigue devolviendo los datos
en el formato que esperamos. Se skippea automáticamente a menos que
`POKEAPI_REACHABLE=1` esté definido. Esto permite ejecutarlo manualmente cuando
sospechamos que PokeAPI pudo haber cambiado, sin ralentizar el CI. El spec E2E
`oak-chat.spec.ts` sigue la misma filosofía con el tag `@live-api`.

> **Archivos:** `__tests__/pokeapi-live.integration.test.ts` — `test.skip(!process.env.POKEAPI_REACHABLE)`
> **Archivos:** `e2e/oak-chat.spec.ts` — `@live-api` tag

---

### Arquitectura general

**P23: ¿Cómo decides cuándo usar `router.replace` vs `history.pushState`?**

- `router.replace` (`useFilters.setFilter`): para cambios de filtros. Cada cambio
  crea una entrada en el historial (el usuario puede deshacer filtros con atrás),
  pero no recarga la página (`scroll: false`).
- `history.pushState` (`goToPokemon`, `goToPokedex`, `goToHome`): para cambios de
  vista/pokémon. Actualiza la URL sin pasar por Next.js, evitando el desmontaje del
  árbol. La URL refleja el estado real para deep-links y compartir.

> **Archivos:** `src/hooks/useFilters.ts` — `setFilter()` usa `router.replace`
> **Archivos:** `src/components/app/ViewContext.tsx` — `goToPokemon()` usa `pushState`

---

**P24: ¿Cómo se construye la cadena evolutiva a partir de la respuesta de PokeAPI?**

`fetchDetail.ts` contiene `buildEvolutionChain(species)`, que hace BFS (anchura)
empezando desde la especie raíz (`evolves_from_species_id === null`). Para cada nodo,
recoge `id`, `name`, `evolves_from_species_id` y `evolutionDetail` (trigger, item,
min_level). El resultado es un array plano ordenado por niveles del árbol. La UI en
`EvolutionsSlot.tsx` lo renderiza con `data-current="true"` en el Pokémon activo y
filtro LCD verde vía CSS.

> **Archivos:** `src/lib/pokemon/fetchDetail.ts` — `buildEvolutionChain()`
> **Archivos:** `src/components/pokedex/slots/EvolutionsSlot.tsx` — renderizado con `data-current`

---

**P25: ¿Por qué `PokemonListCard.tsx` usa 4 tipos de chip distintos?**

Cada chip tiene su propia fuente de color y semántica:

1. **TypeChip** (tipo1, tipo2): colores de `POKEMON_TYPE_COLORS` — identifican el
   tipo elemental (rojo=fuego, azul=agua).
2. **GenerationChip**: colores de `POKEMON_GENERATION_COLORS` — contexto histórico
   del Pokémon.
3. **HabitatChip**: color cyan temático — información ecológica.

Separarlos permite aplicar estilos distintos sin lógica condicional compleja. Si en el
futuro se añade un chip de "forma regional", basta con crear un cuarto componente sin
tocar los existentes.

> **Archivos:** `src/components/pokedex/list/PokemonListCard.tsx` — `TypeChip`, `HabitatChip`, `GenerationChip`
> **Archivos:** `src/lib/constants/pokemonTypes.ts` — `POKEMON_TYPE_COLORS`
> **Archivos:** `src/lib/constants/pokemonGenerations.ts` — `POKEMON_GENERATION_COLORS`

---

**P26: ¿Por qué `LoadingPikachu` garantiza que la animación siempre se complete?**

`LoadingPikachu` usa un GIF animado de Pikachu corriendo. El contrato es que la
animación NUNCA se corta a medias. Para garantizarlo, `DataLoadingAggregator.tsx`:

1. Monta `LoadingPikachu` en cuanto se inicia una carga.
2. Cuando los datos llegan, NO desmonta inmediatamente. Espera al evento
   `animationend` del GIF (o un fallback de timeout).
3. `minVisibleMs = 2400` garantiza que incluso con datos instantáneos (caché), el
   Pikachu se vea al menos 2.4 segundos (un ciclo completo de la animación).

> **Archivos:** `src/components/loading/DataLoadingAggregator.tsx` — `minVisibleMs`, `animationend`
> **Archivos:** `src/components/loading/LoadingPikachu.tsx` — `data-state="run"`, `animationend` listener

---

**P27: Si tuvieras que añadir una nueva funcionalidad (ej. comparador de Pokémon),
¿cómo lo harías?**

1. **Nuevo slot en el SVG**: añadir un `<foreignObject>` con un nuevo `SlotName` en
   ambas carcasas (vertical y horizontal).
2. **Componente stub**: crear `CompareSlot.tsx` en `src/components/pokedex/slots/`
   siguiendo el patrón `buildSlotAttrs()`.
3. **Ensamblador**: añadir el nuevo slot al `SlotMap` en `PokedexShell.tsx`.
4. **Datos**: si necesita nueva información de PokeAPI, añadir campos a
   `POKEMON_DETAIL_QUERY` o crear una query nueva en `queries/`.
5. **Estado**: si necesita estado global, añadirlo a `PokedexPageProvider`.
6. **Tests**: test unitario del slot + test de integración en `PokedexShell.test.tsx`.

El sistema de slots está diseñado para que añadir uno nuevo sea cuestión de 4 pasos
mecánicos sin tocar la lógica de los otros 12 slots.

---

**P28: ¿Qué harías distinto si empezaras el proyecto hoy?**

1. **TypeScript strict desde el día 1**: el proyecto ya lo usa, pero algunas partes
   del mapeo de datos (raw JSON de PokeAPI) se tiparon progresivamente.
2. **Tests de snapshot para los SVGs**: `PokedexVerticalSvg` y `PokedexHorizontalSvg`
   son grandes. Un test de snapshot detectaría cambios no intencionados en las
   coordenadas de los `foreignObject`.
3. **Componentes Server vs Client más explícitos**: poner `"use client"` en la
   primera línea de cada archivo cliente (ya está hecho) y documentar qué datos
   fluyen del servidor al cliente.
4. **Feature flags para el chat IA**: el chat del Profesor Oak depende de una API key
   de terceros. Un sistema de feature flags permitiría desplegar la app sin el chat
   si la API no está disponible, en vez de mostrar un error.
