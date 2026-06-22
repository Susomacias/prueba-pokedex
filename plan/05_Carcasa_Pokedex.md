# Plan 05 — Carcasa Pokédex (SVG → TSX con slots)

## Objetivo

Convertir los SVG `pokedex_horizontal.svg` y `pokedex_vertical.svg` en componentes TypeScript con **slots** (puntos de inyección de HTML) nombrados según las capas invisibles del SVG, manteniendo la lógica de inyección **separada** del código SVG.

## Principios del borrador (CRÍTICOS)

- NO usar los SVG como `<img src>`: hay que convertirlos a código TSX.
- Los SVG tienen capas invisibles (`<g id="...">`) que delimitan los espacios disponibles.
- El HTML inyectado **nunca** debe sobresalir del perímetro del objeto de la capa.
- SVG horizontal y vertical en **archivos separados**.
- La lógica de construcción del HTML inyectado en **otro archivo** distinto al del SVG.
- La disposición de elementos cambia entre horizontal y vertical.
- La pokedex nunca debe sobresalir de la pantalla ni generar scroll.

## Capas identificadas en los SVG (de `pokedex_vertical.svg` y `pokedex_horizontal.svg`)

| ID de capa | Función |
|------------|---------|
| `CARCASA` | Solo fondo, no se toca. |
| `BOTON_3D` | Botón "Ver en 3D" (solo si modelo disponible). |
| `TIPO1_TIPO2_GENERACION` | Chips de tipo1, tipo2 y generación. |
| `PUNTOS_CARRUSEL` | LEDs del carrusel. |
| `CARRUSEL_IMAGENES_DESCRIPCION` | Lista o carrusel de imágenes+info. |
| `BOTONES_CARRUSEL` | Botones analógicos izq/der. |
| `SONIDO_POKEMON` | Botón de sonido (cry). |
| `EVOLUCIONES` | Árbol de evoluciones (pantalla LCD verde). |
| `STATS` | Stats o habilidades (pantalla LCD verde). |
| `VER_HABILIDDES_VER_STATS` | Botón start negro toggle. |
| `CONSOLA_FILTROS` | Consola terminal de filtros. |
| `DROPDOWNS_FILTROS` | Botones cuadrados cyan de filtros. |
| `BUSCAR_RESET_FILTRAR` | Buscador + reset + filtrar. |

> Nota: los IDs en el SVG vienen con `_x5F_` que es la codificación XML de `_`. Ej: `BOTON_x5F_3D` = `BOTON_3D`.

## Contexto / Dependencias

- **Requiere**: Plan 02 (routing).
- **Habilita**: Planes 06 (lista/carrusel), 07 (filtros), 08 (detalle), 09 (3D).

## Fases

---

### Fase 05.1 — Componente carcasa vertical

**Objetivo:** convertir `pokedex_vertical.svg` en un componente TSX paramétrico con slots.

**Tareas:**
- Leer el SVG crudo y convertirlo a JSX en `src/components/pokedex/carcases/PokedexVerticalSvg.tsx`.
- Limpiar el SVG:
  - Quitar `xml` declaration y comentarios de Adobe.
  - Mover los `<style>` inline a un módulo CSS o a clases Tailwind si aplica (los `.st0`, `.st1`, etc. son clases con fill/stroke; mantenerlos como clases CSS inline o styled).
  - Los `<g id="...">` se mantienen pero se les añade un `<foreignObject>` o `<svg>` anidado en el rect invisible para inyectar HTML dentro.
- El componente acepta un prop `slots: Record<SlotName, ReactNode>` donde `SlotName` es la unión de los IDs de capa.
- Por cada slot, renderizar el contenido dentro del perímetro del `<rect>` o `<circle>` que define la capa.
- Sin lógica de UI dentro del componente SVG: solo la carcasa y los huecos.

**Skills recomendadas:**
- `frontend-design`.
- `typescript-advanced-types` (Record<SlotName, ReactNode>).
- `vercel-react-best-practices` (server serialization; el SVG puede ser server component).

**Tests a diseñar (antes):**
- Test: el componente renderiza sin slots (todos vacíos).
- Test: renderiza con contenido en cada slot y el contenido aparece dentro del perímetro (mock de refs).
- Test: el viewBox no se altera.

**Tests a ejecutar (después):**
- `npm run test:run`
- `npm run lint`

**Criterios de aceptación:**
- El SVG se ve idéntico al original.
- Los slots aceptan ReactNode.

**Documentación:** No.

**Revisión humana:** Sí (comparación visual con el SVG original).

---

### Fase 05.2 — Componente carcasa horizontal

**Objetivo:** igual que 05.1 pero con `pokedex_horizontal.svg` (disposición distinta).

**Tareas:**
- `src/components/pokedex/carcases/PokedexHorizontalSvg.tsx`.
- Mismo sistema de slots. La diferencia con la vertical es la posición/rotación de los rect invisibles y la orientación de chips/tipos (ver borrador: tipos a la derecha en horizontal, arriba en vertical; generación a la izquierda en horizontal, abajo en vertical).
- Tipo `SlotName` compartido entre las dos carcases (mismo set de IDs).

