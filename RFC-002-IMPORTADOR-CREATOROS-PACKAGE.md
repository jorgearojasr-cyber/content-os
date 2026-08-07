# RFC-002 — Importador de CreatorOS Production Package

> CONTENT OS V2 — SPRINT 3. Documento de solo diseño — **no se modificó
> código, no se crearon tablas, no se implementó el importador.** Define el
> comportamiento que deberá tener el importador de Content OS cuando se
> autorice construirlo. A diferencia de la especificación del paquete
> (`CREATOROS_PACKAGE_V1_SPEC.md`, que es agnóstica de cliente), esta RFC
> **sí es específica de Content OS** — describe cómo *este* cliente en
> particular debe comportarse al recibir un CreatorOS Production Package.

**Depende de**: `CREATOROS_PACKAGE_V1_SPEC.md` (contrato del paquete,
corregido en este mismo Sprint 3). Cualquier cambio futuro al contrato debe
revisar si esta RFC sigue siendo válida.

---

## 1. Flujo completo de importación

```
1. Usuario pega el JSON (o sube el archivo) del paquete en el importador.
2. Parseo técnico: JSON.parse().
3. Validación de versión y packageId (reglas 1-2 del contrato).
4. Validación de forma contra el contrato (Zod) — reglas 3-9 del contrato.
5. Detección de reimportación por packageId (sección 8 de esta RFC).
6. Resolución de nombres libres (Personajes/Locaciones/Recursos) contra
   la biblioteca del proyecto — reutilizando el motor de similitud
   (src/lib/similitud.ts) ya usado por el importador de Blueprint/CBD.
7. Vista previa: Producción + Escenas + Recursos + Miniatura + Publicación
   parseados, con el estado de cada nombre libre (resuelto/pendiente/nuevo)
   y qué campos opcionales quedaron sin completar.
8. Confirmación explícita del usuario (sección 7).
9. Persistencia — crear o reemplazar según el caso (secciones 8 y 9).
10. Redirección a la Producción resultante.
```

Este flujo replica deliberadamente el ya construido y probado para el
importador de Blueprint/CBD (`analizarBlueprint` → Revisión → `confirmarImportacionBlueprint`,
ver `ARCHITECTURE_REPORT.md`) — mismo patrón de "parsear → validar →
resolver → mostrar → confirmar → persistir", que ya demostró funcionar en
producción. El importador de CreatorOS Package no es un patrón nuevo, es
una segunda instancia del mismo patrón sobre un formato distinto (JSON en
vez de Markdown CBD).

---

## 2. Validaciones

El importador aplica, en este orden, las 9 reglas ya definidas en la
especificación del paquete (sección 5 de `CREATOROS_PACKAGE_V1_SPEC.md`) —
esta RFC no las repite, solo fija el **orden de ejecución** y qué pasa en
cada punto de corte:

1. Versión + `packageId` presentes → si falla, corte inmediato (sección 4).
2. JSON bien formado → si falla, corte inmediato (sección 4).
3. Campos obligatorios → si falta alguno, corte inmediato, listando **todos**
   los campos faltantes juntos (no uno a la vez — mismo criterio que ya usa
   el parser de Blueprint hoy, reportar todos los errores bloqueantes en un
   solo mensaje).
4. `escenas` no vacío y `numero` sin duplicados → corte inmediato si falla.
5. En adelante (enums, referencias cruzadas, campos opcionales faltantes):
   **nunca cortan la importación** — se registran como advertencias
   visibles en la vista previa (sección 7), nunca como error bloqueante.

Validación **adicional**, propia de este cliente (no del contrato general):

- El Proyecto de destino debe existir y el usuario debe tener acceso a él
  (mismo gate de autenticación por contraseña compartida que ya protege
  todo el sitio — no se agrega ningún concepto nuevo de permisos).

---

## 3. Manejo de errores

- **Error de versión no soportada** → mensaje específico: versión recibida
  vs. versiones soportadas por esta instalación de Content OS (sección 4).
