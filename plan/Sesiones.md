# Sesiones de Desarrollo — Pokédex

Prompts listos para copiar y pegar como mensaje inicial de cada sesión. Cada prompt referencia el plan y las fases a ejecutar; la IA leerá el archivo del plan para obtener los detalles técnicos.

## Cómo usar

1. Copia el **prompt** de la sesión (el texto dentro del bloque de código).
2. Pégalo como primer mensaje de la sesión.
3. Al terminar, valida que `npm run lint`, `npx tsc --noEmit` y `npm run test:run` estén en verde.
4. Si la sesión termina en una fase con **Revisión humana: Sí**, valida tú el resultado antes de arrancar la siguiente sesión.

Las dependencias entre planes están documentadas en `plan/README.md`. Respeta el orden.

---

## Plan 00 — Configuración y Fundaciones

### Sesión 01 — Setup completo

```
Lee plan/00_Configuracion_y_Fundaciones.md y ejecuta las fases 00.1, 00.2, 00.3 y 00.4, siguiendo para cada una sus tareas, skills recomendadas, tests (TDD: diseñar antes, ejecutar después), criterios de aceptación y notas de documentación.
```

---

## Plan 01 — Capa de Datos PokeAPI

### Sesión 02 — Queries nucleares

```
Lee plan/01_Capa_de_Datos_PokeAPI.md y ejecuta las fases 01.1, 01.2 y 01.3, siguiendo para cada una sus tareas, skills recomendadas, tests (TDD), criterios de aceptación y notas de documentación.
```

### Sesión 03 — Filtros, búsqueda y caché

```
Lee plan/01_Capa_de_Datos_PokeAPI.md y ejecuta las fases 01.4, 01.5 y 01.6, siguiendo para cada una sus tareas, skills recomendadas, tests (TDD), criterios de aceptación y notas de documentación.
```

---

## Plan 02 — Routing y Estado Compartido

### Sesión 04 — Rutas y hook de filtros

```
Lee plan/02_Routing_y_Estado_Compartido.md y ejecuta las fases 02.1 y 02.2, siguiendo para cada una sus tareas, skills recomendadas, tests (TDD), criterios de aceptación y notas de documentación.
```

### Sesión 05 — Provider y página 404

```
Lee plan/02_Routing_y_Estado_Compartido.md y ejecuta las fases 02.3 y 02.4, siguiendo para cada una sus tareas, skills recomendadas, tests (TDD), criterios de aceptación y notas de documentación.
```

---

## Plan 03 — Página de Inicio

### Sesión 06 — Fondo y layout

```
Lee plan/03_Pagina_de_Inicio.md y ejecuta las fases 03.1 y 03.2, siguiendo para cada una sus tareas, skills recomendadas, tests (TDD), criterios de aceptación y notas de documentación.
```

### Sesión 07 — Slider de pokemons y botones

```
Lee plan/03_Pagina_de_Inicio.md y ejecuta las fases 03.3 y 03.4, siguiendo para cada una sus tareas, skills recomendadas, tests (TDD), criterios de aceptación y notas de documentación.
```

### Sesión 08 — Navegación y loading

```
Lee plan/03_Pagina_de_Inicio.md y ejecuta la fase 03.5, siguiendo sus tareas, skills recomendadas, tests (TDD), criterios de aceptación y notas de documentación.
```

---

## Plan 05 — Carcasa Pokédex (SVG)

### Sesión 09 — Carcasas vertical y horizontal

```
Lee plan/05_Carcasa_Pokedex.md y ejecuta las fases 05.1 y 05.2, siguiendo para cada una sus tareas, skills recomendadas, tests (TDD), criterios de aceptación y notas de documentación.
```

### Sesión 10 — Slots y switch responsive

```
Lee plan/05_Carcasa_Pokedex.md y ejecuta las fases 05.3 y 05.4, siguiendo para cada una sus tareas, skills recomendadas, tests (TDD), criterios de aceptación y notas de documentación.
```

