# Plan 09 — Vista 3D Three.js

## Objetivo

Implementar la visualización 3D de pokemons con `three.js`: carga asíncrona del modelo `.glb`, render con cámara inclinada, rotación lenta, interacción por drag horizontal y transición coordinada con la pokedex.

## Fuente de modelos 3D

`https://raw.githubusercontent.com/Pokemon-3D-api/assets/refs/heads/main/models/opt/regular/{id}.glb`

El número final es el **id** del pokemon. Algunos no existen o dan error → el botón 3D no se muestra en esos casos (Plan 08.5).

## Comportamientos del borrador

- Tras obtener y renderizar la ficha del pokemon, empezar la carga asíncrona del modelo.
- El botón 3D solo aparece cuando el modelo está cargado y disponible (invisible con `opacity: 0`, luego transición a `1`).
- El modelo puede tener tamaños dispares sin criterio → **auto-escalar** al viewport.
- Cámara: vista desde arriba en plano inclinado (no top-down puro).
- Rotación lenta automática.
- Usuario puede rotar horizontalmente arrastrando mouse o dedo.

### Flujo de activación 3D (revisado junio 2026)

- Al pulsar "Ver en 3D":
  1. La pokédex transiciona hacia abajo **parcialmente** (~45vh) dejando espacio libre en la parte superior para presentar el modelo 3D sobre el fondo del hábitat. La pokédex **sigue visible** (el botón 3D y la parte superior de la carcasa permanecen en pantalla).
  2. El botón "Ver en 3D" (icono Box + texto "3D") se **sustituye** por una flecha hacia abajo (ChevronDown). Su `aria-label` cambia a "Cerrar 3D".
  3. El overlay del hábitat (Fase 09.0) ocupa el espacio superior liberado, con la imagen del hábitat como fondo.
  4. Transición del pokemon 3D de `opacity: 0 → 1` sobre el hábitat.
  5. Animación del modelo (rotación lenta automática).

### Flujo de desactivación 3D (dos vías)

- **Vía botón**: pulsar la flecha hacia abajo (el botón que sustituyó al de "Ver en 3D") → transición inversa: overlay 3D + hábitat desaparecen, pokédex vuelve a `translateY(0)`, el botón vuelve a mostrar "3D".
- **Vía gesto swipe-up**: deslizar el dedo de abajo hacia arriba sobre el área del overlay 3D/hábitat → misma transición inversa. El umbral mínimo es ~40px de desplazamiento hacia arriba.
- Si se aplica un filtro o se llama a un nuevo pokemon → destruir el elemento 3D tras transición inversa.

## Nota importante sobre el hábitat

El hábitat del modo 3D se implementa como **overlay independiente** (vía `createPortal` a `document.body`) en la Fase 09.0. Se desarrolla **primero** porque el objeto 3D se monta sobre él como capa superior. La imagen del hábitat cubre el área superior (`height: 45vh`) con un degradado inferior que funde con el fondo del body. El overlay incluye:

- Imagen del hábitat con `object-fit: cover` y transición suave de opacidad.
- Degradado sutil hacia el borde inferior (transición con el fondo `#1a1a2e` del body).
- Botón de flecha hacia abajo (cierre) con pulso luminoso, centrado en el borde inferior del overlay.
- Texto indicador "Desliza hacia arriba para cerrar".

El hábitat **no se desmonta al cambiar de pokemon** estando en modo 3D: solo se actualiza la imagen. Al desactivar el modo 3D, el overlay se desmonta completamente y la pokédex recupera su posición original. Al deseleccionar el pokemon (volver a la lista), el modo 3D se desactiva automáticamente.

## Contexto / Dependencias

- **Requiere**: Plan 08 (botón 3D + ficha del pokemon), Plan 01.3 (id del pokemon para la URL).
- **Habilita**: Plan 10 (fondo hábitat 2D ambientador + pulido final).

## Fases

---

### Fase 09.0 — Overlay de hábitat + botón 3D revisado + bridge CSS