- **Error de JSON malformado** → mensaje genérico ("el texto pegado no es
  JSON válido"), sin intentar reparar ni adivinar — el usuario corrige y
  vuelve a pegar.
- **Error de campo obligatorio faltante** → mensaje específico por campo,
  todos juntos en un único reporte (no iterativo).
- **En ningún caso se pierde el texto pegado por el usuario.** Si la
  validación falla, el contenido queda en el campo de entrada para
  corregir y reintentar — mismo comportamiento que el importador de
  Blueprint/CBD ya tiene hoy.
- **Ningún error de validación deja una escritura parcial en la base de
  datos.** La persistencia (paso 9 del flujo) ocurre solo después de que
  **todas** las validaciones bloqueantes ya pasaron y el usuario confirmó
  — nunca se escribe nada mientras se está validando.

---

## 4. Compatibilidad entre versiones

- El importador declara qué **MAJOR** soporta (hoy: únicamente `1`).
- Si `creatorOSPackage` trae un MAJOR distinto al soportado (mayor o
  menor) → se rechaza con un mensaje explícito: *"Este Content OS
  entiende paquetes CreatorOS v1.x. Recibiste un paquete v{X}.{Y} —
  actualizá la aplicación o pedí un paquete compatible."*
- El **MINOR** nunca se usa para aceptar o rechazar — solo informa qué
  campos opcionales adicionales podría traer el paquete (ver sección 6).
- Esta regla es la aplicación directa, en este cliente, de la regla de
  versionado ya definida en el contrato (sección 3 de
  `CREATOROS_PACKAGE_V1_SPEC.md`) — no se reinterpreta acá.

---

## 5. Estrategia para paquetes incompletos

"Incompleto" ≠ "inválido":

- **Inválido** = falta un campo **obligatorio** del contrato → se rechaza,
  no se puede continuar (sección 2 de esta RFC).
- **Incompleto** = faltan campos **opcionales** (ej. sin `miniatura`, sin
  `publicacion`, una escena sin `textoHablado`, un recurso sin `valor`) →
  **se importa igual**. Esos campos quedan vacíos/`null` en el cliente.

La vista previa (sección 7) debe señalar visualmente qué quedó
incompleto — mismo principio ya vigente en Content OS ("todo campo tiene un
dueño": el dueño de completar esos campos después es el usuario, dentro de
la app, no el importador). El importador nunca inventa contenido para
rellenar un campo opcional faltante.

---

## 6. Estrategia para paquetes futuros

- **MAJOR futuro** (ej. paquete v2 contra un importador que solo entiende
  v1) → se rechaza (sección 4). No hay intento de interpretación parcial.
- **MINOR futuro** (ej. paquete v1.5 contra un importador que solo conoce
  hasta v1.2) → **se acepta igual**. Los campos que el importador no
  reconoce se ignoran al parsear (nunca truncan ni bloquean la
  importación), pero:
  - El **JSON crudo completo** del paquete se guarda tal cual llegó, junto
    a la Producción resultante — mismo patrón que Content OS ya usa hoy
    para `cbdOriginal` en el importador de Blueprint. Así ningún campo
    desconocido se pierde de verdad, aunque esta versión del importador
    todavía no sepa interpretarlo.
  - No se le informa al usuario de esto de forma intrusiva (no es un
    error) — es un detalle de robustez hacia adelante, no una decisión que
    el usuario deba tomar en cada importación.

---

## 7. Confirmación visual antes de guardar

Reutiliza el patrón ya construido en Revisión (`revision-blueprint.tsx`),
adaptado al nuevo contenido:

- Vista previa de la Producción completa: título, formato, idea central,
  lista de Escenas en orden, lista de Recursos, Miniatura (si vino) y
  Publicación (si vino).
- Cada nombre libre (Personaje/Locación/Recurso mencionado por nombre) se
  muestra con su estado: **resuelto** (coincide con algo existente),
  **pendiente** (no coincide con nada, el usuario decide después) o
  **nuevo** (se creará como entidad nueva si el usuario lo confirma) —
  mismo criterio ya usado hoy para el importador de Blueprint.
- Los campos opcionales faltantes (sección 5) se marcan visualmente, sin
  bloquear.
- **Un único botón de confirmación explícita al final.** Nada se persiste
  antes de ese clic — ni siquiera un borrador automático.
- Si el usuario cancela o navega afuera antes de confirmar, no queda
  ningún rastro en la base de datos.

---

## 8. Qué ocurre cuando una Producción ya existe

El paquete **nunca expone ids internos** (regla dura del contrato) —
`packageId` es la única señal disponible para detectar reimportación, no
un id de Producción.

- **Si el `packageId` recibido ya fue importado antes** (mismo paquete
  exacto, pegado de nuevo): el importador lo detecta y **no crea una
  segunda Producción en silencio**. Le muestra al usuario: *"Este paquete
  ya se importó el {fecha} en la Producción '{título}'. ¿Querés reemplazar
  su contenido, o cancelar?"* — nunca reemplaza automáticamente.
- **Si el `packageId` es nuevo pero el título de la Producción coincide (o
  es muy parecido) a una Producción existente**: no se asume que es la
  misma. Se muestra una advertencia no bloqueante ("ya existe una
  Producción con un título parecido") y el usuario decide: crear una
  Producción nueva de todos modos, o ir a actualizar la existente a mano.
  Nunca se fusiona automáticamente por similitud de título.
- **Caso por defecto** (sin ambigüedad detectada): se crea una Producción
  nueva. La v1 de este importador no tiene un concepto de "actualizar
  Producción existente" salvo el caso explícito de `packageId` duplicado
  de arriba.

---

## 9. Qué ocurre cuando una Escena ya existe

Como las Escenas del paquete tampoco traen ningún id de cliente, "ya
existe" solo tiene sentido dentro del caso de reimportación del mismo
`packageId` (sección 8), cuando el usuario elige **reemplazar contenido**:

- **Reemplazo total, nunca merge campo por campo.** Se eliminan las
  escenas actuales de esa Producción y se insertan las del paquete nuevo,
  en una operación atómica — mismo criterio "regenerar reemplaza
  completo" ya establecido para el análisis del Director Creativo IA. Un
  merge parcial dejaría estados híbridos imposibles de razonar.
- **Excepción de seguridad, obligatoria:** si alguna escena de la
  Producción ya tiene `estadoProduccion != BORRADOR` (ya se grabó o
  editó), el importador **debe bloquear el reemplazo automático** y
  advertir explícitamente que hay trabajo real que se perdería. En ese
  caso, la única opción ofrecida es crear una Producción nueva en su
  lugar — nunca se permite un reemplazo silencioso que borre grabación o
  edición ya hecha.
- **Fuera del caso de reimportación** (Producción nueva, caso por
  defecto de la sección 8): el concepto "la escena ya existe" no aplica —
  todas las escenas del paquete se crean como nuevas siempre.

---

## Resumen de decisiones que esta RFC fija (para no reabrir después)

- El importador reutiliza el patrón ya probado del importador de
  Blueprint/CBD — no se diseña un mecanismo nuevo desde cero.
- La detección de "ya existe" depende exclusivamente de `packageId` —
  nunca de heurísticas de contenido salvo como advertencia no bloqueante.
- Reemplazo de escenas es siempre total, nunca parcial, y siempre bloqueado
  si hay trabajo real (grabación/edición) que se perdería.
- Ningún error de validación es lo suficientemente grave como para
  descartar el texto que el usuario pegó.
- La confirmación humana es innegociable — ninguna ruta del flujo persiste
  sin ese paso.

---

*No implementado. A la espera de autorización explícita para comenzar la
construcción del importador según esta RFC.*