**Skills recomendadas:** mismas que 05.1.

**Tests a diseñar (antes):** mismos que 05.1.

**Tests a ejecutar (después):**
- `npm run test:run`
- `npm run lint`

**Criterios de aceptación:**
- Visualmente fiel al original.
- Slots funcionan.

**Documentación:** No.

**Revisión humana:** Sí.

---

### Fase 05.3 — Lógica de slots (HTML que se inyecta)

**Objetivo:** crear la capa de lógica que decide qué HTML va en cada slot según el estado (pokemon seleccionado o no, modo 3D activo, etc.).

**Tareas:**
- `src/components/pokedex/slots/` con un archivo por slot:
  - `ChipsSlot.tsx` (TIPO1_TIPO2_GENERACION).
  - `CarouselSlot.tsx` (CARRUSEL_IMAGENES_DESCRIPCION).
  - `CarouselDotsSlot.tsx` (PUNTOS_CARRUSEL).
  - `CarouselButtonsSlot.tsx` (BOTONES_CARRUSEL).
  - `SoundSlot.tsx` (SONIDO_POKEMON).
  - `EvolutionsSlot.tsx` (EVOLUCIONES).
  - `StatsSlot.tsx` (STATS).
  - `FilterConsoleSlot.tsx` (CONSOLA_FILTROS).
  - `FilterDropdownsSlot.tsx` (DROPDOWNS_FILTROS).
  - `SearchResetFilterSlot.tsx` (BUSCAR_RESET_FILTRAR).
  - `Button3DSlot.tsx` (BOTON_3D).
  - `ToggleStatsAbilitiesSlot.tsx` (VER_HABILIDDES_VER_STATS).
- Cada slot es un componente que recibe el estado necesario y devuelve `ReactNode`. La implementación detallada de cada uno se hace en los planes 06, 07, 08, 09; aquí solo se crean los stubs con la firma y el layout contenedor.
- Un `PokedexShell` que recibe el estado y ensambla el slot map:
  ```ts
  const slots = { CARCASA: null, BOTON_3D: <Button3DSlot .../>, ... }
  ```

**Skills recomendadas:**
- `vercel-composition-patterns` (compound components, children over render props).
- `typescript-advanced-types`.

**Tests a diseñar (antes):**
- Test: `PokedexShell` ensambla el slot map correcto según estado (pokemon seleccionado vs no).

**Tests a ejecutar (después):**
- `npm run test:run`
- `npm run lint`

**Criterios de aceptación:**
- Todos los slots existen con firma tipada.
- `PokedexShell` selecciona carcasa vertical/horizontal según viewport.

**Documentación:**
- `AGENTS.md`: "Cada capa del SVG tiene su componente slot en `src/components/pokedex/slots/`. La carcasa solo recibe ReactNode, no lógica."

**Revisión humana:** No (stubs vacíos).

---

### Fase 05.4 — Switch responsive vertical/horizontal y layout sin scroll

**Objetivo:** decidir qué carcasa mostrar según tamaño de pantalla y garantizar que ocupa toda la pantalla sin scroll.

**Tareas:**
- Hook `useViewportLayout()` que devuelva `'vertical' | 'horizontal'` según `window.innerWidth` (breakpoint ~768px o el que se vea bien con los SVGs).
- En `src/app/pokedex/page.tsx`, renderizar `PokedexVertical` o `PokedexHorizontal` según el hook. Para evitar mismatch de hidratación: usar CSS para ocultar/mostrar ambas carcases o usar `useSyncExternalStore` con media query.
- La carcasa ocupa el 100% del viewport (`100dvh`, `100vw`) sin scroll. Cuidado en mobile cuando aparece el teclado (ver Plan 07): el input del buscador no debe quedar tapado.
- Evitar scroll horizontal/vertical en `body` cuando se está en `/pokedex`.

**Skills recomendadas:**
- `tailwind-css-patterns` (responsive, dvh).
- `next-best-practices` (hydration, `useSyncExternalStore`).

**Tests a diseñar (antes):**
- Test: el hook devuelve `'vertical'` en viewport 400px y `'horizontal'` en 1280px.
- E2E: en `/pokedex`, no hay scroll horizontal ni vertical (verificar `document.documentElement.scrollWidth === window.innerWidth`).

**Tests a ejecutar (después):**
- `npm run test:run`
- `npm run test:e2e`
- `npm run lint`

**Criterios de aceptación:**
- Carcasa correcta por tamaño.
- Sin scroll.

**Documentación:** No.

**Revisión humana:** Sí.

---

## Riesgos

- **Tamaño de los SVG (253 líneas cada uno)**: convertir a JSX manualmente es propenso a errores. Automatizar con un transformador si es posible (`svgr` ya está soportado por Next, o un script ad-hoc).
- **`<foreignObject>` vs SVG anidado**: para inyectar HTML dentro de un SVG, `foreignObject` es la opción. Verificar soporte y rendimiento.
- **Aspect ratio**: los viewBox son `828.25 × 1062.6` (vertical) y `1062.6 × 828.25` (horizontal). Hay que escalar manteniendo proporción y ocupando el máximo posible del viewport sin scroll.
