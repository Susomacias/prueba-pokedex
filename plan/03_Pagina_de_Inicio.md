# Plan 03 — Página de Inicio

## Objetivo

Implementar la pantalla de inicio: fondo animado en mosaico, logo, ash + pokedex cerrada + slider de pokemons animados, botón de sonido loop y botón "Press Start". Navegación por teclado/click hacia la pokedex. Loading con pikachu gif si hace falta.

## Contexto / Dependencias

- **Requiere**: Plan 02 (rutas).
- **Habilita**: Plan 04 (transiciones).

## Recursos

- Fondo tile: `public/pagina_inicio/tileFondo.png`.
- Logo: `public/pagina_inicio/logo.svg`.
- Ash: `public/pagina_inicio/ash.svg`.
- Pokedex cerrada: `public/pagina_inicio/pokedex_cerrada.svg`.
- 10 pokemons: `charmander`, `ponita`, `caterpi`, `squirtle`, `pikachu`, `rinomer`, `bulbasur`, `onix`, `abra` (kadabra), `magicarp` (en `public/pagina_inicio/*.svg`).
- Música: `public/pagina_inicio/musica.mp3`.
- Loading: `public/loading-pikachu.gif`.

## Orden de aparición de pokemons (del borrador)

1. Charmander → 2. Ponita → 3. Caterpi → 4. Squirtle → 5. Pikachu → 6. Rinomer → 7. Bulbasur → 8. Onix → 9. Abra (kadabra) → 10. Magicarp.

## Fases

---

### Fase 03.1 — Fondo animado en mosaico diagonal

**Objetivo:** tile `tileFondo.png` repetido como mosaico que se desplaza lentamente hacia arriba a 45°. Los tiles fuera de pantalla se destruyen, los que entran se crean.

**Tareas:**
- Componente `AnimatedBackground` (client) en `src/components/home/AnimatedBackground.tsx`.
- Estrategia: capa CSS con `background-image` + `background-repeat: repeat` y `background-position` animada vía `requestAnimationFrame` o CSS `@keyframes` con `transform: translate()`. Evaluar qué es más eficiente (probablemente CSS).
- Animación lenta y continua: el vector de desplazamiento es 45° hacia arriba-izquierda (salida visual hacia arriba-derecha).
- Cubre toda la pantalla, sin scroll, fixed.
- Respeta `prefers-reduced-motion` (detener animación).

**Skills recomendadas:**
- `frontend-design` (animación canvas/CSS).
- `tailwind-css-patterns` (animaciones, keyframes).
- `accessibility` (prefers-reduced-motion).

**Tests a diseñar (antes):**
- Test: el componente renderiza con la imagen de fondo.
- Test: aplica clase para reducir movimiento cuando `matchMedia('(prefers-reduced-motion: reduce)')` es true.

**Tests a ejecutar (después):**
- `npm run test:run`
- `npm run lint`

**Criterios de aceptación:**
- El fondo se mueve lentamente en diagonal sin saltos.
- Cubre toda la pantalla sin scroll.
- Respeta `prefers-reduced-motion`.

**Documentación:** No.

**Revisión humana:** Sí (criterio estético del movimiento).

---

### Fase 03.2 — Layout base de la pantalla de inicio

**Objetivo:** montar la estructura responsive con tres zonas (superior, media, inferior) sin scroll.

**Tareas:**
- En `src/app/page.tsx` (client) maquetar con grid/flex:
  - **Superior**: logo centrado (`logo.svg`) con `next/image` o inline SVG.
  - **Media**: contenedor relativo con tres hijos absolutos/relativos: ash (izquierda, superpuesto), pokedex cerrada (centro), slider pokemons (derecha, superpuesto).
  - **Inferior**: botón sonido (discreto, izquierda) + botón Press Start (centro, llamativo).
- Responsive:
  - Desktop: ash y slider a los lados de la pokedex, todo visible.
  - Mobile: ash y slider más pequeños/parcialmente cortados para no tapar la pokedex.
- Sin scroll vertical ni horizontal en cualquier breakpoint.

**Skills recomendadas:**
- `tailwind-css-patterns` (responsive design, layout utilities).
- `frontend-design`.

**Tests a diseñar (antes):**
- Test: las tres zonas existen y tienen el orden correcto.
- Test: el contenedor raíz no tiene scroll (mock de window con dimensiones).

**Tests a ejecutar (después):**
- `npm run test:run`
- `npm run lint`

**Criterios de aceptación:**
- Layout sin scroll en 320px, 768px y 1280px.

**Documentación:** No.

**Revisión humana:** Sí.

---

### Fase 03.3 — Slider animado de pokemons + Ash + Pokedex cerrada

**Objetivo:** implementar el ciclo de aparición de los 10 pokemons en el lado derecho, con ash estático a la izquierda y la pokedex cerrada en el centro.

**Tareas:**
- Componente `PokemonSlider` (client) que itera la lista de los 10 pokemons en orden.
- Ciclo por pokemon:
  1. Entra desde la derecha (translateX + opacity, 600ms ease-out).
  2. Permanece 3 segundos.
  3. Sale hacia la derecha (translateX + opacity, 600ms ease-in).
  4. Aparece el siguiente.
  5. Tras el último, reinicia desde el primero.
