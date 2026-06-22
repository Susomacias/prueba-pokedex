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