**Objetivo:** construir la capa base del modo 3D: el overlay que muestra el hábitat en el espacio superior, el bridge que sincroniza el estado con el DOM, y la revisión del botón 3D para que cambie a flecha al activarse. Esta fase se desarrolla **primero** porque el visor Three.js (fases siguientes) se monta sobre este overlay.

**Tareas:**

#### 09.0a — Bridge CSS (`Mode3DViewBinder`)

- Componente `Mode3DViewBinder` (client) en `src/components/pokedex/3d/`.
- Lee `mode3D` de `usePokedexPage()`.
- En `useEffect`, busca el ancestro `.pokedex-view` y establece el atributo `data-mode-3d="true" | "false"`.
- Al desmontar, elimina el atributo.
- El componente renderiza `null` (solo efecto secundario).

#### 09.0b — CSS `data-mode-3d`

- En `globals.css`, regla `[data-view="pokedex"] .pokedex-view[data-mode-3d="true"]` con `transform: translateY(45vh)`.
- La transición reutiliza la misma curva `cubic-bezier(0.16, 1, 0.3, 1)` y duración (~600ms) que la entrada de la pokédex.
- Respetar `prefers-reduced-motion`: duración 0ms.

#### 09.0c — Overlay del hábitat (`Mode3DHabitatOverlay`)

- Componente `Mode3DHabitatOverlay` (client) en `src/components/pokedex/3d/`.
- Se monta dentro de `PokedexOverlay` (tiene acceso a `usePokedexPage()`).
- Se renderiza mediante `createPortal` a `document.body` para evitar que el stacking context de `.pokedex-view` (que tiene `transform`) interfiera con `position: fixed`.
- **Disparador**: se activa cuando `mode3D=true`. Se desmonta cuando `mode3D=false`.
- Fetch del detalle del pokemon (`fetchPokemonDetail`) para obtener el `habitat`. Si no hay pokemon seleccionado, usa `generico.webp`. Usar patrón "store previous value" para limpiar estado en render, no en efecto.
- Estructura del overlay:
  - `position: fixed; top: 0; left: 0; width: 100vw; height: 45vh; z-index: 25`.
  - `<img>` con el habitat (`object-fit: cover`, `opacity: 0.85`, transición suave `600ms` al cargar).
  - Degradado inferior: `linear-gradient(to bottom, rgba(26,26,46,0.1) 0%, rgba(26,26,46,0.4) 80%, rgba(26,26,46,0.85) 100%)`.
  - Botón circular con `ChevronDown` (pulso luminoso `box-shadow`) en el borde inferior centrado. `aria-label="Cerrar vista 3D"`. Click → `setMode3D(false)`.
  - Texto "Desliza hacia arriba para cerrar" sobre el botón.
  - Gesto swipe-up: `onTouchStart`/`onTouchEnd` — si `deltaY < -40px` → `setMode3D(false)`.
- **Persistencia entre pokemons**: al cambiar de pokemon estando en modo 3D, el overlay se mantiene montado y solo se actualiza la imagen (nueva fetch). No se desmonta ni re-anima.
- Al deseleccionar el pokemon, `mode3D` se pone a `false` automáticamente.

#### 09.0d — Botón 3D revisado (`Button3DSlot`)

- Modificar el slot existente (`src/components/pokedex/slots/Button3DSlot.tsx`, Plan 08.5):
  - **Inactivo** (`mode3D=false`): icono `Box` + texto "3D", `aria-label="Ver en 3D"`, click → `setMode3D(true)`.
  - **Activo** (`mode3D=true`): icono `ChevronDown` (sin texto "3D"), `aria-label="Cerrar 3D"`, click → `setMode3D(false)`.
- Mantener la animación de entrada (`opacity 0→1`, 3s) y el pulso existentes.

**Skills recomendadas:**
- `vercel-react-best-practices` (portal, cleanup, "store previous value").
- `frontend-design` (overlay, degradados, botón circular con pulso).
- `tailwind-css-patterns` (transiciones CSS, keyframes).