- Ash: `ash.svg` estático con animación sutil de respiración (scale Y 1 → 1.02 loop).
- Pokedex cerrada: `pokedex_cerrada.svg` estática con leve brillo/sombra.
- Pausar el ciclo si la pestaña pierde foco (`visibilitychange`).
- Respetar `prefers-reduced-motion` (sin animaciones de entrada, solo cambio instantáneo).

**Skills recomendadas:**
- `vercel-react-best-practices` (useRef transient values, requestIdleCallback).
- `tailwind-css-patterns` (animaciones).

**Tests a diseñar (antes):**
- Test: el primer pokemon renderizado es Charmander.
- Test: tras avanzar el ciclo (mock timers), el siguiente pokemon aparece.
- Test: tras el décimo (Magicarp), vuelve a Charmander.
- Test: con `prefers-reduced-motion`, no hay transición CSS activa.

**Tests a ejecutar (después):**
- `npm run test:run`

**Criterios de aceptación:**
- El ciclo cumple el orden y los timings del borrador.
- Animaciones suaves.

**Documentación:** No.

**Revisión humana:** Sí.

---

### Fase 03.4 — Botón de sonido (loop música) y botón Press Start

**Objetivo:** botón discreto de toggle de música (`musica.mp3` en loop) y botón llamativo "PRESS START" animado.

**Tareas:**
- `SoundToggle` (client): icono de altavoz `lucide-react` (`Volume2` / `VolumeX`), al pulsar reproduce/pausa `musica.mp3` en loop. Estado persistido en `localStorage` para recordar preferencia.
- Exponer el estado de "música activa" vía Context para que el Plan 04 pueda hacer fade out al cambiar de página.
- `PressStartButton` (client): botón grande estilo arcade con texto "PRESS START" en `PressStart2P`, efecto hover/press, animación pulsante (scale + glow) para llamar la atención. Accesible (focus visible, `aria-label`).
- Diseño: aspecto de botón físico arcade (sombras, bisel).

**Skills recomendadas:**
- `frontend-design` (botones arcade).
- `accessibility` (botón accesible, focus).
- `tailwind-css-patterns`.

**Tests a diseñar (antes):**
- Test: pulsar `SoundToggle` alterna el icono y reproduce/pausa el audio (mock `HTMLAudioElement`).
- Test: `PressStartButton` tiene `aria-label` y es focusable.
- Test: la preferencia de sonido persiste en localStorage.

**Tests a ejecutar (después):**
- `npm run test:run`

**Criterios de aceptación:**
- La música suena en loop al activar.
- Botón Press Start tiene animación pulsante.

**Documentación:** No.

**Revisión humana:** Sí.

---

### Fase 03.5 — Navegación a la pokedex + Loading pikachu

**Objetivo:** cualquier tecla (letras o Enter) o click en cualquier zona navega a `/pokedex`. Loading con `loading-pikachu.gif` si los assets de la pokedex tardan en cargar.

**Tareas:**
- Listener global (en un `useEffect` del cliente) que capture `keydown` (cualquier letra A–Z, Enter, Espacio) y `click` (en el contenedor principal).
- Al dispararse, navegar a `/pokedex` con `router.push()` (la transición visual la hace el Plan 04).
- Evitar doble navegación (flag `isNavigating`).
- Loading: si la navegación tarda > 200ms (los assets del plan 05/06 aún cargando), mostrar `loading-pikachu.gif` centrado con texto "CARGANDO…" en `PressStart2P`. Definir el criterio de "assets listos" (eventos `onLoad` de los SVG principales).
- Eliminar listeners al desmontar.

**Skills recomendadas:**
- `vercel-react-best-practices` (effects cleanup).
- `accessibility` (no capturar teclas cuando el foco está en un input — aquí no hay, pero dejar hook reutilizable).

**Tests a diseñar (antes):**
- Test: pulsar Enter dispara `router.push('/pokedex')`.
- Test: pulsar cualquier letra A–Z dispara navegación.
- Test: pulsar teclas no imprimibles (Shift, Ctrl) NO navega.
- Test: el flag evita doble navegación.
- E2E: cargar `/`, pulsar Enter, termina en `/pokedex`.

**Tests a ejecutar (después):**
- `npm run test:run`
- `npm run test:e2e`

**Criterios de aceptación:**
- Navegación funciona por teclado y click.
- Loading aparece si la carga tarda.
- Sin navegación duplicada.

**Documentación:**
- `README.md`: sección "Pantalla de inicio — controles".

**Revisión humana:** Sí.

---

## Riesgos

- **Rendimiento del mosaico animado**: usar CSS `transform` en vez de manipular `background-position` para aprovechar GPU.
- **Autoplay de audio bloqueado por el navegador**: el audio solo puede empezar tras interacción del usuario (por eso el botón de sonido es manual). El Press Start no debe asumir música ya activa.
- **Tamaños SVG inconsistentes**: envolver cada asset en un contenedor con tamaño fijo para que el layout sea predecible.
