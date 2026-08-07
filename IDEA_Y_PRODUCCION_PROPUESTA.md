# Idea y Producción — dos objetos distintos (documento de producto, sin implementar)

> Nueva decisión de producto: se detiene la implementación de la
> Alternativa A tal como estaba planteada (eliminar el formulario manual)
> y se reemplaza por una distinción explícita de dos objetos: **Idea** y
> **Producción**. Este documento analiza el impacto — no se tocó ningún
> archivo de `src/`, no se hizo commit.

## Los dos objetos, definidos contra lo que ya existe

Antes de proponer nada nuevo, un chequeo contra el código real: **el
objeto "Idea" que describís ya existe hoy, con ese comportamiento
exacto** — es la tabla `notas` (nav "Ideas", pantalla Segundo Cerebro,
`/segundo-cerebro`).

| Regla pedida para Idea | ¿Ya es así hoy? |
|---|---|
| Es una nota rápida | Sí — `notas.texto`, sin título obligatorio, captura sin fricción |
| No contiene escenas | Sí — la tabla `notas` no tiene ninguna columna de escenas |
| No contiene producción | Sí — no tiene ninguna FK hacia `producciones` |
| No genera una Producción automáticamente | Sí — no existe ningún mecanismo automático; ver el puente "Convertir en contenido" abajo |

**No hace falta ningún cambio de modelo de datos para "Idea"** — la regla
que pediste ya es exactamente el comportamiento actual de `notas`. El
trabajo real de este cambio no está en Idea, está en terminar de definir
Producción.

**Producción** (tabla `producciones`) ya es, y seguiría siendo, la
entidad completa: título, formato, idea central, escenas, estado de
grabación/edición/publicación. La regla nueva no cambia su forma — cambia
**de dónde puede nacer**.

---

## El puente "Convertir en contenido" — ya cumple la regla, con un matiz

Cada nota (Idea) con Marca asignada muestra un link "✨ Convertir en
contenido" (`segundo-cerebro-lista.tsx`) que lleva a Hoy
(`/?idea=<texto>&marca=<id>`) con el campo de idea pre-completado. Es
**solo un prellenado de texto vía URL** — no hay ninguna escritura a la
base de datos, no se marca la nota como "convertida", no se crea ninguna
Producción en el acto. En ese sentido, **ya cumple exactamente la regla
"no genera una Producción automáticamente"**: solo lleva al creador hasta
la puerta de Hoy, con la idea ya escrita, y ahí el creador decide qué
hacer.

El matiz: hoy esa puerta, en Hoy, ofrece llevar esa idea a **"Contexto
para ChatGPT" → pegar el resultado** (Markdown) — un mecanismo de
creación de Producción que no es un archivo `.cpp.json`. Eso nos lleva a
la tensión central de este documento.

---

## Tensión abierta: ¿qué pasa con el camino de "pegar resultado" (Blueprint)?

La regla dice: *"Una Producción siempre nace desde un CreatorOS
Production Package importado. Nunca desde un formulario manual."*

Hoy existen, en los hechos, **tres** mecanismos de creación de
Producción, no dos:

1. **Formulario manual** en `/producciones` (Título + Marca) — la
   Alternativa A ya lo descartó, y esta decisión lo reafirma. Sin
   ambigüedad acá.