**Tests a diseñar (antes):**
- `Mode3DViewBinder`: montar con `mode3D=false` → `data-mode-3d="false"`; desmontar → atributo eliminado.
- `Mode3DHabitatOverlay`: no renderiza nada con `mode3D=false`; renderiza portal con `data-testid` cuando `mode3D=true`.
- Overlay: botón de flecha llama a `setMode3D(false)`; swipe-up de ≥40px llama a `setMode3D(false)`.
- Overlay: imagen del hábitat usa `src` correcto según el `habitat` del pokemon; sin pokemon → `generico.webp`.
- Overlay: `z-index: 25` para estar por encima de la pokédex (`z-20`).
- `Button3DSlot`: muestra `ChevronDown` cuando activo, `Box` + "3D" cuando inactivo.
- `Button3DSlot`: `aria-label` cambia entre "Ver en 3D" y "Cerrar 3D".

**Fixtures (obligatorio):** el `habitat` debe venir del detalle real de PokeAPI capturado en `__tests__/fixtures/pokeapi/<name>.json`. Mínimo cubrir: pikachu (`forest`), magikarp (`waters-edge`), y un pokemon con habitat `null` → `generico.webp`.

**Tests a ejecutar (después):**
- `npm run test:run`
- `npm run lint`

**Criterios de aceptación:**
- El overlay de hábitat se monta/desmonta correctamente con el toggle de modo 3D.
- El botón 3D cambia de icono y comportamiento al activarse/desactivarse.
- El atributo `data-mode-3d` se sincroniza correctamente con el estado.
- La pokédex se desplaza suavemente al activar/desactivar 3D.

**Documentación:** No.

**Revisión humana:** Sí.

---

### Fase 09.1 — Hook de carga asíncrona del modelo

**Objetivo:** cargar el `.glb` en background sin bloquear la UI.

**Tareas:**
- Hook `usePokemonModel(pokemonId)` (client) que:
  - Inicia la carga al montar (o cuando cambia el id).
  - Usa `GLTFLoader` de three.js (dinámicamente importado para no inflar el bundle inicial).
  - Estado: `idle | loading | ready | error`.
  - Cache en cliente (Map) para no recargar el mismo modelo si se vuelve a un pokemon.
  - Error silencioso (no rompe la UI, solo oculta el botón 3D).
- Exponer el `gltf.scene` y el estado.

**Skills recomendadas:**
- `vercel-react-best-practices` (lazy imports, useRef transient values).
- `next-best-practices` (dynamic imports en client components).

**Tests a diseñar (antes):**
- Test: estados progresan `idle → loading → ready` ante una URL válida (mock loader).
- Test: ante error, estado es `error` y no lanza.
- Test: dos llamadas con el mismo id solo cargan una vez (cache).

**Fixtures (obligatorio):** el `pokemonId` que recibe `usePokemonModel(pokemonId)` en estos tests debe venir del `id` REAL capturado de PokeAPI en `__tests__/fixtures/pokeapi/<name>.json` (con `scripts/capture-pokeapi-fixture.ts` ejecutando `POKEMON_DETAIL_QUERY` contra `https://graphql.pokeapi.co/v1beta2`). El test de URL válida debe verificar que la URL construida es exactamente `https://raw.githubusercontent.com/Pokemon-3D-api/assets/refs/heads/main/models/opt/regular/{id}.glb` usando el id real del fixture (p.ej. `25` para pikachu, `133` para eevee, NO números inventados). El test de error debe disparar contra una URL real que **se sabe** que devuelve 404 en el repo de `Pokemon-3D-api/assets` (p.ej. `id: 10000` o el id de un pokemon de una generación sin modelo — verificar antes de capturar) — NO `vi.mocked(loader).mockImplementation(() => Promise.reject(...))`, porque eso no validaría el manejo real del `Response.error()` del fetch. El test de cache (dos llamadas con el mismo id) debe usar el mismo `id` real del fixture para ambas llamadas.

**Tests a ejecutar (después):**
- `npm run test:run`
- `npm run lint`

