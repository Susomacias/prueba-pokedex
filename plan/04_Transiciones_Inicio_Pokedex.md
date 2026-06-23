# Plan 04 — Transiciones Inicio ↔ Pokédex

## Objetivo

Implementar las transiciones animadas entre la página de inicio y la pokedex (en ambos sentidos), coordinando logo, ash, slider, botones, música y carcasa.

## Contexto / Dependencias

- **Requiere**: Plan 03 (página inicio completa), Plan 05 (carcasa pokedex montada).
- **Habilita**: experiencia fluida entre las dos pantallas principales.

## Flujo Inicio → Pokedex (del borrador)

1. Crear una pokedex (horizontal o vertical según tamaño de pantalla) **fuera de pantalla** en la parte inferior.
2. Si la música está sonando, bajar el volumen lentamente (fade out, no parar).
3. **Logo**: transiciona a la parte superior derecha, más pequeño. Al pulsarlo vuelve al inicio.
4. **Ash**: va hacia la izquierda hasta desaparecer y se destruye.
5. **Slider pokemons**: va hacia la derecha hasta desaparecer y se destruye.
6. **Botones + pokedex cerrada**: van hacia abajo hasta desaparecer y se destruyen.
7. La pokedex sube al centro de la pantalla para comenzar su manejo.

## Flujo Pokedex → Inicio

Igual pero al revés. Hay que **cargar** los elementos del inicio y asegurarse de que estén cargados **antes** de empezar la animación.

## Fases

---

### Fase 04.1 — Sistema de orquestación de transición

**Objetivo:** crear un coordinador que ejecute la secuencia de animaciones atómicamente y gestione la carga previa.

**Tareas:**
- Hook `useTransitionToPokedex()` y `useTransitionToHome()` (client).
- Cada uno:
  1. Verifica que los assets destino están cargados (preload si hace falta; para el inicio→pokedex la carcasa SVG; para pokedex→inicio los SVG de ash/logo/etc).
  2. Bloquea la navegación real (la URL cambia al final).
  3. Ejecuta la secuencia de animaciones (`framer-motion` o animaciones CSS coordinadas vía promesas).
  4. Al terminar, completa la navegación y destruye los elementos.
- Decidir librería de animación: `framer-motion` es la opción recomendada (orchestration con `AnimatePresence` y variants secuenciales). Evaluar también `motion` (sucesor) o GSAP. **Instalar lo que se elija** en el plan 00 o aquí.
- Usar `useViewTransition` de React 19 / Next 16 si aplica para coordinar con el navegador (ver docs `01-app/02-guides/`).

**Skills recomendadas:**
- `vercel-react-best-practices` (useTransition, deferred value).
- `frontend-design` (coreografía de animaciones).
- `next-best-practices` (view transitions API en Next 16).

**Tests a diseñar (antes):**
- Test: `useTransitionToPokedex` ejecuta los pasos en orden (mock timers).
- Test: si un asset no está cargado, la transición espera.
- Test: no se puede disparar dos veces en paralelo.

**Tests a ejecutar (después):**
- `npm run test:run`
- `npm run lint`

**Criterios de aceptación:**
- La transición es secuencial y reproducible.
- Sin glitches visuales.

**Documentación:** No.

**Revisión humana:** Sí.

---

### Fase 04.2 — Transición Inicio → Pokedex

**Objetivo:** implementar visualmente la salida de los elementos del inicio y la entrada de la carcasa.

**Tareas:**
- Sustituir la navegación directa del Plan 03.5 por `useTransitionToPokedex()`.
- Animaciones (todas concurrentes o secuenciales según se vea mejor):
  - Pokedex carcasa: translate(0, 100%) → translate(0, 0) en el centro, fade in.
  - Logo: del centro-sup al sup-derecha, scale 1 → 0.5, 800ms ease-in-out.
  - Ash: translateX → -100vw, opacity → 0, 600ms.
  - Slider: translateX → 100vw, opacity → 0, 600ms.
  - Botones + pokedex cerrada: translateY → 100vh, opacity → 0, 600ms.
