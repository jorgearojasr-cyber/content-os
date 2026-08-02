# Nivel A / Nivel B — clasificación oficial de arquitectura de IA

Esta es la referencia oficial para clasificar cualquier funcionalidad de
IA dentro de Content OS, presente o futura. Nace de `ARCHITECTURE-MIGRATION`
y quedó formalizada acá (`ARCHITECTURE-DOC-FIX`) después de que
`ARCHITECTURE-NAMING-FIX` confirmara que la confusión con un supuesto
"Nivel C" ocurrió porque esta clasificación nunca había quedado
documentada dentro del repositorio — vivía únicamente en reportes de chat
y en memoria entre sesiones, sin una fuente de verdad que se pudiera
consultar.

## Nivel A — Prompt Oficial

Content OS arma el prompt; el usuario lo ejecuta en la IA de su
preferencia (ChatGPT, Claude, Gemini, Grok o cualquier otra). Cuando la
funcionalidad lo requiere, el resultado vuelve a pegarse en Content OS
(Patrón 2, ida y vuelta — ver `prompt-oficial.md` para el flujo completo y
el manejo de errores).

**Casos actuales:**
- Director Creativo.
- Plan de Edición.
- Generar Personaje.
- Completar Identidad.

## Nivel B — Heurística local

Nunca llama a IA. Nunca usa APIs externas. Nunca depende de un proveedor.
Todo ocurre dentro de Content OS mediante lógica determinística — tablas
planas, funciones puras, o compiladores que ensamblan texto a partir de
campos ya conocidos. El mismo dato de entrada siempre produce el mismo
resultado, sin ninguna llamada de red de por medio.

**Casos actuales:**
- Decision Engine.
- Recomendaciones audiovisuales.
- Prompts de Imagen/Video pre-armados (`PREPARACION-FIX-1B`).
- Compiladores determinísticos (`compilarPersonaje()`, `escena-prompt-compiler.ts`).

## No existe un Nivel C

Si una funcionalidad nueva no encaja claramente en Nivel A o Nivel B, eso
significa que la arquitectura debe discutirse antes de implementarla —
nunca crear un nivel nuevo de manera implícita, ni en código, ni en
comentarios, ni en un mensaje de commit. Cualquier caso ambiguo se
resuelve conversándolo primero, no clasificándolo de manera provisoria.
