# Flujo de Código — Pokédex Virtual

> Trazado completo de ejecución para cada acción del usuario. Qué archivos se tocan,
> en qué orden, y qué funciones se ejecutan.

---

## Índice

- [1. Cargar la página de inicio (/)](#1-cargar-la-página-de-inicio-)
- [2. Pulsar START (home → pokédex)](#2-pulsar-start-home--pokédex)
- [3. Abrir deep-link (/pokemon/pikachu)](#3-abrir-deep-link-pokemonpikachu)
- [4. Click en una card de la lista](#4-click-en-una-card-de-la-lista)
- [5. Cerrar el carrusel (botón X)](#5-cerrar-el-carrusel-botón-x)
- [6. Comando en la consola ("tipo1 fuego")](#6-comando-en-la-consola-tipo1-fuego)
- [7. Seleccionar filtro en dropdown](#7-seleccionar-filtro-en-dropdown)
- [8. Escribir en el buscador](#8-escribir-en-el-buscador)
- [9. Botón Reset (limpiar filtros)](#9-botón-reset-limpiar-filtros)
- [10. Activar modo 3D](#10-activar-modo-3d)
- [11. Cerrar modo 3D](#11-cerrar-modo-3d)
- [12. Click en una evolución](#12-click-en-una-evolución)
- [13. Scroll al final de la lista](#13-scroll-al-final-de-la-lista)
- [14. Recargar la página en /pokedex?tipo1=Fuego](#14-recargar-la-página-en-pokedeftipo1fuego)
- [15. Botón atrás del navegador](#15-botón-atrás-del-navegador)
- [16. Abrir el chat del Prof. Oak](#16-abrir-el-chat-del-prof-oak)
- [17. Enviar mensaje al chat ("Muéstrame a Pikachu")](#17-enviar-mensaje-al-chat-muéstrame-a-pikachu)
- [18. Enviar "Filtra por tipo agua" al chat](#18-enviar-filtra-por-tipo-agua-al-chat)
- [19. Toggle Stats ↔ Abilities](#19-toggle-stats--abilities)
- [20. Reproducir cry del Pokémon](#20-reproducir-cry-del-pokémon)
- [21. Toggle música de fondo](#21-toggle-música-de-fondo)
- [22. Volver al inicio desde la Pokédex](#22-volver-al-inicio-desde-la-pokédex)

---

## 1. Cargar la página de inicio (/)

El usuario escribe la URL raíz en el navegador.

```
Petición HTTP GET /
```

| # | Archivo | Qué sucede |
|---|---------|-----------|
| 1 | `src/app/layout.tsx` | `RootLayout` — renderiza `<html lang="es">` con fuente `PressStart2P` vía `next/font/local`. Metadata: title template `"%s | Pokédex"`, OpenGraph, Twitter Cards. |
| 2 | `src/app/page.tsx` | `HomePage()` — Next.js enruta `/` aquí. `await buildSearchString(searchParams)` (de `src/lib/utils/search-params.ts`) serializa los search params iniciales a query string. Renderiza `<HomeShell initialPathname="/" initialSearch={...}><HomeViewContent /></HomeShell>`. |
| 3 | `src/components/home/HomeShell.tsx` | `HomeShell()` — envuelve children en `<AppShell>` + `<HomeViewNavListeners />`. |
| 4 | `src/components/app/AppShell.tsx` | `AppShell()` — monta la jerarquía de providers: `<AppShellProvider initialView="home" initialPathname="/">` > `<AppShellInner>`. |
| 5 | `src/components/app/ViewContext.tsx` | `AppShellProvider()` — inicializa `view="home"`, `pathname="/"`, `selectedName=null` (derivado del pathname). Provee `NavigationSSRContext` con `initialPathname` e `initialSearch` para evitar hydration mismatch. Registra listener de `popstate` para back/forward del navegador. |
| 6 | `src/components/app/AppShell.tsx` | `AppShellInner()` — lee `view` de `useAppShell()`. Renderiza `<div data-view="home">` con dos hijos: `.home-view` (visible, z-10) y `.pokedex-view` (offscreen con `translateY(100%)`, z-20). Ambas SIEMPRE montadas. |
| 7 | `src/components/home/HomeViewNavListeners.tsx` | `HomeViewNavListeners()` — escucha `keydown` (Enter/Space/a-z) y `click` en el documento. Si `view === "home"`, llama a `goToPokedex()`. |
| 8 | `src/components/home/HomeViewContent.tsx` | `HomeViewContent()` — renderiza logo SVG, imagen de Ash, Pokédex cerrada, `<PokemonSlider />` (10 Pokémon SVG rotando), `<SoundToggle />`, `<PressStartButton />`. |
| 9 | `src/components/home/AnimatedBackground.tsx` | `AnimatedBackground()` — fondo con tile drift diagonal (18s). Siempre montado. |
| 10 | `src/components/app/PokedexOverlay.tsx` | `PokedexOverlay()` — monta todo el sub-árbol de la Pokédex aunque esté oculta: `<FiltersProvider>` > `<PokedexPageProvider>` > `<OakChatProvider>` > `<PokedexShell>` + `<Mode3DViewBinder>` + `<Mode3DHabitatOverlay>` + `<Model3DPreloader>` + `<DataLoadingAggregator>` + `<OakChat>`. |
| 11 | `src/components/filters/FiltersProvider.tsx` | `FiltersProvider()` > `useFilters()` (de `src/hooks/useFilters.ts`). Sin filtros en URL, `filters = {}`. |
| 12 | `src/hooks/useNavigation.ts` | `useNavigation()` — durante SSR/hydratación lee de `NavigationSSRContext`. Tras montaje (`mounted=true`), cambia a `window.location`. |
| 13 | `src/lib/filters/serialization.ts` | `searchParamsToFilters()` — parsea la URL. Sin params, devuelve `{}`. |
| 14 | `src/components/pokedex/PokedexPageProvider.tsx` | `PokedexPageProvider()` — `pathname="/"`, `selectedName=null`. `mode3D=false`, `toggleStatsAbilities="stats"`. |
| 15 | `src/components/pokedex/PokedexShell.tsx` | `PokedexShell()` — lee orientación de `useViewportLayout()`. Construye `SlotMap` con los 12 slots (todos con `pokemonName=null`). Envuelve en `<CarouselProvider pokemonName={null}>`. Elige `PokedexVerticalSvg` o `PokedexHorizontalSvg`. |
| 16 | `src/components/pokedex/list/PokemonList.tsx` | `PokemonList()` — dentro de `CarouselSlot`. Llama a `useFilteredPokemonList()` que dispara la primera página de la lista sin filtros. |
| 17 | `src/components/filters/useFilteredPokemonList.ts` | `useFilteredPokemonList()` — `apiFilters = {}`. `doFetch()` llama a `applyFiltersToList({}, 0, undefined)`. |
| 18 | `src/lib/pokemon/cachedPokemonApi.ts` | `applyFiltersToList()` (envuelta en `React.cache`) → `rawApplyFiltersToList()` en `src/lib/pokemon/fetchListFiltered.ts`. |
| 19 | `src/lib/graphql/client.ts` | `request<T>()` — POST a `https://beta.pokeapi.co/graphql/v1beta` con la query `POKEMON_LIST_FILTERED_QUERY`. |
| 20 | `src/lib/pokemon/mapRawList.ts` | `mapRawListPokemon()` — normaliza la respuesta JSON a `PokemonListItem[]`. |

**Resultado:** Home visible (logo, Ash, slider, botón START). Pokédex montada pero oculta debajo de la pantalla. Música lista para reproducirse. Lista de Pokémon cargándose en background.

---

## 2. Pulsar START (home → pokédex)

El usuario pulsa el botón "PRESS START" o presiona cualquier tecla.

| # | Archivo | Qué sucede |
|---|---------|-----------|
| 1 | `src/components/home/PressStartButton.tsx` | `onClick={goToPokedex}`. El botón invoca la función de navegación. |
| 2 | `src/components/home/HomeViewNavListeners.tsx` | Alternativamente: `keydown`/`click` detectados, `view === "home"`, llama a `goToPokedex()`. |
| 3 | `src/components/app/ViewContext.tsx` | `goToPokedex()` — lee `window.location.search` (preserva filtros). Construye URL `/pokedex` + search. `window.history.pushState({}, "", url)`. `setPathname("/pokedex")`. `setView("pokedex")`. |
| 4 | `src/components/app/AppShell.tsx` | `AppShellInner()` re-renderiza: `view` cambia de `"home"` a `"pokedex"`. El `<div>` raíz actualiza `data-view="pokedex"`. |
| 5 | `src/app/globals.css` | CSS: `[data-view="pokedex"] .pokedex-view` transiciona `translateY(0)` (sube desde abajo). Elementos de home salen en direcciones opuestas (logo a esquina superior, Ash a izquierda, slider a derecha, botón hacia abajo). Duración ~800ms. |
| 6 | `src/components/pokedex/PokedexPageProvider.tsx` | `PokedexPageProvider()` — `pathname="/pokedex"`, `selectedName` sigue siendo `null`. |
| 7 | `src/components/pokedex/PokedexShell.tsx` | `PokedexShell()` re-renderiza con `data-active-view="pokedex"`. Slots activos con stubs. |
| 8 | `src/components/chat/OakChat.tsx` | `OakChat()` — `view === "pokedex"` ahora es `true`. Tras 2.8s de timeout, llama a `openChat()` para mostrar el avatar del Prof. Oak. |
| 9 | `src/components/chat/OakChatContext.tsx` | `openChat()` — `setIsOpen(true)`. El avatar y la burbuja del chat aparecen. |

**Resultado:** La Pokédex sube desde abajo con animación CSS. La home sale de escena. La lista de Pokémon es visible. El avatar del Prof. Oak aparece tras 2.8s.

---

## 3. Abrir deep-link (/pokemon/pikachu)

El usuario pega una URL compartida o recarga en `/pokemon/pikachu`.

```
Petición HTTP GET /pokemon/pikachu
```

| # | Archivo | Qué sucede |
|---|---------|-----------|
| 1 | `src/app/pokemon/[name]/page.tsx` | `PokemonDetailPage({ params })` — Next.js enruta aquí, extrayendo `name = "pikachu"`. `generateMetadata()` crea title y description dinámicos con el nombre del Pokémon. `await buildSearchString(searchParams)`. Renderiza `<PokedexPageTransition initialPathname="/pokemon/pikachu" initialSearch={...}><HomeViewContent /></PokedexPageTransition>`. |
| 2 | `src/components/app/PokedexPageTransition.tsx` | `PokedexPageTransition()` — clave: envuelve en `<AppShellProvider initialView="home" initialPathname="/pokemon/pikachu">`. **El primer paint SIEMPRE es "home"**, aunque la URL diga `/pokemon/pikachu`. Esto fuerza una transición de entrada consistente. |
| 3 | `src/components/app/ViewContext.tsx` | `AppShellProvider()` — `view="home"`, `pathname="/pokemon/pikachu"`. `deriveSelectedName("/pokemon/pikachu")` extrae `"pikachu"` vía regex. En el `useEffect` de montaje, `handlePopState()` se dispara: `setPathname("/pokemon/pikachu")`, `setView("pokedex")`. |
| 4 | `src/components/app/PokedexPageTransition.tsx` | `PokedexPageTransitionInner()` — `view` transiciona `"home"` → `"pokedex"`. El `<div>` raíz cambia `data-view`. CSS ejecuta la misma animación de entrada que en la acción 2. |
| 5 | `src/components/pokedex/PokedexPageProvider.tsx` | `PokedexPageProvider()` — `pathname="/pokemon/pikachu"`. `deriveSelectedName()` retorna `"pikachu"`. `selectedName = "pikachu"`. |
| 6 | `src/components/pokedex/PokedexShell.tsx` | `PokedexShell()` — `SlotMap` reconstruido con `pokemonName="pikachu"`. `<CarouselProvider pokemonName="pikachu">` activo. |
| 7 | `src/components/pokedex/carousel/CarouselController.tsx` | `CarouselProvider()` — `useEffect` detecta `pokemonName="pikachu"`. Resetea estado. `fetchPokemonDetail("pikachu")` → `setDetail(detail)`. |
| 8 | `src/lib/pokemon/cachedPokemonApi.ts` | `fetchPokemonDetail("pikachu")` (React.cache) → `rawFetchPokemonDetail()` en `src/lib/pokemon/fetchDetail.ts`. |
| 9 | `src/lib/pokemon/fetchDetail.ts` | `fetchPokemonDetail()` — ejecuta `POKEMON_DETAIL_QUERY` (GraphQL) + REST fallback para el cry en paralelo (`Promise.all`). Normaliza tipos, stats, habilidades, sprites, evoluciones. |
| 10 | `src/components/pokedex/slots/CarouselSlot.tsx` | `CarouselSlot()` — `pokemonName` pasa de `null` a `"pikachu"`. Máquina de estados: `idle` → `enter` (monta overlay con scale 0.6→1, opacity 0→1 durante 350ms) → timer → `shown`. Lista sigue detrás (inerte). |
| 11 | `src/components/pokedex/slots/ChipsSlot.tsx` | Lee tipos y generación de `CarouselController.detail`. Renderiza chips con colores de `POKEMON_TYPE_COLORS` y `POKEMON_GENERATION_COLORS`. |
| 12 | `src/components/pokedex/slots/EvolutionsSlot.tsx` | Lee `detail.evolutionChain`. Renderiza sprites con filtro LCD verde. |
| 13 | `src/components/pokedex/slots/StatsSlot.tsx` | Lee `detail.stats`. Renderiza barras proporcionales (max 255). |
| 14 | `src/components/pokedex/3d/Model3DPreloader.tsx` | `Model3DPreloader()` — `selectedName` no es null, dispara precarga del modelo GLB en background. |

**Resultado:** El usuario ve home → transición → Pokédex con el carrusel de Pikachu abierto. URL: `/pokemon/pikachu`. Modelo 3D precargándose.

---

## 4. Click en una card de la lista

El usuario hace click en la card de "Pikachu" dentro de la lista.

| # | Archivo | Qué sucede |
|---|---------|-----------|
| 1 | `src/components/pokedex/list/PokemonListCard.tsx` | `onClick` llama a `onSelect(item.name)` con `"pikachu"`. |
| 2 | `src/components/pokedex/list/PokemonList.tsx` | `onSelect(name)` → `goToPokemon(name)` de `useAppShell()`. |
| 3 | `src/components/app/ViewContext.tsx` | `goToPokemon("pikachu")` — lee `window.location.search` (preserva filtros activos). Construye `/pokemon/pikachu?tipo1=Fuego` (con filtros). `window.history.pushState({}, "", url)`. `setPathname(url)`. `setView("pokedex")`. |
| 4 | `src/components/pokedex/PokedexPageProvider.tsx` | `pathname` ahora es `/pokemon/pikachu`. `deriveSelectedName()` → `"pikachu"`. `selectedName` cambia de `null` a `"pikachu"`. |
| 5 | `src/components/pokedex/PokedexShell.tsx` | `SlotMap` se reconstruye con `pokemonName="pikachu"`. |
| 6 | `src/components/pokedex/carousel/CarouselController.tsx` | `CarouselProvider()` — detecta nuevo `pokemonName`. `fetchPokemonDetail("pikachu")`. |
| 7 | `lib/pokemon/fetchDetail.ts` | Query GraphQL + REST cry (igual que acción 3). |
| 8 | `src/components/pokedex/slots/CarouselSlot.tsx` | `CarouselSlot()` — `pokemonName` cambia de `null` a `"pikachu"`. Overlay entra con animación scale+fade (350ms). |
| 9 | Resto de slots | Actualizan con los datos del detalle (ChipsSlot, EvolutionsSlot, StatsSlot, SoundSlot). |

**Resultado:** Overlay del carrusel aparece sobre la lista (la lista sigue detrás, inerte). URL cambia a `/pokemon/pikachu` preservando filtros. Sin recarga de página. Sin transición home↔pokedex (solo animación local del overlay).

---

## 5. Cerrar el carrusel (botón X)

El usuario pulsa el botón X en la esquina superior derecha del overlay del carrusel.

| # | Archivo | Qué sucede |
|---|---------|-----------|
| 1 | `src/components/pokedex/slots/CarouselSlot.tsx` | `CarouselCloseButton` — `onClick={goToPokedex}`. |
| 2 | `src/components/app/ViewContext.tsx` | `goToPokedex()` — lee `window.location.search`. Si el pathname actual ya es `/pokedex`, retorna early (no hace nada). Si no: `pushPath("/pokedex" + search)`, `setPathname("/pokedex")`, `setView("pokedex")`. |
| 3 | `src/components/pokedex/PokedexPageProvider.tsx` | `pathname="/pokedex"`. `deriveSelectedName()` → `null`. `selectedName = null`. |
| 4 | `src/components/pokedex/slots/CarouselSlot.tsx` | `CarouselSlot()` — `pokemonName` cambió a `null`. Durante el render: detecta que `shownName` tenía un valor → `setState("exit")`. |
| 5 | `src/components/pokedex/slots/CarouselSlot.tsx` | `useEffect` sobre `pokemonName` — crea timer de 280ms: `setTimeout(() => { setShownName(null); setState("idle") }, 280)`. |
| 6 | CSS | Overlay recibe `data-state="exit"` → scale 1→0.6, opacity 1→0 durante 280ms. |
| 7 | `src/components/pokedex/slots/CarouselSlot.tsx` | Tras 280ms: `shownName=null`, `state="idle"`. Overlay se desmonta. Lista vuelve a ser visible (`data-active="visible"`). |

**Resultado:** Carrusel desaparece con animación de encogimiento. La lista recupera visibilidad y el scroll se preserva. URL vuelve a `/pokedex` (con filtros preservados).

---

## 6. Comando en la consola ("tipo1 fuego")

El usuario escribe `tipo1 fuego` en la consola retro y pulsa Enter.

| # | Archivo | Qué sucede |
|---|---------|-----------|
| 1 | `src/components/pokedex/console/FilterConsole.tsx` | `onSubmit()` — muestra `> tipo1 fuego` en la consola. `execute("tipo1 fuego")`. |
| 2 | `src/components/pokedex/console/consoleParser.ts` | `parseCommand("tipo1 fuego")` — tokeniza: `head="tipo1"`, `tail="fuego"`. `resolveFilterKey("tipo1")` → `"type1"` (vía tabla de alias). Retorna `{ kind: "apply", filterKey: "type1", rawValue: "fuego" }`. |
| 3 | `src/components/pokedex/console/FilterConsole.tsx` | `execute()` — `filterKeyToOptionKey("type1")` → `"type"`. Obtiene `options = registry["type"]` (opciones reales de PokeAPI cacheadas). `resolveFilterValue("type1", "fuego", options)`. |
| 4 | `src/components/pokedex/console/consoleExecutor.ts` | `resolveFilterValue("type1", "fuego", types)` — normaliza "fuego". Busca en `TYPE_VALUE_BY_LABEL` → `"fire"`. Retorna `{ ok: true, value: "fire", label: "Fuego" }`. |
| 5 | `src/components/pokedex/console/FilterConsole.tsx` | `execute()` — `setFilter("type1", "fire")`. Muestra `✓ Tipo 1 = Fuego` en consola. |
| 6 | `src/hooks/useFilters.ts` | `setFilter("type1", "fire")` → `writeFilters(applyFilterChange(filters, "type1", "fire"))`. |
| 7 | `src/lib/filters/serialization.ts` | `applyFilterChange({}, "type1", "fire")` → `{ type1: "fire" }`. `filtersToSearchParams({ type1: "fire" })` → `"type1=Fuego"` (usa `format()` de la definición del filtro: `POKEMON_TYPE_LABELS["fire"]`). |
| 8 | `src/hooks/useNavigation.ts` | `router.replace("/pokedex?type1=Fuego")` → `window.history.replaceState({}, "", url)` + `dispatchEvent(new PopStateEvent("popstate"))`. |
| 9 | `src/hooks/useNavigation.ts` | El evento `popstate` dispara `forceUpdate()`. `searchParams` ahora contiene `type1=Fuego`. |
| 10 | `src/hooks/useFilters.ts` | `useFilters()` recalcula: `filters = searchParamsToFilters(URLSearchParams("type1=Fuego"))` → `{ type1: "fire" }` (parse acepta la etiqueta española). |
| 11 | `src/components/filters/useFilteredPokemonList.ts` | `filterKey` cambia de `""` a `"type1=fire"`. `useEffect` → `doFetch()`. Llama a `applyFiltersToList({ type1: "fire" }, 0, undefined)`. |
| 12 | `src/lib/graphql/where.ts` | `buildPokemonWhere({ type1: "fire" })` → `{ pokemon_v2_pokemontypes: { pokemon_v2_type: { name: { _eq: "fire" } } } }`. |
| 13 | `src/lib/pokemon/fetchListFiltered.ts` | `applyFiltersToList()` — query GraphQL con el where clause construido. |
| 14 | `src/components/pokedex/list/PokemonList.tsx` | Lista re-renderiza con los Pokémon filtrados (solo tipo Fuego). |
| 15 | `src/components/filters/useFilterAvailability.ts` | `useFilterAvailability()` recalcula qué opciones de otros filtros siguen disponibles dado `type1=fire`. Los dropdowns se actualizan. |

**Resultado:** URL: `/pokedex?type1=Fuego`. Consola muestra confirmación. Lista muestra solo tipo Fuego. Dropdowns reflejan disponibilidad cruzada.

---

## 7. Seleccionar filtro en dropdown

El usuario abre un dropdown (ej. "Tipo 1") y selecciona "Fuego".

| # | Archivo | Qué sucede |
|---|---------|-----------|
| 1 | `src/components/filters/FilterDropdowns.tsx` | Click en botón del dropdown → `setOpenIndex(i)` → panel se abre vía portal. |
| 2 | `src/components/filters/useFilterOptions.ts` | `useFilterOptions("type")` — carga asíncrona de opciones si no están en caché. El panel muestra las opciones con `isAvailable()` para atenuar las no viables. |
| 3 | `src/components/filters/FilterDropdowns.tsx` | Usuario selecciona "Fuego". `onSelect("fire")` → `setFilter("type1", "fire")`. Panel se cierra. |
| 4 | `src/components/filters/FiltersProvider.tsx` | `useFiltersContext().setFilter("type1", "fire")` → mismo flujo que acción 6 desde paso 6. |
| 5 | `src/hooks/useFilters.ts` | `setFilter("type1", "fire")` → `writeFilters(...)`. |
| 6 | `src/lib/filters/serialization.ts` | `applyFilterChange()` + `filtersToSearchParams()` → `"type1=Fuego"`. |
| 7 | `src/hooks/useNavigation.ts` | `router.replace("/pokedex?type1=Fuego")`. |
| 8 | `src/components/filters/useFilteredPokemonList.ts` | `filterKey` cambia → `doFetch()` con `{ type1: "fire" }`. |
| 9 | `src/components/filters/useFilterAvailability.ts` | Recalcula disponibilidad. Otros dropdowns abiertos se actualizan (opciones no viables se atenúan/ocultan). |

**Resultado:** URL actualizada. Lista filtrada. Dropdown muestra el filtro activo con `data-active="true"`. Dropdowns hermanos reflejan nueva disponibilidad.

---

## 8. Escribir en el buscador

El usuario escribe "Pika" en el campo de búsqueda.

| # | Archivo | Qué sucede |
|---|---------|-----------|
| 1 | `src/components/filters/SearchInput.tsx` | `onChange` → `onInput("Pika")`. `setValue("Pika")`. Inicia debounce de 300ms (`debounceTimerRef`). |
| 2 | `src/components/filters/SearchInput.tsx` | Tras 300ms sin teclear: `fetchSuggestions("Pika")` → `applyFiltersToList({}, 0, { search: "Pika", limit: 8, withTotal: false })` para obtener sugerencias. También `setFilter("search", "Pika")`. |
| 3 | `src/hooks/useFilters.ts` | `setFilter("search", "Pika")` → `writeFilters(...)` → `router.replace("/pokedex?search=Pika")`. |
| 4 | `src/lib/pokemon/fetchListFiltered.ts` | `applyFiltersToList()` — query con `where: { name: { _ilike: "%pika%" } }` (case-insensitive, búsqueda parcial). |
| 5 | `src/components/filters/SearchInput.tsx` | Sugerencias llegan: `setSuggestions(result.items.slice(0, 8))`. Calcula `anchorRect` del input. `setIsOpen(true)`. Portal renderiza lista de sugerencias debajo del campo. |
| 6 | `src/components/filters/useFilteredPokemonList.ts` | `searchKey` cambia → `doFetch()` con search. Lista principal se actualiza. |
| 7 | `src/components/filters/SearchInput.tsx` | Usuario hace click en una sugerencia → `goToPokemon(suggestion.name)`. |
| 8 | `src/components/app/ViewContext.tsx` | `goToPokemon(name)` — mismo flujo que acción 4. |

**Resultado:** URL: `/pokedex?search=Pika`. Lista principal y sugerencias muestran Pokémon que coinciden. Click en sugerencia abre el carrusel.

---

## 9. Botón Reset (limpiar filtros)

El usuario pulsa el botón "Reset" junto al buscador.

| # | Archivo | Qué sucede |
|---|---------|-----------|
| 1 | `src/components/filters/ResetFilterButtons.tsx` | `onReset()` — si `activeCount > 0`, llama a `clearAll()`. |
| 2 | `src/hooks/useFilters.ts` | `clearAll()` → `writeFilters({})`. |
| 3 | `src/lib/filters/serialization.ts` | `filtersToSearchParams({})` → `URLSearchParams` vacío. |
| 4 | `src/hooks/useNavigation.ts` | `router.replace("/pokedex")` — limpia todos los search params. |
| 5 | `src/hooks/useFilters.ts` | `filters` se recalcula a `{}`. `activeCount = 0`. |
| 6 | `src/components/filters/useFilteredPokemonList.ts` | `filterKey` cambia a `""`. `doFetch()` con filtros vacíos → lista completa. |
| 7 | `src/components/filters/SearchInput.tsx` | `useEffect` detecta `filters.search === undefined` → limpia `value=""`, `suggestions=[]`, `isOpen=false`. |
| 8 | `src/components/filters/useFilterAvailability.ts` | Recalcula disponibilidad sin filtros activos. Todos los dropdowns muestran todas las opciones. |

**Resultado:** URL: `/pokedex`. Todos los filtros eliminados. Lista completa restaurada. Campo de búsqueda limpio. Dropdowns reseteados.

---

## 10. Activar modo 3D

El usuario pulsa el botón "3D" en la carcasa de la Pokédex.

| # | Archivo | Qué sucede |
|---|---------|-----------|
| 1 | `src/components/pokedex/slots/Button3DSlot.tsx` | `onClick={() => setMode3D(!isActive)}` → `setMode3D(true)`. |
| 2 | `src/components/pokedex/PokedexPageProvider.tsx` | `setMode3D(true)` — `useState` setter. `mode3D = true`. Contexto se re-provee. |
| 3 | `src/components/pokedex/3d/Mode3DViewBinder.tsx` | `Mode3DViewBinder()` — `useEffect` sobre `mode3D` detecta `true`. `document.querySelector(".pokedex-view")?.setAttribute("data-mode-3d", "true")`. |
| 4 | `src/app/globals.css` | CSS: `[data-mode-3d="true"]` aplica `translateY(45vh)` a `.pokedex-view`, desplazando la Pokédex hacia abajo. |
| 5 | `src/components/pokedex/3d/Mode3DHabitatOverlay.tsx` | `Mode3DHabitatOverlay()` — `mode3D=true`, retorna no-null. Renderiza vía `createPortal(..., document.body)`: overlay fixed ocupando el 45vh superior. |
| 6 | `src/components/pokedex/3d/Mode3DHabitatOverlay.tsx` | `useEffect` — `fetchPokemonDetail(selectedName)` para obtener el hábitat. Muestra imagen de fondo del hábitat con gradiente a azul. |
| 7 | `src/components/pokedex/3d/usePokemonModel.ts` | `usePokemonModel(detail?.id)` — verifica caché `Map<number, object>`. Si no está, fetch del GLB desde `raw.githubusercontent.com/Pokemon-3D-api/...`. Crea `blob:` URL. Guarda en caché. |
| 8 | `src/components/pokedex/3d/Mode3DHabitatOverlay.tsx` | `modelStatus === "ready"` → renderiza `<PokemonViewer3D />`. |
| 9 | `src/components/pokedex/3d/PokemonViewer3D.tsx` | Inicializa escena Three.js: `WebGLRenderer`, `PerspectiveCamera`, luces, `GLTFLoader` + `DRACOLoader`. Carga el GLB, aplica correcciones por modelo (rotación, escala), shader de saturación vía `EffectComposer`. Auto-rotación + drag-to-rotate. |

**Resultado:** Pokédex se desplaza hacia abajo. Overlay 3D ocupa la mitad superior con fondo del hábitat y modelo 3D rotando. Flecha de cierre visible.

---

## 11. Cerrar modo 3D

El usuario pulsa la flecha de cierre o desliza hacia arriba.

| # | Archivo | Qué sucede |
|---|---------|-----------|
| 1 | `src/components/pokedex/3d/Mode3DHabitatOverlay.tsx` | Click en flecha: `handleArrowClick()` → `setMode3D(false)`. O swipe up: `handleTouchEnd` con `deltaY < -40` → `setMode3D(false)`. |
| 2 | `src/components/pokedex/PokedexPageProvider.tsx` | `setMode3D(false)` → `mode3D = false`. |
| 3 | `src/components/pokedex/3d/Mode3DViewBinder.tsx` | `useEffect` sobre `mode3D=false` → `el.removeAttribute("data-mode-3d")`. |
| 4 | `src/app/globals.css` | Sin `data-mode-3d`, `.pokedex-view` vuelve a `translateY(0)`. |
| 5 | `src/components/pokedex/3d/Mode3DHabitatOverlay.tsx` | `mode3D=false` → retorna `null`. Portal se desmonta. Overlay desaparece. |

**Resultado:** Pokédex restaura su posición original. Overlay 3D y modelo desaparecen.

---

## 12. Click en una evolución

El usuario pulsa un nodo de la cadena evolutiva (ej. "Raichu" desde Pikachu).

| # | Archivo | Qué sucede |
|---|---------|-----------|
| 1 | `src/components/pokedex/slots/EvolutionsSlot.tsx` | `EvolutionItem` — `onClick={() => goToPokemon("raichu")}`. |
| 2 | `src/components/app/ViewContext.tsx` | `goToPokemon("raichu")` — mismo flujo que acción 4: `pushState`, `setPathname`, `setView`. |
| 3 | `src/components/pokedex/PokedexPageProvider.tsx` | `selectedName` cambia de `"pikachu"` a `"raichu"`. |
| 4 | `src/components/pokedex/slots/CarouselSlot.tsx` | `CarouselSlot()` — `pokemonName` cambió pero el overlay YA estaba en `"shown"`. Durante el render: `setShownName("raichu")`, `setState("enter")`. Como el overlay ya está montado, CSS aplica crossfade del contenido en vez de la animación completa de entrada. |
| 5 | `src/components/pokedex/carousel/CarouselController.tsx` | `CarouselProvider()` — nuevo `pokemonName`, resetea `detail`, `fetchPokemonDetail("raichu")`. |
| 6 | Resto de slots | Actualizan con datos de Raichu. |

**Resultado:** Carrusel hace crossfade a Raichu (sin animación de entrada completa). URL: `/pokemon/raichu`. Sin recarga.

---

## 13. Scroll al final de la lista

El usuario hace scroll hacia abajo en la lista de Pokémon.

| # | Archivo | Qué sucede |
|---|---------|-----------|
| 1 | `src/components/pokedex/list/PokemonList.tsx` | Evento `scroll` en el contenedor. Throttle vía `requestAnimationFrame` (`rafPendingRef`). |
| 2 | `src/components/pokedex/list/PokemonList.tsx` | `onScroll()` — calcula `distanceToBottom = scrollHeight - scrollTop - clientHeight`. Si `<= LOOKAHEAD_PX (400)` → `triggerLoadMore()`. |
| 3 | `src/components/pokedex/list/PokemonList.tsx` | `triggerLoadMore()` — verifica: `loadingMoreRef === false`, `nextOffset !== null`, `status !== "loading"`. `loadingMoreRef = true`. `loadMore()`. |
| 4 | `src/components/filters/useFilteredPokemonList.ts` | `loadMore()` — `status = "loadingMore"`. `applyFiltersToList(apiFiltersRef.current, nextOffset, searchOptions)`. |
| 5 | `src/lib/pokemon/cachedPokemonApi.ts` | `applyFiltersToList(filters, nextOffset, options)` (React.cache) → query GraphQL con `offset=nextOffset`. |
| 6 | `src/components/filters/useFilteredPokemonList.ts` | Éxito: `setItems([...prev, ...next.items])` (acumulación). `nextOffset = next.nextOffset`. `status = "ready"`. |
| 7 | `src/components/pokedex/list/PokemonList.tsx` | `useEffect` sobre `[items]` — tras nuevo render: recalcula `distanceToBottom`. Si sigue dentro del umbral (el contenedor creció), dispara `triggerLoadMore()` de nuevo sin esperar a otro evento scroll. |
| 8 | `src/components/pokedex/list/PokemonList.tsx` | Si `isLoadingMore`, muestra spinner al final de la lista. |

**Resultado:** Siguiente página de Pokémon se añade al final de la lista. Scroll continúa fluido. Si el contenedor no creció lo suficiente, espera al próximo evento scroll.

---

## 14. Recargar la página en /pokedex?tipo1=Fuego

El usuario recarga el navegador (F5) estando en la Pokédex con filtros.

```
Petición HTTP GET /pokedex?tipo1=Fuego
```

| # | Archivo | Qué sucede |
|---|---------|-----------|
| 1 | `src/app/pokedex/page.tsx` | `PokedexPage()` — `searchParams` es una Promise. `await buildSearchString(searchParams)` → `"tipo1=Fuego"`. Renderiza `<PokedexPageTransition initialPathname="/pokedex" initialSearch="tipo1=Fuego"><HomeViewContent /></PokedexPageTransition>`. |
| 2 | `src/components/app/PokedexPageTransition.tsx` | `<AppShellProvider initialView="home" initialPathname="/pokedex" initialSearch="tipo1=Fuego">`. |
| 3 | `src/components/app/ViewContext.tsx` | `AppShellProvider()` — estado SSR: `pathname="/pokedex"`, `search="tipo1=Fuego"`. `NavigationSSRContext` recibe `{ pathname: "/pokedex", search: "tipo1=Fuego" }`. |
| 4 | HTML enviado al navegador | Servidor renderiza home (porque `view="home"`) con Pokédex pre-renderizada oculta. |
| 5 | **Hydratación en cliente** | `useNavigation()` lee de `NavigationSSRContext`: `pathname="/pokedex"`, `search="tipo1=Fuego"`. Usa estos valores durante la hydratación para evitar mismatch con el HTML del servidor. |
| 6 | `src/hooks/useFilters.ts` | `searchParamsToFilters(URLSearchParams("tipo1=Fuego"))` → parsea `"Fuego"` → busca en mapa inverso de `POKEMON_TYPE_LABELS` → `{ type1: "fire" }`. |
| 7 | `src/components/filters/useFilteredPokemonList.ts` | `apiFilters = { type1: "fire" }`. `filterKey = "type1=fire"`. `doFetch()` → `applyFiltersToList({ type1: "fire" }, 0, undefined)`. |
| 8 | `src/components/app/ViewContext.tsx` | `useEffect` de montaje: `handlePopState()` → `setPathname("/pokedex")`, `setView("pokedex")`. `data-view` cambia → CSS inicia transición de entrada. |
| 9 | `src/components/pokedex/PokedexPageProvider.tsx` | `pathname="/pokedex"`, `selectedName=null`. |

**Resultado:** Secuencia SSR + hydratación completa. Home transiciona a Pokédex. Filtro `tipo1=Fuego` ya aplicado desde la URL. Lista muestra solo tipo Fuego.

---

## 15. Botón atrás del navegador

El usuario pulsa el botón "atrás" estando en `/pokemon/pikachu`.

| # | Archivo | Qué sucede |
|---|---------|-----------|
| 1 | Navegador | Navega a la entrada anterior del historial. Dispara evento `popstate`. |
| 2 | `src/components/app/ViewContext.tsx` | `handlePopState()` — `readPathname()` retorna el pathname anterior. `setPathname(pathname)`. `setView(deriveView(pathname))`. |
| 3 | `src/components/app/ViewContext.tsx` | `deriveSelectedName(pathname)` — si el nuevo pathname es `/pokedex`, retorna `null`. Si es `/pokemon/<name>`, extrae el nombre. |
| 4 | `src/hooks/useNavigation.ts` | Listener de `popstate` independiente → `forceUpdate()`. `pathname` y `searchParams` se actualizan desde `window.location`. |
| 5 | `src/hooks/useFilters.ts` | Si los search params cambiaron, recalcula `filters`. |
| 6 | `src/components/pokedex/PokedexPageProvider.tsx` | `selectedName` cambia según el nuevo pathname. |
| 7 | `src/components/pokedex/slots/CarouselSlot.tsx` | Si `selectedName` pasa a `null`: overlay sale con animación de exit (280ms). Si cambia a otro Pokémon: crossfade del contenido. |
| 8 | `src/components/app/AppShell.tsx` | Si `view` cambió (ej. de `"pokedex"` a `"home"`), `data-view` se actualiza y CSS ejecuta transición completa home↔pokedex. |

**Resultado:** Dependiendo de la entrada del historial, la Pokédex muestra lista o carrusel. Filtros preservados. Sin recarga.

---

## 16. Abrir el chat del Prof. Oak

El usuario hace click en el avatar del Prof. Oak.

| # | Archivo | Qué sucede |
|---|---------|-----------|
| 1 | `src/components/chat/OakChat.tsx` | Al montar la Pokédex, `useEffect` inicia timeout de 2.8s → `openChat()`. O el usuario hace click manual. |
| 2 | `src/components/chat/OakChatAvatar.tsx` | `toggle()` — si `!isOpen`, `openChat()`. Soporta click y teclado (Enter/Space). |
| 3 | `src/components/chat/OakChatContext.tsx` | `openChat()` — `setIsOpen(true)`. |
| 4 | `src/components/chat/OakChatBubble.tsx` | Renderiza la burbuja de chat en estado colapsado (solo mensaje de bienvenida). |
| 5 | `src/components/chat/OakChatInput.tsx` | Input de texto visible. El usuario puede escribir. |

**Resultado:** Burbuja de chat del Prof. Oak visible. Input listo para recibir mensajes.

---

## 17. Enviar mensaje al chat ("Muéstrame a Pikachu")

El usuario escribe y envía un mensaje al Prof. Oak.

| # | Archivo | Qué sucede |
|---|---------|-----------|
| 1 | `src/components/chat/OakChatInput.tsx` | `onSubmit("Muéstrame a Pikachu")` → `sendMessage(text)`. Input se limpia. |
| 2 | `src/components/chat/OakChatContext.tsx` | `sendMessage(text)` — crea `userMsg` (role: "user") y `oakMsg` vacío (role: "oak"). `setMessages([...prev, userMsg, oakMsg])`. `setStatus("streaming")`. |
| 3 | `src/components/chat/OakChatContext.tsx` | `fetch("/api/oak-chat", { method: "POST", body: JSON.stringify({ messages: [...] }) })`. Envía el historial completo al backend. |
| 4 | `src/app/api/oak-chat/route.ts` | `POST` handler — recibe los mensajes. Construye system prompt del Prof. Oak + definiciones de herramientas. Llama a MiniMax M3 con function calling. |
| 5 | `src/app/api/oak-chat/route.ts` | MiniMax responde en streaming. La ruta parsea el stream y emite eventos SSE: `delta`, `tool_start`, `tool_end`, `pokedex_command`, `done`, `error`. |
| 6 | `src/components/chat/OakChatContext.tsx` | `parseSSEStream(response, callbacks)` — lee el stream línea por línea. Parsea eventos SSE. |
| 7 | `src/components/chat/OakChatContext.tsx` | La IA decide llamar a `show_pokemon({ name: "pikachu" })`. SSE emite `event: tool_start` con `{ name: "show_pokemon", args: { name: "pikachu" } }`. `onToolStart()` añade el tool call al mensaje de Oak. |
| 8 | `src/lib/chat/tools/executor.ts` | `executeTool("show_pokemon", { name: "pikachu" })` — retorna `{ type: "pokedex_command", action: "show_pokemon", payload: { name: "pikachu" } }`. |
| 9 | `src/components/chat/OakChatContext.tsx` | SSE emite `event: pokedex_command` con el comando. `onPokedexCommand(cmd)` → `setPendingCommand(cmd)`. |
| 10 | `src/components/chat/usePokedexCommand.ts` | `usePokedexCommand()` — `useEffect` detecta `pendingCommand.action === "show_pokemon"`. `goToPokemon("pikachu")`. `dismissCommand()`. |
| 11 | `src/components/app/ViewContext.tsx` | `goToPokemon("pikachu")` — mismo flujo que acción 4. |
| 12 | `src/components/chat/OakChatContext.tsx` | Stream continúa: `onDelta(token)` añade caracteres a la respuesta de Oak. `event: done` → `onDone()` → `setStatus("idle")`. |
| 13 | `src/components/chat/OakChatAssistantMessage.tsx` | Renderiza la respuesta final con `react-markdown` + `remark-gfm`. Muestra herramientas usadas y razonamiento. |

**Resultado:** Chat muestra respuesta del Prof. Oak. Pokédex navega a Pikachu. URL: `/pokemon/pikachu`.

---

## 18. Enviar "Filtra por tipo agua" al chat

| # | Archivo | Qué sucede |
|---|---------|-----------|
| 1 | `src/components/chat/OakChatInput.tsx` | `sendMessage("Filtra por tipo agua")`. |
| 2 | `src/components/chat/OakChatContext.tsx` | `sendMessage()` — POST a `/api/oak-chat`. SSE streaming. |
| 3 | `src/app/api/oak-chat/route.ts` | IA recibe el mensaje. Decide llamar a `apply_filters({ type1: "water" })`. |
| 4 | `src/lib/chat/tools/executor.ts` | `executeTool("apply_filters", { type1: "water" })` — retorna `{ type: "pokedex_command", action: "apply_filters", payload: { type1: "water" } }`. |
| 5 | `src/components/chat/OakChatContext.tsx` | `event: pokedex_command` → `setPendingCommand({ action: "apply_filters", payload: { type1: "water" } })`. |
| 6 | `src/components/chat/usePokedexCommand.ts` | `usePokedexCommand()` — detecta `action === "apply_filters"`. Primero `goToPokedex()` (cierra overlay si estaba abierto). Itera payload: `setFilter("type1", "water")`. `setExternalCommand("type1 water")`. `dismissCommand()`. |
| 7 | `src/hooks/useFilters.ts` | `setFilter("type1", "water")` → `router.replace("/pokedex?type1=Agua")`. |
| 8 | `src/components/filters/useFilteredPokemonList.ts` | `filterKey` cambia → `doFetch()` con `{ type1: "water" }`. |
| 9 | `src/components/pokedex/console/FilterConsoleSlot.tsx` | Detecta `chatCtx.externalCommand = "type1 water"`. Pasa a `<FilterConsole externalCommand="type1 water" />`. |
| 10 | `src/components/pokedex/console/FilterConsole.tsx` | `useEffect` sobre `externalCommand` — efecto typewriter: escribe `"type1 water"` carácter a carácter en el input (80ms/carácter). Al terminar, ejecuta `execute("type1 water")` → mismo flujo que acción 6. |

**Resultado:** Prof. Oak responde. Filtro tipo Agua aplicado. URL: `/pokedex?type1=Agua`. Consola muestra typewriter del comando.

---

## 19. Toggle Stats ↔ Abilities

El usuario pulsa el botón "VER HABILIDADES" / "VER STATS".

| # | Archivo | Qué sucede |
|---|---------|-----------|
| 1 | `src/components/pokedex/slots/ToggleStatsAbilitiesSlot.tsx` | `onClick` → `setToggleStatsAbilities(nextMode)`. `nextMode` = el opuesto del actual (`"stats"` → `"abilities"`, `"abilities"` → `"stats"`). |
| 2 | `src/components/pokedex/PokedexPageProvider.tsx` | `setToggleStatsAbilities("abilities")` — `useState` setter. Contexto re-provisto. |
| 3 | `src/components/pokedex/PokedexShell.tsx` | `PokedexShell()` re-renderiza. `SlotMap` reconstruido: `StatsSlot` recibe `mode="abilities"`, `ToggleStatsAbilitiesSlot` recibe `mode="abilities"`. |
| 4 | `src/components/pokedex/slots/StatsSlot.tsx` | `mode === "abilities"` → renderiza `<AbilitiesView abilities={...} />` en vez de `<StatsView stats={...} />`. Título cambia a "HABILIDADES". Habilidades ocultas marcadas con badge "OCULTA". |
| 5 | `src/components/pokedex/slots/ToggleStatsAbilitiesSlot.tsx` | Re-renderiza con label `"VER STATS"` (el modo actual es "abilities", el siguiente es "stats"). |
| 6 | Sin fetch | Los datos de stats y habilidades ya están en `PokemonDetail` (cargado por `CarouselController`). No se hace nueva llamada a la API. |

**Resultado:** Panel cambia entre barras de stats y lista de habilidades. Sin carga adicional.

---

## 20. Reproducir cry del Pokémon

El usuario pulsa el botón de sonido en la Pokédex.

| # | Archivo | Qué sucede |
|---|---------|-----------|
| 1 | `src/components/pokedex/slots/SoundSlot.tsx` | `SoundSlot()` — lee `detail` de `useCarouselSafe()`. Renderiza `<PokemonSoundButton cryUrl={detail?.cryLatestUrl} />`. |
| 2 | `src/components/pokedex/carousel/PokemonSoundButton.tsx` | Click → `handlePlay()`. |
| 3 | `src/components/pokedex/carousel/PokemonSoundButton.tsx` | Crea `new Audio(cryUrl)` si no existe en `audioRef`. `audio.preload = "auto"`. Listener `"ended"` → `setPlaying(false)`. |
| 4 | `src/components/pokedex/carousel/PokemonSoundButton.tsx` | `audio.currentTime = 0` (stop-and-replay: si ya estaba sonando, reinicia). `setPlaying(true)`. `audio.play()`. |
| 5 | `src/components/pokedex/carousel/PokemonSoundButton.tsx` | Botón recibe `data-playing="true"`, `aria-pressed="true"`. Ondas de sonido animadas visibles. |
| 6 | `src/components/pokedex/carousel/PokemonSoundButton.tsx` | Audio termina → evento `"ended"` → `setPlaying(false)`. Botón vuelve a estado normal. |
| 7 | Cleanup | Si el componente se desmonta durante la reproducción: `useEffect` cleanup pausa el audio y libera recursos. |

**Resultado:** Sonido del Pokémon reproducido. Animación de ondas durante la reproducción.

---

## 21. Toggle música de fondo

El usuario pulsa el botón de sonido en la pantalla de inicio.

| # | Archivo | Qué sucede |
|---|---------|-----------|
| 1 | `src/components/home/SoundToggle.tsx` | Click → `toggle()`. Si `enabled=false`: crea `new Audio("/pagina_inicio/musica.mp3")`, `audio.loop = true`, `audio.volume = 0.6`, `audio.play()`. `setEnabled(true)`. Persiste a `localStorage`. |
| 2 | `src/components/home/SoundToggle.tsx` | Si `enabled=true`: `audio.pause()`, `setEnabled(false)`, actualiza `localStorage`. |
| 3 | `src/components/home/SoundToggle.tsx` | `useEffect` sobre `view` (de `useAppShell()`): si `view="pokedex"`, crossfade del volumen a 0 en 600ms con `requestAnimationFrame`. Si `view="home"` y música activa, crossfade a 0.6 en 600ms. |
| 4 | `src/components/home/SoundToggle.tsx` | Al montar, lee `localStorage` para restaurar preferencia. Si el navegador rechaza `audio.play()` (autoplay policy), revierte `setEnabled(false)`. |

**Resultado:** Música de fondo se activa/desactiva. Volumen se atenúa automáticamente al entrar en la Pokédex. Preferencia persistida.

---

## 22. Volver al inicio desde la Pokédex

El usuario pulsa el logo de la Pokédex (botón Home flotante).

| # | Archivo | Qué sucede |
|---|---------|-----------|
| 1 | `src/components/pokedex/PokedexHomeButton.tsx` | Click → `goToHome()`. Protección anti-doble-click: `inflightRef` con debounce de 850ms. |
| 2 | `src/components/app/ViewContext.tsx` | `goToHome()` — `window.history.pushState({}, "", "/")`. `setPathname("/")`. `setView("home")`. |
| 3 | `src/components/app/AppShell.tsx` | `AppShellInner()` — `view` cambia a `"home"`. `<div>` raíz actualiza `data-view="home"`. |
| 4 | `src/app/globals.css` | CSS: `[data-view="home"]` — elementos de home entran desde los bordes. `.pokedex-view` hace `translateY(100%)` (se oculta abajo). Duración ~800ms. |
| 4 | `src/components/home/SoundToggle.tsx` | `view="home"` + música activa → crossfade volumen a 0.6. |
| 5 | `src/components/pokedex/PokedexPageProvider.tsx` | `pathname="/"`, `selectedName=null`. Overlay del carrusel se cierra si estaba abierto. |
| 6 | Todos los componentes de la Pokédex | Siguen montados pero ocultos. Estado preservado (filtros, scroll, posición de lista). |

**Resultado:** Home visible con animación de entrada. Pokédex oculta bajo la pantalla. Música recupera volumen. Todo el estado de la Pokédex preservado para cuando el usuario vuelva.

---

## Resumen de patrones de navegación

| Acción | API usada | ¿Transición home↔pokedex? | ¿Animación overlay? |
|--------|----------|--------------------------|---------------------|
| START / deep-link externo | `pushState` | **SÍ** (coreografía completa) | SÍ (si hay pokémon) |
| Click en card | `pushState` | NO (Pokédex ya visible) | SÍ (scale+fade enter) |
| Click en evolución | `pushState` | NO | SÍ (crossfade) |
| Botón X (cerrar carrusel) | `pushState` | NO | SÍ (scale+fade exit) |
| Aplicar filtro | `router.replace` | NO | n/a |
| Back/forward navegador | `popstate` | **SÍ** (si cambia vista) | SÍ (si cambia pokémon) |
| Botón Home | `pushState` | **SÍ** (pokedex→home) | n/a |
| Recargar página | SSR + hydration | **SÍ** (transición de entrada) | SÍ (si hay pokémon en URL) |

---

## Glosario de archivos

Cada archivo del proyecto con los puntos donde interviene en los flujos descritos arriba.

### `src/app/`

| Archivo | Puntos |
|---------|--------|
| `src/app/layout.tsx` | [1](#1-cargar-la-página-de-inicio-) |
| `src/app/page.tsx` | [1](#1-cargar-la-página-de-inicio-) |
| `src/app/pokedex/page.tsx` | [14](#14-recargar-la-página-en-pokedeftipo1fuego) |
| `src/app/pokemon/[name]/page.tsx` | [3](#3-abrir-deep-link-pokemonpikachu) |
| `src/app/globals.css` | [2](#2-pulsar-start-home--pokédex), [10](#10-activar-modo-3d), [11](#11-cerrar-modo-3d), [22](#22-volver-al-inicio-desde-la-pokédex) |
| `src/app/api/oak-chat/route.ts` | [17](#17-enviar-mensaje-al-chat-muéstrame-a-pikachu), [18](#18-enviar-filtra-por-tipo-agua-al-chat) |
| `src/app/api/pokeapi/route.ts` | (proxy — no trazado en flujos de usuario, opera transparente) |

### `src/components/app/`

| Archivo | Puntos |
|---------|--------|
| `src/components/app/AppShell.tsx` | [1](#1-cargar-la-página-de-inicio-), [2](#2-pulsar-start-home--pokédex), [15](#15-botón-atrás-del-navegador), [22](#22-volver-al-inicio-desde-la-pokédex) |
| `src/components/app/ViewContext.tsx` | [1](#1-cargar-la-página-de-inicio-), [2](#2-pulsar-start-home--pokédex), [3](#3-abrir-deep-link-pokemonpikachu), [4](#4-click-en-una-card-de-la-lista), [5](#5-cerrar-el-carrusel-botón-x), [8](#8-escribir-en-el-buscador), [12](#12-click-en-una-evolución), [14](#14-recargar-la-página-en-pokedeftipo1fuego), [15](#15-botón-atrás-del-navegador), [17](#17-enviar-mensaje-al-chat-muéstrame-a-pikachu), [22](#22-volver-al-inicio-desde-la-pokédex) |
| `src/components/app/PokedexPageTransition.tsx` | [3](#3-abrir-deep-link-pokemonpikachu), [14](#14-recargar-la-página-en-pokedeftipo1fuego) |
| `src/components/app/PokedexOverlay.tsx` | [1](#1-cargar-la-página-de-inicio-) |

### `src/components/pokedex/`

| Archivo | Puntos |
|---------|--------|
| `src/components/pokedex/PokedexShell.tsx` | [1](#1-cargar-la-página-de-inicio-), [2](#2-pulsar-start-home--pokédex), [3](#3-abrir-deep-link-pokemonpikachu), [4](#4-click-en-una-card-de-la-lista), [19](#19-toggle-stats--abilities) |
| `src/components/pokedex/PokedexPageProvider.tsx` | [1](#1-cargar-la-página-de-inicio-), [2](#2-pulsar-start-home--pokédex), [3](#3-abrir-deep-link-pokemonpikachu), [4](#4-click-en-una-card-de-la-lista), [5](#5-cerrar-el-carrusel-botón-x), [10](#10-activar-modo-3d), [11](#11-cerrar-modo-3d), [12](#12-click-en-una-evolución), [14](#14-recargar-la-página-en-pokedeftipo1fuego), [15](#15-botón-atrás-del-navegador), [19](#19-toggle-stats--abilities), [22](#22-volver-al-inicio-desde-la-pokédex) |
| `src/components/pokedex/PokedexHomeButton.tsx` | [22](#22-volver-al-inicio-desde-la-pokédex) |

### `src/components/pokedex/slots/`

| Archivo | Puntos |
|---------|--------|
| `src/components/pokedex/slots/Button3DSlot.tsx` | [10](#10-activar-modo-3d) |
| `src/components/pokedex/slots/CarouselSlot.tsx` | [3](#3-abrir-deep-link-pokemonpikachu), [4](#4-click-en-una-card-de-la-lista), [5](#5-cerrar-el-carrusel-botón-x), [12](#12-click-en-una-evolución), [15](#15-botón-atrás-del-navegador) |
| `src/components/pokedex/slots/ChipsSlot.tsx` | [3](#3-abrir-deep-link-pokemonpikachu) |
| `src/components/pokedex/slots/EvolutionsSlot.tsx` | [3](#3-abrir-deep-link-pokemonpikachu), [12](#12-click-en-una-evolución) |
| `src/components/pokedex/slots/StatsSlot.tsx` | [3](#3-abrir-deep-link-pokemonpikachu), [19](#19-toggle-stats--abilities) |
| `src/components/pokedex/slots/ToggleStatsAbilitiesSlot.tsx` | [19](#19-toggle-stats--abilities) |
| `src/components/pokedex/slots/SoundSlot.tsx` | [20](#20-reproducir-cry-del-pokémon) |
| `src/components/pokedex/slots/FilterConsoleSlot.tsx` | [18](#18-enviar-filtra-por-tipo-agua-al-chat) |
| `src/components/pokedex/slots/CarouselDotsSlot.tsx` | (renderizado pasivo — lee de CarouselController) |
| `src/components/pokedex/slots/CarouselButtonsSlot.tsx` | (renderizado pasivo — lee de CarouselController) |
| `src/components/pokedex/slots/FilterDropdownsSlot.tsx` | (wrapper — delega en FilterDropdowns) |
| `src/components/pokedex/slots/SearchResetFilterSlot.tsx` | (wrapper — delega en SearchInput + ResetFilterButtons) |

### `src/components/pokedex/carousel/`

| Archivo | Puntos |
|---------|--------|
| `src/components/pokedex/carousel/CarouselController.tsx` | [3](#3-abrir-deep-link-pokemonpikachu), [4](#4-click-en-una-card-de-la-lista), [12](#12-click-en-una-evolución) |
| `src/components/pokedex/carousel/PokemonSoundButton.tsx` | [20](#20-reproducir-cry-del-pokémon) |

### `src/components/pokedex/list/`

| Archivo | Puntos |
|---------|--------|
| `src/components/pokedex/list/PokemonList.tsx` | [1](#1-cargar-la-página-de-inicio-), [4](#4-click-en-una-card-de-la-lista), [6](#6-comando-en-la-consola-tipo1-fuego), [13](#13-scroll-al-final-de-la-lista) |
| `src/components/pokedex/list/PokemonListCard.tsx` | [4](#4-click-en-una-card-de-la-lista) |

### `src/components/pokedex/console/`

| Archivo | Puntos |
|---------|--------|
| `src/components/pokedex/console/FilterConsole.tsx` | [6](#6-comando-en-la-consola-tipo1-fuego), [18](#18-enviar-filtra-por-tipo-agua-al-chat) |
| `src/components/pokedex/console/consoleParser.ts` | [6](#6-comando-en-la-consola-tipo1-fuego) |
| `src/components/pokedex/console/consoleExecutor.ts` | [6](#6-comando-en-la-consola-tipo1-fuego) |

### `src/components/pokedex/3d/`

| Archivo | Puntos |
|---------|--------|
| `src/components/pokedex/3d/Mode3DHabitatOverlay.tsx` | [10](#10-activar-modo-3d), [11](#11-cerrar-modo-3d) |
| `src/components/pokedex/3d/Mode3DViewBinder.tsx` | [10](#10-activar-modo-3d), [11](#11-cerrar-modo-3d) |
| `src/components/pokedex/3d/Model3DPreloader.tsx` | [3](#3-abrir-deep-link-pokemonpikachu) |
| `src/components/pokedex/3d/PokemonViewer3D.tsx` | [10](#10-activar-modo-3d) |
| `src/components/pokedex/3d/usePokemonModel.ts` | [10](#10-activar-modo-3d) |

### `src/components/filters/`

| Archivo | Puntos |
|---------|--------|
| `src/components/filters/FiltersProvider.tsx` | [1](#1-cargar-la-página-de-inicio-), [7](#7-seleccionar-filtro-en-dropdown) |
| `src/components/filters/FilterDropdowns.tsx` | [7](#7-seleccionar-filtro-en-dropdown) |
| `src/components/filters/SearchInput.tsx` | [8](#8-escribir-en-el-buscador), [9](#9-botón-reset-limpiar-filtros) |
| `src/components/filters/ResetFilterButtons.tsx` | [9](#9-botón-reset-limpiar-filtros) |
| `src/components/filters/useFilteredPokemonList.ts` | [1](#1-cargar-la-página-de-inicio-), [6](#6-comando-en-la-consola-tipo1-fuego), [7](#7-seleccionar-filtro-en-dropdown), [8](#8-escribir-en-el-buscador), [9](#9-botón-reset-limpiar-filtros), [13](#13-scroll-al-final-de-la-lista), [14](#14-recargar-la-página-en-pokedeftipo1fuego), [18](#18-enviar-filtra-por-tipo-agua-al-chat) |
| `src/components/filters/useFilterOptions.ts` | [7](#7-seleccionar-filtro-en-dropdown) |
| `src/components/filters/useFilterAvailability.ts` | [6](#6-comando-en-la-consola-tipo1-fuego), [7](#7-seleccionar-filtro-en-dropdown), [9](#9-botón-reset-limpiar-filtros) |

### `src/components/home/`

| Archivo | Puntos |
|---------|--------|
| `src/components/home/HomeShell.tsx` | [1](#1-cargar-la-página-de-inicio-) |
| `src/components/home/HomeViewContent.tsx` | [1](#1-cargar-la-página-de-inicio-) |
| `src/components/home/HomeViewNavListeners.tsx` | [1](#1-cargar-la-página-de-inicio-), [2](#2-pulsar-start-home--pokédex) |
| `src/components/home/PressStartButton.tsx` | [2](#2-pulsar-start-home--pokédex) |
| `src/components/home/SoundToggle.tsx` | [21](#21-toggle-música-de-fondo) |
| `src/components/home/AnimatedBackground.tsx` | [1](#1-cargar-la-página-de-inicio-) |

### `src/components/chat/`

| Archivo | Puntos |
|---------|--------|
| `src/components/chat/OakChatContext.tsx` | [2](#2-pulsar-start-home--pokédex), [16](#16-abrir-el-chat-del-prof-oak), [17](#17-enviar-mensaje-al-chat-muéstrame-a-pikachu), [18](#18-enviar-filtra-por-tipo-agua-al-chat) |
| `src/components/chat/OakChat.tsx` | [2](#2-pulsar-start-home--pokédex), [16](#16-abrir-el-chat-del-prof-oak) |
| `src/components/chat/OakChatAvatar.tsx` | [16](#16-abrir-el-chat-del-prof-oak) |
| `src/components/chat/OakChatBubble.tsx` | [16](#16-abrir-el-chat-del-prof-oak) |
| `src/components/chat/OakChatInput.tsx` | [16](#16-abrir-el-chat-del-prof-oak), [17](#17-enviar-mensaje-al-chat-muéstrame-a-pikachu), [18](#18-enviar-filtra-por-tipo-agua-al-chat) |
| `src/components/chat/OakChatAssistantMessage.tsx` | [17](#17-enviar-mensaje-al-chat-muéstrame-a-pikachu) |
| `src/components/chat/usePokedexCommand.ts` | [17](#17-enviar-mensaje-al-chat-muéstrame-a-pikachu), [18](#18-enviar-filtra-por-tipo-agua-al-chat) |

### `src/hooks/`

| Archivo | Puntos |
|---------|--------|
| `src/hooks/useFilters.ts` | [6](#6-comando-en-la-consola-tipo1-fuego), [7](#7-seleccionar-filtro-en-dropdown), [8](#8-escribir-en-el-buscador), [9](#9-botón-reset-limpiar-filtros), [14](#14-recargar-la-página-en-pokedeftipo1fuego), [15](#15-botón-atrás-del-navegador), [18](#18-enviar-filtra-por-tipo-agua-al-chat) |
| `src/hooks/useNavigation.ts` | [1](#1-cargar-la-página-de-inicio-), [6](#6-comando-en-la-consola-tipo1-fuego), [7](#7-seleccionar-filtro-en-dropdown), [9](#9-botón-reset-limpiar-filtros), [15](#15-botón-atrás-del-navegador) |
| `src/hooks/NavigationSSRContext.tsx` | [1](#1-cargar-la-página-de-inicio-), [14](#14-recargar-la-página-en-pokedeftipo1fuego) |
| `src/hooks/useViewportLayout.ts` | [1](#1-cargar-la-página-de-inicio-) |

### `src/lib/graphql/`

| Archivo | Puntos |
|---------|--------|
| `src/lib/graphql/client.ts` | [1](#1-cargar-la-página-de-inicio-) |
| `src/lib/graphql/where.ts` | [6](#6-comando-en-la-consola-tipo1-fuego) |
| `src/lib/graphql/queries/pokemonListFiltered.gql.ts` | [1](#1-cargar-la-página-de-inicio-), [6](#6-comando-en-la-consola-tipo1-fuego) |
| `src/lib/graphql/queries/pokemonDetail.gql.ts` | [3](#3-abrir-deep-link-pokemonpikachu) |
| `src/lib/graphql/queries/pokemonList.gql.ts` | (lista sin filtros — no trazada directamente) |
| `src/lib/graphql/queries/filterOptions.gql.ts` | [7](#7-seleccionar-filtro-en-dropdown) |

### `src/lib/pokemon/`

| Archivo | Puntos |
|---------|--------|
| `src/lib/pokemon/cachedPokemonApi.ts` | [1](#1-cargar-la-página-de-inicio-), [3](#3-abrir-deep-link-pokemonpikachu), [13](#13-scroll-al-final-de-la-lista) |
| `src/lib/pokemon/fetchListFiltered.ts` | [6](#6-comando-en-la-consola-tipo1-fuego), [8](#8-escribir-en-el-buscador) |
| `src/lib/pokemon/fetchDetail.ts` | [3](#3-abrir-deep-link-pokemonpikachu) |
| `src/lib/pokemon/mapRawList.ts` | [1](#1-cargar-la-página-de-inicio-) |
| `src/lib/pokemon/cacheStrategy.ts` | [1](#1-cargar-la-página-de-inicio-) |
| `src/lib/pokemon/fetchList.ts` | (lista sin filtros — no trazada directamente) |
| `src/lib/pokemon/fetchFilterOptions.ts` | [7](#7-seleccionar-filtro-en-dropdown) |
| `src/lib/pokemon/fetchFilterAvailability.ts` | [6](#6-comando-en-la-consola-tipo1-fuego), [7](#7-seleccionar-filtro-en-dropdown) |

### `src/lib/filters/`

| Archivo | Puntos |
|---------|--------|
| `src/lib/filters/serialization.ts` | [1](#1-cargar-la-página-de-inicio-), [6](#6-comando-en-la-consola-tipo1-fuego), [7](#7-seleccionar-filtro-en-dropdown), [9](#9-botón-reset-limpiar-filtros) |
| `src/lib/filters/types.ts` | [6](#6-comando-en-la-consola-tipo1-fuego), [7](#7-seleccionar-filtro-en-dropdown) |

### `src/lib/constants/`

| Archivo | Puntos |
|---------|--------|
| `src/lib/constants/pokemonTypes.ts` | [6](#6-comando-en-la-consola-tipo1-fuego), [14](#14-recargar-la-página-en-pokedeftipo1fuego) |
| `src/lib/constants/pokemonGenerations.ts` | [3](#3-abrir-deep-link-pokemonpikachu) |
| `src/lib/constants/habitats.ts` | [10](#10-activar-modo-3d) |
| `src/lib/constants/colors.ts` | (paleta base — referenciada por tipos y generaciones) |

### `src/lib/chat/tools/`

| Archivo | Puntos |
|---------|--------|
| `src/lib/chat/tools/executor.ts` | [17](#17-enviar-mensaje-al-chat-muéstrame-a-pikachu), [18](#18-enviar-filtra-por-tipo-agua-al-chat) |
| `src/lib/chat/tools/definitions.ts` | [17](#17-enviar-mensaje-al-chat-muéstrame-a-pikachu) |

### `src/lib/utils/`

| Archivo | Puntos |
|---------|--------|
| `src/lib/utils/search-params.ts` | [1](#1-cargar-la-página-de-inicio-), [14](#14-recargar-la-página-en-pokedeftipo1fuego) |

### `src/lib/types/`

| Archivo | Puntos |
|---------|--------|
| `src/lib/types/pokemon.ts` | (tipos compartidos — referenciado en todos los flujos) |

### `public/`

| Archivo | Puntos |
|---------|--------|
| `public/pokedex_vertical.svg` | [1](#1-cargar-la-página-de-inicio-) |
| `public/pokedex_horizontal.svg` | [1](#1-cargar-la-página-de-inicio-) |
| `public/pagina_inicio/musica.mp3` | [21](#21-toggle-música-de-fondo) |