**Criterios de aceptación:**
- Carga no bloquea UI.
- Cache funciona.

**Documentación:** No.

**Revisión humana:** No.

---

### Fase 09.2 — Escena Three.js (cámara inclinada + rotación)

**Objetivo:** renderizar el modelo con cámara adecuada y rotación automática lenta.

**Tareas:**
- Componente `PokemonViewer3D` (client) que monta la escena.
- Escena:
  - Renderer WebGL (`alpha: true` para transparentar el fondo y mostrar el hábitat detrás).
  - Cámara `PerspectiveCamera` con inclinación (ej: `position.set(0, 2, 4)` mirando al origen, fov ~45°).
  - Luz ambiental suave + luz direccional para volumen.
  - El modelo se añade al scene.
- Auto-rotación: en el loop de animación, `model.rotation.y += 0.005` (lento). Usar `requestAnimationFrame`.
- **Auto-escala**: calcular el bounding box del modelo y normalizar la escala para que ocupe un tamaño fijo en pantalla (ej: alto 2 unidades). Reposicionar al centro.
- Cleanup al desmontar: cancelar RAF, dispose de geometrías/materiales/renderer para evitar memory leaks.

**Skills recomendadas:**
- `vercel-react-best-practices` (cleanup de effects, transient values).
- `frontend-design`.

**Tests a diseñar (antes):**
- Test: el componente monta un canvas (mock three.js o jsdom con WebGL mockeado).
- Test: la auto-rotación actualiza `rotation.y` en cada frame.
- Test: al desmontar, se llama a `dispose`/`cancelAnimationFrame`.

**Tests a ejecutar (después):**
- `npm run test:run`

**Criterios de aceptación:**
- Escena renderiza en el navegador.
- Rotación automática visible.
- Sin leaks (verificar con las DevTools en revisión humana).

**Documentación:** No.

**Revisión humana:** Sí.

---

### Fase 09.3 — Interacción por drag horizontal

**Objetivo:** el usuario puede rotar el modelo horizontalmente arrastrando.

**Tareas:**
- Capturar `pointerdown` / `pointermove` / `pointerup` (unificado mouse+touch).
- Al arrastrar horizontalmente, ajustar `model.rotation.y` proporcional al delta.
- Mientras el usuario arrastra, **detener** la auto-rotación; al soltar, reanudar tras un pequeño delay.
- Cursor: `grab` / `grabbing` para indicar interactividad.
- Touch: prevenir el scroll vertical del body solo en el área del viewer (cuando está activo, el body debe poder scrollear según el borrador — "Aquí SÍ será necesario scroll vertical").

**Skills recomendadas:**
- `vercel-react-best-practices` (eventos pointer unificados).
- `accessibility` (alternativa por teclado con flechas izq/der cuando el viewer tiene foco).

**Tests a diseñar (antes):**
- Test: drag horizontal cambia `rotation.y`.
- Test: durante el drag, la auto-rotación está pausada.
- Test: tecla flecha-izq/der rota cuando el canvas tiene foco.

**Tests a ejecutar (después):**
- `npm run test:run`

**Criterios de aceptación:**
- Drag fluido en mouse y touch.

**Documentación:** No.

**Revisión humana:** Sí.

---

### Fase 09.4 — Auto-escala robusta y ajuste de cámara

**Objetivo:** garantizar que cualquier modelo (pequeño o grande) se vea bien encuadrado.

**Tareas:**
- Tras cargar el gltf:
  1. `Box3.setFromObject(model)` para obtener el bounding box.
  2. Calcular tamaño y centro.
  3. Normalizar escala: `scale = targetSize / maxDim` (targetSize ~ 2).
  4. Reposicionar: el centro del modelo al origen.
- Ajustar cámara según el aspect ratio del contenedor (resize observer).
- En resize, actualizar `camera.aspect` y `updateProjectionMatrix`.

**Skills recomendadas:**
- `vercel-react-best-practices` (ResizeObserver).

**Tests a diseñar (antes):**
- Test: con un modelo mock de tamaño 10, la escala final reduce a target.
- Test: resize del contenedor actualiza el aspect.