2. **Pegar resultado de ChatGPT** (Markdown/CBD) en Hoy — el creador
   escribe/dicta una idea, Content OS arma un prompt ("Contexto para
   ChatGPT"), el creador lo corre en ChatGPT y pega la respuesta
   completa de vuelta. `confirmarImportacionBlueprint` crea la Producción
   directamente desde ese texto pegado.
3. **Importar un archivo `.cpp.json`** en Hoy — el CreatorOS Production
   Package. `confirmarImportacionCPP` crea la Producción desde ese JSON.

La nueva regla nombra explícitamente el camino 3 ("CreatorOS Production
Package importado") pero **no menciona el camino 2** ni dice si sigue
vigente. No lo asumo en ninguna dirección — quedan tres lecturas
igualmente válidas del texto, con consecuencias muy distintas:

- **Lectura restrictiva**: "Producción nace de un CPP" significa
  literalmente eso — el camino 2 (pegar Markdown) queda tan descartado
  como el formulario manual. Content OS pasaría a tener **una sola**
  puerta de creación real: subir un archivo `.cpp.json`.
- **Lectura amplia**: "ChatGPT" y "CPP" son la misma fuente en espíritu
  (contenido escrito fuera de Content OS) — el camino 2 se mantiene como
  variante de texto plano del mismo origen, y CPP es simplemente el
  formato estructurado preferido.
- **Lectura de transición**: el camino 2 se mantiene por ahora (es el
  mecanismo más viejo y ya probado) pero queda marcado como candidato a
  retirarse una vez que el camino CPP esté validado en uso real.

El impacto en pantallas/componentes cambia bastante según cuál de las
tres sea la intención real — lo desarrollo abajo para la más restrictiva
(la más alineada a la letra de la regla), señalando en cada punto qué
dejaría de aplicar si en cambio se elige la lectura amplia o de
transición.

---

## Impacto si se aplica la lectura restrictiva (Producción = solo CPP)

### Pantallas

- Sin cambios respecto del análisis ya entregado para la Alternativa A:
  ninguna pantalla completa desaparece — `/producciones` se mantiene como
  listado, y Hoy se mantiene como puerta de entrada.
- Dentro de Hoy, el flujo de 3 pasos "campo → Contexto para ChatGPT →
  pegar resultado" (`modo === "contexto-chatgpt"` y
  `modo === "pegar-resultado"` en `hoy-screen.tsx`) dejaría de tener
  destino — hoy son dos de los cuatro "modos" de esa misma pantalla.

### Componentes

- `ContextoParaChatGPT` (`src/components/contexto-para-chatgpt.tsx`) y
  `RevisionBlueprint` (`src/components/revision-blueprint.tsx`) quedarían
  sin ningún llamador con esta lectura.
- El campo de idea de Hoy pasaría a tener un solo destino posible:
  detectar estructura de CBD para seguir sosteniendo Blueprint quedaría
  sin sentido si ese camino se retira — la función
  `tieneEstructuraDeBlueprint` (`blueprint-parser.ts`) quedaría sin uso.
- El botón "Importar Producción" (CPP) pasaría a ser la única acción de
  creación real dentro de Hoy — probablemente absorbería el lugar
  central que hoy tiene el campo de idea.

### El puente "Convertir en contenido" necesitaría un destino nuevo

Con esta lectura, prellenar el campo de idea en Hoy ya no lleva a ningún
lado — el campo de idea existiría solo para pensar/escribir, no para
producir. El link "Convertir en contenido" necesitaría redirigir a otra
cosa, o el concepto de "convertir una Idea en Producción" dejaría de
tener un camino directo dentro de la app (el creador tomaría esa idea,
la llevaría a ChatGPT por su cuenta, generaría el CPP, y volvería a subir
el archivo — sin que Content OS lo acompañe en el medio).

### Rutas y menú

- Ninguna ruta ni entrada de menú desaparece — mismo hallazgo que en el
  análisis de la Alternativa A: estos cambios son de comportamiento
  dentro de pantallas existentes, no de arquitectura de navegación.

---

## Lo que NO cambia bajo ninguna lectura

- El modelo de datos de `notas` (Idea) no necesita ningún cambio.
- El puente "Convertir en contenido" ya cumple "no genera automáticamente"
  tal como está — lo único en juego es a dónde apunta después.
- `/producciones` se mantiene como listado puro, sin acción de creación,
  en las tres lecturas.
- El formulario manual (`ProduccionForm`, botón "+ Nueva producción") se
  retira en las tres lecturas por igual — eso ya estaba decidido y esta
  ronda no lo cambia.

---

## Cierre

Este documento no elige entre las tres lecturas de "Producción nace de un
CPP" — es la decisión pendiente más importante antes de poder tocar
código, porque determina si el camino de "pegar resultado de ChatGPT"
(hoy la forma más usada y probada de crear una Producción) se retira,
se mantiene, o se marca como transición. Todo lo demás de este documento
es válido sin importar cuál elijas.

*No se modificó código. No se hizo commit.*
