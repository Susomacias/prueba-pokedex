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
- Al pulsar "Ver en 3D":
  1. La pokédex transiciona hacia abajo (visible el hábitat del fondo). Aquí SÍ hay scroll vertical.
  2. Transición del pokemon 3D de `opacity: 0 → 1`.
  3. Animación del modelo.
- Pulsar de nuevo con el objeto visible → transición inversa.
- Si se aplica un filtro o se llama a un nuevo pokemon → destruir el elemento 3D tras transición inversa.

## Nota importante sobre el hábitat

El hábitat **ya está visible** desde que el pokemon fue seleccionado (Plan 10.2 lo muestra como fondo ambientador detrás de la pokedex, sin bajarla). Al activar la vista 3D, la pokedex baja y el hábitat queda a la vista a pantalla completa detrás del modelo. La transición 3D **no** monta ni anima el hábitat: simplemente oculta la pokedex. Al desactivar 3D la pokedex vuelve a su posición y el hábitat sigue donde estaba (su ciclo de vida depende solo de si hay pokemon seleccionado, no del modo 3D).

## Contexto / Dependencias

- **Requiere**: Plan 08 (botón 3D + ficha del pokemon), Plan 01.3 (id del pokemon para la URL).
- **Habilita**: Plan 10 (fondo hábitat que acompaña la vista 3D).

## Fases

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

### Fase 09.5 — Transición 2D ↔ 3D coordinada

**Objetivo:** animar la entrada/salida de la vista 3D moviendo la pokedex y opacidad del modelo.

**Tareas:**
- Hook `use3DView()` (client) con estado `is3DActive`.
- Entrada (pulsar "Ver en 3D" con vista 2D activa):
  1. La pokedex transiciona hacia abajo (translateY 0 → 100%).
  2. El body permite scroll vertical (cambiar clase/overflow).
  3. El `PokemonViewer3D` transiciona `opacity 0 → 1` (ya estaba montado invisible).
  4. Auto-rotación arranca.
- Salida (pulsar de nuevo, o aplicar filtro, o cambiar pokemon):
  1. Transición inversa.
  2. El body vuelve a no-scroll.
  3. Al terminar, si es cambio de pokemon, **destruir** el viewer y el modelo (`usePokemonModel` se resetea con el nuevo id).
- El botón 3D refleja el estado activo (Plan 08.5).
- `prefers-reduced-motion`: transición instantánea o muy corta.

**Skills recomendadas:**
- `vercel-react-best-practices` (orchestration, transitions).
- `frontend-design`.

**Tests a diseñar (antes):**
- Test: activar 3D mueve la pokedex fuera de pantalla.
- Test: desactivar la restaura.
- Test: cambiar pokemon con 3D activo → desactiva y destruye.
- E2E: cargar ficha de un pokemon con modelo, pulsar 3D, verificar que el canvas es visible.

**Tests a ejecutar (después):**
- `npm run test:run`
- `npm run test:e2e`
- `npm run lint`

**Criterios de aceptación:**
- Transiciones fluidas y sin glitches.
- Limpieza de recursos al cambiar de pokemon.

**Documentación:** No.

**Revisión humana:** Sí.

---

## Riesgos

- **Peso de los `.glb`**: los modelos optimizados (`/opt/regular/`) ya están comprimidos. Aun así, usar lazy import de `GLTFLoader` para no penalizar el bundle.
- **WebGL no soportado**: en dispositivos antiguos puede no haber WebGL. Detectar y ocultar el botón 3D con un mensaje opcional.
- **Memory leaks en three.js**: muy importante el `dispose()` de geometrías y materiales al desmontar/cambiar de modelo.
- **Mixed content**: el repo de GitHub raw sirve sobre HTTPS, así que no hay problema de mixed content.
- **Rate limiting de GitHub raw**: cachear en cliente para no recargar el mismo modelo.