**Tests a ejecutar (después):**
- `npm run test:run`

**Criterios de aceptación:**
- Modelos de distinto tamaño se ven bien encuadrados.

**Documentación:** No.

**Revisión humana:** Sí (probar con varios pokemons de tamaños dispares).

---

### Fase 09.5 — Transición 2D ↔ 3D coordinada (integración)

**Objetivo:** integrar el visor 3D (`PokemonViewer3D`) con el overlay de hábitat (Fase 09.0) y el bridge CSS, coordinando las transiciones de entrada/salida del modo 3D.

**Tareas:**
- Montar `PokemonViewer3D` como hijo del `Mode3DHabitatOverlay` (Fase 09.0c), sobre la capa del hábitat.
- El visor se precarga en segundo plano cuando el modelo está listo (`usePokemonModel` → `ready`), pero permanece invisible (`opacity: 0`) hasta que se activa el modo 3D.
- Entrada (pulsar "Ver en 3D"):
  1. `setMode3D(true)` → `Mode3DViewBinder` añade `data-mode-3d="true"`.
  2. CSS anima `translateY(0) → translateY(45vh)` (la transición ya está definida en 09.0b).
  3. El overlay del hábitat (09.0c) ya está montado y visible.
  4. El `PokemonViewer3D` transiciona `opacity 0 → 1` (~400ms).
  5. Auto-rotación arranca.
- Salida (flecha hacia abajo, swipe-up, cambio de pokemon, o filtro):
  1. `setMode3D(false)` → `Mode3DViewBinder` pone `data-mode-3d="false"`.
  2. CSS anima `translateY(45vh) → translateY(0)`.
  3. El overlay del hábitat se desmonta (09.0c).
  4. El `PokemonViewer3D` transiciona `opacity 1 → 0`.
  5. El botón 3D vuelve a estado inactivo (09.0d).
- Al cambiar de pokemon con 3D activo: destruir el viewer actual, precargar el nuevo modelo, y si está listo montar el nuevo viewer con fade-in.
- `prefers-reduced-motion`: duraciones a 0ms.

**Skills recomendadas:**
- `vercel-react-best-practices` (orchestration, transitions).
- `frontend-design`.

**Tests a diseñar (antes):**
- Unit test: activar 3D → el visor aparece con `opacity: 1`.
- Unit test: desactivar 3D → el visor desaparece y el overlay se desmonta.
- Unit test: cambiar pokemon con 3D activo → destruye viewer anterior y monta nuevo.
- Unit test del visor 3D: mockear `three.js` y verificar que se carga el `.glb` desde la URL correcta.
- **NO** e2e dedicado para la vista 3D: WebGL en Playwright es muy frágil.

**Fixtures (obligatorio):** los unit tests deben usar el `id` REAL del pokemon capturado de PokeAPI (`__tests__/fixtures/pokeapi/<name>.json`).

**Tests a ejecutar (después):**
- `npm run test:run`
- `npm run lint`

**Criterios de aceptación:**
- Transiciones fluidas y sin glitches entre el visor 3D y el overlay.
- La pokédex permanece parcialmente visible en modo 3D.
- Limpieza de recursos (three.js) al cambiar de pokemon.

**Documentación:** No.

**Revisión humana:** Sí.

---

## Riesgos

- **Peso de los `.glb`**: los modelos optimizados (`/opt/regular/`) ya están comprimidos. Aun así, usar lazy import de `GLTFLoader` para no penalizar el bundle.
- **WebGL no soportado**: en dispositivos antiguos puede no haber WebGL. Detectar y ocultar el botón 3D con un mensaje opcional.
- **Memory leaks en three.js**: muy importante el `dispose()` de geometrías y materiales al desmontar/cambiar de modelo.
- **Mixed content**: el repo de GitHub raw sirve sobre HTTPS, así que no hay problema de mixed content.
- **Rate limiting de GitHub raw**: cachear en cliente para no recargar el mismo modelo.
