# Plan de Desarrollo — Pokédex

Índice maestro de planes. Cada plan es un archivo `.md` independiente dividido en **fases** atómicas. Las fases se ejecutan en orden dentro de cada plan y los planes se ejecutan en orden numérico.

## Cómo leer un plan

Cada plan contiene:

- **Objetivo**: qué se consigue al terminar el plan.
- **Contexto / Dependencias**: qué planes previos deben estar terminados.
- **Fases**: unidades de trabajo. Cada fase incluye:
  - Objetivo y tareas concretas.
  - **Skills recomendadas**: habilidades de `.agents/skills/` a cargar antes de empezar.
  - **Tests a diseñar (antes)**: TDD — los tests se escriben antes del código.
  - **Tests a ejecutar (después)**: comandos a pasar antes de dar la fase por buena.
  - **Criterios de aceptación**: lista verificable.
  - **Documentación**: si hay que actualizar `README.md` y/o `AGENTS.md`.
  - **Revisión humana**: si la fase implementa diseño/UX y requiere validación humana.

## Convenciones transversales (aplican a TODAS las fases)

- **Idioma**: español en toda la app, código en inglés.
- **Sin emojis**: solo iconos (`lucide-react`) o SVG. Prohibido emojis en UI y en código.
- **Sin transiciones bruscas**: todo elemento que aparezca, desaparezca o cambie de estado debe tener animación/transición CSS o por librería.
- **Componentes reutilizables**: si un elemento se repite con variaciones, debe ser un componente.
- **Datos primero, diseño después**: dentro de cada plan se desarrolla primero la obtención de datos y luego la UI.
- **Consultas GraphQL optimizadas**: traer solo los campos necesarios. Nunca `*`-style.
- **Next.js 16.2.9**: leer SIEMPRE la guía relevante en `node_modules/next/dist/docs/` antes de tocar APIs (RSC, metadata, fetch, cache components). La versión tiene breaking changes.
- **Testing**: TDD — diseñar tests al inicio de la fase, ejecutarlos al final. Las fases puras de configuración/transición no requieren tests.
- **Lint + typecheck**: al final de cada fase con código, ejecutar `npm run lint` y `npx tsc --noEmit`.
- **Revisión humana**: al terminar cualquier fase que toque diseño/UX, solicitar validación humana explícitamente.
- **Hábitat vs. vista 3D**: al seleccionar un pokemon el hábitat aparece como fondo ambientador **detrás** de la pokedex, que permanece visible y operativa (no baja). La pokedex solo baja al activar explícitamente la vista 3D (botón 3D). El ciclo de vida del hábitat depende exclusivamente de "hay pokemon seleccionado", no del modo 3D.

## Orden de ejecución

| # | Plan | Archivo | Dependencias |
|---|------|---------|--------------|
| 00 | Configuración y Fundaciones | `plan/00_Configuracion_y_Fundaciones.md` | — |
| 01 | Capa de Datos PokeAPI GraphQL | `plan/01_Capa_de_Datos_PokeAPI.md` | 00 |
| 02 | Routing y Estado Compartido | `plan/02_Routing_y_Estado_Compartido.md` | 00, 01 |
| 03 | Página de Inicio | `plan/03_Pagina_de_Inicio.md` | 02 |
| 04 | Transiciones Inicio ↔ Pokédex | `plan/04_Transiciones_Inicio_Pokedex.md` | 03, 05 |
| 05 | Carcasa Pokédex (SVG → TSX) | `plan/05_Carcasa_Pokedex.md` | 02 |
| 06 | Lista y Carrusel de Pokemons | `plan/06_Lista_y_Carrusel.md` | 01, 05 |
| 07 | Sistema de Filtros | `plan/07_Sistema_de_Filtros.md` | 01, 02, 06 |
| 08 | Detalle de Pokemon (Chips, Evo, Stats) | `plan/08_Detalle_Pokemon.md` | 01, 06 |
| 09 | Vista 3D Three.js | `plan/09_Vista_3D.md` | 08 |
| 10 | Fondo Hábitat y Pulido Final | `plan/10_Fondo_Habitat_y_Pulido.md` | 03, 06, 08, 09 |

## Notas sobre el orden

- El **Plan 05 (Carcasa)** puede ejecutarse en paralelo con los planes 03/04 pues solo depende del 02.
- El **Plan 04 (Transiciones)** requiere que existan tanto la página de inicio (03) como la carcasa (05).
- Los planes 06, 07 y 08 dependen todos del plan 01 (datos) y del 05 (carcasa como contenedor). Pueden parcialmente solaparse pero se recomienda orden estricto para reducir conflictos.
- El plan 09 (3D) requiere el 08 porque el botón 3D solo aparece con un pokemon seleccionado.
- El plan 10 es de integración final y pulido: cierra el ciclo visual y aplica accesibilidad + performance.

## Stack técnico confirmado

- **Next.js 16.2.9** (App Router, RSC, cache components).
- **React 19.2.4**.
- **TypeScript 5**.
- **Tailwind CSS 4** (vía `@tailwindcss/postcss`).
- **lucide-react** para iconos.
- **three 0.184** para 3D.
- **PokeAPI GraphQL**: endpoint `https://beta.pokeapi.co/graphql/v1beta`.
- **vitest 4** (unit) + **@playwright/test 1.61** (E2E).
- **@testing-library/react** para tests de componentes.

## Recursos disponibles

- Tipografía: `public/PressStart2P-Regular.ttf`.
- Fondos de hábitat: `public/habitats/*.webp` (10 hábitats + `generico.webp`).
- Assets de inicio: `public/pagina_inicio/` (logo, ash, pokedex cerrada, pokemons, música, tile).
- Loading: `public/loading-pikachu.gif`.
- SVGs Pokédex: `public/pokedex_horizontal.svg`, `public/pokedex_vertical.svg`.
- Favicon: `public/favicon.png`.
- Documentación PokeAPI: `doc/pokeapi/` (referencia graphql + ejemplos en `graphql/v1beta/examples/`).