- Música: fade out volumen lineal durante toda la transición (~1.2s). No parar el audio del todo (sigue en contexto para posible reentrada), o pausarlo al final.
- Al terminar: la app es **SPA** (no se llama a `router.push`): la URL se queda en `/` y `useAppShell().goToPokedex()` cambia `view` vía `data-view`. Si la URL externa era `/pokedex`, `PokedexPageTransition` fija `view="home"` en el primer paint y dispara la transición de entrada tras el mount.
- Comprobar tamaño de pantalla para elegir carcasa horizontal o vertical.

**Skills recomendadas:**
- `frontend-design`.
- `tailwind-css-patterns` (keyframes).
- `accessibility` (respetar `prefers-reduced-motion`: si está activo, hacer la transición instantánea o muy corta).

**Tests a diseñar (antes):**
- Unit test: el `PokedexPageTransition` fija `view="home"` en el primer paint cuando la URL es `/pokedex` o `/pokemon/[name]`.
- Unit test: el hook de música recibe orden de fade out.
- Unit test: `useAppShell().goToPokedex()` cambia `view` a `"pokedex"` sin tocar la URL.
- **NO** e2e con asserts sobre transform/opacity concretos (frágiles, `element is not stable`). La cobertura e2e de esta fase se reduce al smoke mínimo en `e2e/transition.spec.ts` (3 tests: home inicial, PRESS START → pokedex, volver al inicio).

**Tests a ejecutar (después):**
- `npm run test:run`
- `npm run test:e2e` (solo el smoke consolidado en `e2e/transition.spec.ts`)

**Criterios de aceptación:**
- La secuencia visual cumple el borrador.
- Música hace fade out.
- Carcasa entra desde abajo.

**Documentación:** No.

**Revisión humana:** Sí (validar fluidez y timing).

---

### Fase 04.3 — Transición Pokedex → Inicio

**Objetivo:** transición inversa, con carga previa de los assets del inicio.

**Tareas:**
- `useTransitionToHome()` montado en el logo de la pokedex (al pulsar).
- Precargar: `ash.svg`, `logo.svg`, `pokedex_cerrada.svg`, los 10 pokemons, `tileFondo.png`. Esperar a todos.
- Secuencia (inversa del 04.2):
  - Pokedex baja (translate(0,0) → translate(0,100%)).
  - Aparecen logo en sup-derecha, ash en izquierda, slider en derecha, botones+pokedex cerrada abajo.
  - Si la música estaba activa antes de salir del inicio, restaurar volumen (fade in).
- Al terminar: `useAppShell().goToHome()` cambia `view` a `"home"`. La URL se queda en `/` (SPA).

**Skills recomendadas:**
- `vercel-react-best-practices` (preload de imágenes).
- `frontend-design`.

**Tests a diseñar (antes):**
- Unit test: el hook espera a que todos los assets estén cargados antes de animar.
- Unit test: `useAppShell().goToHome()` cambia `view` a `"home"`.
- **NO** e2e propio de esta fase. El smoke consolidado en `e2e/transition.spec.ts` cubre el flujo "volver al inicio".

**Tests a ejecutar (después):**
- `npm run test:run`
- `npm run test:e2e` (solo el smoke consolidado en `e2e/transition.spec.ts`)

**Criterios de aceptación:**
- La transición no empieza hasta tener todo cargado.
- Es el espejo de 04.2.

**Documentación:** No.

**Revisión humana:** Sí.

---

## Riesgos

- **Coordinación de timing**: si las animaciones se desincronizan, la transición se ve rota. Usar una sola librería (framer-motion) para orquestar.
- **Carga diferida**: si la conexión es lenta, el tiempo de espera puede ser largo. Mostrar loading discreto si > 1s.
- **View Transitions API**:.Next 16 puede tener soporte nativo; evaluar para simplificar.
