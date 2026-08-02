# Prompt Oficial — Patrón 2 (ida y vuelta)

Content OS no genera contenido mediante IA. Content OS prepara el trabajo
para que una IA lo genere. La IA deja de ser una dependencia del sistema y
pasa a ser una herramienta elegida por el usuario — ChatGPT, Claude, Gemini,
Grok o cualquier otra.

Esta es la arquitectura de referencia para toda funcionalidad de **Nivel A**
(ver [`nivel-a-nivel-b.md`](./nivel-a-nivel-b.md) para la clasificación
oficial completa, incluido Nivel B y por qué no existe un Nivel C) que
necesita que el resultado de la IA vuelva a alimentar algo dentro de
Content OS — un formulario, un deep-link, un cálculo. Para funcionalidades
donde el resultado puede quedarse directamente en la conversación del
usuario con su IA, sin volver a Content OS, ver el Patrón 1
(fire-and-forget) — no cubierto en este documento.

Junto con [`nivel-a-nivel-b.md`](./nivel-a-nivel-b.md), este documento
cubre la arquitectura completa de IA de Content OS: uno define **qué es**
cada nivel y **cuándo** aplica cada uno; este define **cómo** se
implementa el Patrón 2 una vez que algo ya se clasificó como Nivel A.

## El flujo estándar

```
Content OS genera el prompt
        ↓
Usuario lo ejecuta en la IA que prefiera
        ↓
La IA devuelve JSON
        ↓
Usuario pega el JSON de vuelta en Content OS
        ↓
Content OS valida con un Zod schema
        ↓
Content OS persiste el resultado
```

## Por qué funciona sin perder el trabajo de diseño ya hecho

Cada funcionalidad de Nivel A ya tiene su forma de salida definida en un Zod
schema — ese schema no se descarta al migrar de una llamada integrada a un
Prompt Oficial: **cambia su rol, no su forma**. Antes forzaba la salida de
la API (`client.messages.parse()` u otro mecanismo específico de un
proveedor); ahora valida lo que el usuario pega, sin importar de qué IA
vino. El Prompt Oficial simplemente documenta ese mismo schema en texto
plano dentro del prompt ("devolveme un JSON con esta forma exacta"), así
que el trabajo de diseño de cada schema se conserva íntegro.

## Manejo de errores

Cualquier IA externa puede devolver JSON incompleto o mal formado — el
validador debe explicar el error en español entendible, no solo rechazar
silenciosamente. Mismo principio ya usado en `blueprint-parser.ts` (arrays
de `errores`/`advertencias` en vez de una excepción genérica): al pegar un
resultado inválido, el usuario debe entender qué faltó, no solo que algo
falló.

## Cuándo NO aplica el patrón round-trip

Si la funcionalidad es puramente informativa para el usuario y no necesita
que Content OS vuelva a leer el resultado (por ejemplo, un plan de edición
que el usuario solo necesita leer mientras edita en su editor de video),
el Patrón 1 (mostrar el prompt, dejar que el resultado viva en la
conversación externa) puede ser preferible — evita pedirle al usuario un
paso extra de copiar y pegar que no aporta nada. La elección entre Patrón
1 y Patrón 2 es una decisión de producto por funcionalidad, no una regla
fija.

## Referencia ya construida

El flujo Hoy → Generar Prompt → Copiar a ChatGPT → Pegar el Creative
Blueprint (`construirPrompt()` en `blueprint-prompt.ts`, parseado por
`blueprint-parser.ts`) es la primera implementación de este patrón en
Content OS, ya validada en producción. Usa un parser de texto plano
propio en vez de JSON+Zod porque el resultado es un guion completo
pensado para leerse como documento, no una estructura corta — pero el
principio (Content OS construye el prompt, el usuario lo ejecuta afuera,
Content OS interpreta lo que vuelve) es el mismo que sigue este patrón.

## Funcionalidades que siguen este patrón

- **Director Creativo IA** — ver `docs/phase-2/director-creativo-ia.md`.
- Futuras funcionalidades de Nivel A que necesiten estructura de vuelta
  (recomendación de plano justificada, evaluación de reel, etc.) deben
  documentarse siguiendo esta misma referencia.