---

## Plan 04 — Transiciones Inicio ↔ Pokédex

### Sesión 11 — Transiciones completas

```
Lee plan/04_Transiciones_Inicio_Pokedex.md y ejecuta las fases 04.1, 04.2 y 04.3, siguiendo para cada una sus tareas, skills recomendadas, tests (TDD), criterios de aceptación y notas de documentación.
```

---

## Plan 06 — Lista y Carrusel

### Sesión 12 — Lista con scroll infinito acumulativo y card

```
Lee plan/06_Lista_y_Carrusel.md y ejecuta las fases 06.1 y 06.2, siguiendo para cada una sus tareas, skills recomendadas, tests (TDD), criterios de aceptación y notas de documentación.
```

### Sesión 13 — Carrusel completo

```
Lee plan/06_Lista_y_Carrusel.md y ejecuta las fases 06.3, 06.4, 06.5 y 06.6, siguiendo para cada una sus tareas, skills recomendadas, tests (TDD), criterios de aceptación y notas de documentación.
```

### Sesión 14 — Loading pikachu

```
Lee plan/06_Lista_y_Carrusel.md y ejecuta la fase 06.7, siguiendo sus tareas, skills recomendadas, tests (TDD), criterios de aceptación y notas de documentación.
```

---

## Plan 07 — Sistema de Filtros

### Sesión 15 — Consola de terminal

```
Lee plan/07_Sistema_de_Filtros.md y ejecuta la fase 07.1, siguiendo sus tareas, skills recomendadas, tests (TDD), criterios de aceptación y notas de documentación.
```

### Sesión 16 — Dropdowns, buscador e integración

```
Lee plan/07_Sistema_de_Filtros.md y ejecuta las fases 07.2, 07.3, 07.4 y 07.5, siguiendo para cada una sus tareas, skills recomendadas, tests (TDD), criterios de aceptación y notas de documentación.
```

---

## Plan 08 — Detalle de Pokemon

### Sesión 17 — Chips y evoluciones

```
Lee plan/08_Detalle_Pokemon.md y ejecuta las fases 08.1 y 08.2, siguiendo para cada una sus tareas, skills recomendadas, tests (TDD), criterios de aceptación y notas de documentación.
```

### Sesión 18 — Stats, toggle y botón 3D

```
Lee plan/08_Detalle_Pokemon.md y ejecuta las fases 08.3, 08.4 y 08.5, siguiendo para cada una sus tareas, skills recomendadas, tests (TDD), criterios de aceptación y notas de documentación.
```

---

## Plan 09 — Vista 3D

### Sesión 19 — Carga, escena e interacción

```
Lee plan/09_Vista_3D.md y ejecuta las fases 09.1, 09.2 y 09.3, siguiendo para cada una sus tareas, skills recomendadas, tests (TDD), criterios de aceptación y notas de documentación.
```

### Sesión 20 — Auto-escala y transición 2D ↔ 3D

```
Lee plan/09_Vista_3D.md y ejecuta las fases 09.4 y 09.5, siguiendo para cada una sus tareas, skills recomendadas, tests (TDD), criterios de aceptación y notas de documentación.
```

---

## Plan 10 — Fondo Hábitat y Pulido Final

### Sesión 21 — Fondos y hábitat

```
Lee plan/10_Fondo_Habitat_y_Pulido.md y ejecuta las fases 10.1, 10.2 y 10.3, siguiendo para cada una sus tareas, skills recomendadas, tests (TDD), criterios de aceptación y notas de documentación.
```

### Sesión 22 — Accesibilidad, rendimiento y E2E final

```
Lee plan/10_Fondo_Habitat_y_Pulido.md y ejecuta las fases 10.4, 10.5 y 10.6, siguiendo para cada una sus tareas, skills recomendadas, tests (TDD), criterios de aceptación y notas de documentación.
```
