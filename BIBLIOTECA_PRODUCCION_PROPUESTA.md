# CONTENT OS V2 — SPRINT 6 (propuesta — sin implementar)

> Igual que Sprint 1/2/RFC-002: este documento es solo la propuesta visual y
> de flujo pedida ("Diseñar la Biblioteca de Producción"). No se creó
> ninguna ruta, tabla ni componente nuevo para la Biblioteca en sí — la
> única parte de este ticket que SÍ se implementó y verificó es la limpieza
> de lenguaje "CPP → lenguaje natural" (ver sección 5). Queda a la espera
> de aprobación (con o sin correcciones) antes de tocar código de la
> Biblioteca.

## Por qué propuesta y no implementación directa

Los cinco tipos de elementos (Escenas, Miniaturas, Referencias visuales,
Recursos, Plantillas) no tienen el mismo nivel de encaje con el modelo de
datos actual — construir directamente habría significado adivinar
decisiones de producto en al menos dos de los cinco (Miniaturas y
Plantillas no existen como entidad hoy). Mismo criterio que ya se usó para
el CreatorOS Package: proponer primero, para que las decisiones de forma
las tomes vos, no yo.

**Hallazgo relevante**: ya existe una ruta `/biblioteca` (global, fuera de
cualquier Proyecto) — hoy muestra `bloques`, el archivo histórico de piezas
generadas por el viejo flujo "Crear" (ya deprecado). Su propio texto de
cabecera ya dice *"Contenido histórico — los videos nuevos se producen y
publican desde Producciones"*. Este es exactamente el repropósito que
`SPRINT_1_PROPUESTA.md` (decisión 2) dejó pendiente: *"Biblioteca cambia de
propósito y pasa a ser Biblioteca de Producciones/Recursos"*. La propuesta
de abajo asume que la Biblioteca de Producción **reemplaza el rol
principal** de esa misma ruta — el archivo histórico de `bloques` no se
borra, pasa a ser una pestaña secundaria dentro de la misma pantalla.

---

## 1. Propuesta visual

Entra por el mismo lugar donde ya vive "Biblioteca" en la navegación
global (sin nueva entrada de menú) — cambia lo que hay adentro.

```
┌──────────────────────────────────────────────────────────┐
│  BIBLIOTECA                                                │
│  Reutilizá lo que ya construiste en una Producción nueva.  │
│                                                              │
│  [ Escenas ]  Miniaturas   Referencias visuales   Recursos │
│  Plantillas                                    Archivo ›   │
│  ──────────────────────────────────────────────────────    │
│  Marca: [ Todas ▾ ]                    Buscar: [________]  │
│                                                              │
│  ┌────────────────────┐  ┌────────────────────┐            │
│  │ #2 · Gancho         │  │ #1 · CTA            │            │
│  │ "¿Sabías que el 90%…"│  │ "Probalo gratis…"   │            │
│  │ De: Reel — Lanzam.  │  │ De: Short — Tip      │            │
│  │ 🎥 Primer plano      │  │ 🎥 Plano medio        │            │
│  │           [Reutilizar]│  │           [Reutilizar]│            │
│  └────────────────────┘  └────────────────────┘            │
└──────────────────────────────────────────────────────────┘
```

Cada pestaña de tipo muestra tarjetas con el mismo lenguaje visual que ya
existe (Sprint 5, tarjetas tipo "hoja de rodaje") — no un componente nuevo
desde cero, una variante de la misma tarjeta de Escena que ya tenés, con
una etiqueta "De: {Producción}" agregada y un botón `Reutilizar` en vez del
botón de acción principal.

### Qué es cada tipo, con el modelo de datos de hoy

| Tipo | Fuente real hoy | Qué tan nuevo es |
|---|---|---|
| **Escenas** | `storyboardEscenas` de cualquier Producción | Bajo riesgo — reusa el mismo patrón de `duplicarEscenaStoryboard`, solo que el destino es OTRA Producción en vez de la misma. |
| **Referencias visuales** | `activos` (tipo=`"foto"`) — Locaciones | **Ya reutilizable hoy** a nivel de datos (una Locación ya es del Proyecto entero, no de una Producción) — a esto solo le falta una vista de navegación, no un mecanismo de reutilización nuevo. |
| **Recursos** | `activos` (otros tipos: audio, logo, animación) | Igual que Referencias visuales — ya compartido a nivel de Proyecto, solo falta la vista. |
| **Miniaturas** | `producciones.coverImage` + `producciones.cppMiniaturaJson` | Bajo riesgo pero nuevo — "reutilizar" significa copiar la URL de portada de una Producción a otra, no hay tabla de Miniatura propia (ya lo marcaba como pendiente `SPRINT_1_PROPUESTA.md`). |
| **Plantillas** | Ninguna hoy — propuesta: cualquier Producción existente, vista "sin contenido" (números + tipos + objetivos + duraciones, sin texto hablado/personajes/locación) | El único que de verdad requiere una decisión de producto — ver sección 3. |

---

## 2. Flujo de reutilización

Una sola dirección, un solo punto de entrada — igual que el resto de la
app ("Guardar prompt-plantilla en Biblioteca de Prompts" ya estableció este
patrón: la Biblioteca es el lugar donde se navega y se elige, nunca al
revés):

```
Biblioteca → elegir tipo → elegir elemento → "Reutilizar"
                                                   ↓
                                    Elegir Producción destino
                                    (selector: Marca → Producción,
                                     o "Crear Producción nueva")
                                                   ↓
                              ┌────────────────────┴────────────────────┐
                              │                                          │
                         Escena / Miniatura                        Plantilla
                              │                                          │
                    Se copia el elemento tal cual            Se crea una Producción
                    a la Producción destino                  nueva con la MISMA
                    (mismo patrón que "Duplicar              estructura de escenas,
                    escena", solo que cruza de                sin contenido — el
                    Producción)                                usuario la completa
                              │                                          │
                              └────────────────────┬─────────────────────┘
                                                   ↓
                              Redirige al Dashboard de la Producción
                              destino (mismo destino que ya usa la
                              importación de Producción, Sprint 4)
```

Reglas que se heredan de decisiones ya tomadas en este mismo proyecto (no
hay que inventarlas de nuevo):

- **Nunca reemplaza contenido existente** — reutilizar siempre agrega (una
  escena nueva, una Producción nueva), nunca sobrescribe una Producción ya
  en curso. El único caso de "reemplazar" que existe en todo el sistema
  (CPP con `packageId` repetido) es un caso distinto y no aplica acá.
- **Confirmación humana antes de escribir** — se elige la Producción
  destino explícitamente, nunca una reutilización automática.
- **Referencias visuales/Recursos no se "copian"** — al ser ya
  compartidos a nivel de Proyecto, "reutilizar" ahí es simplemente asignar
  ese mismo Activo a una escena de la Producción destino (la Biblioteca es
  una vista de navegación, no un mecanismo de copia, para estos dos tipos).

---

## 3. Decisión pendiente: Plantillas

Es el único tipo de los cinco que no tiene equivalente hoy y necesita tu
confirmación antes de implementar:

- **Opción A (la que asume esta propuesta)**: cualquier Producción ya
  creada puede usarse como Plantilla — "Usar como Plantilla" es una acción
  disponible sobre cualquier Producción, no una entidad separada. No
  requiere tabla nueva.
- **Opción B**: una Plantilla es una entidad propia, creada a propósito
  (no una Producción real reutilizada) — requeriría una tabla nueva y una
  pantalla de creación de Plantillas.

La Opción A es la que mejor encaja con "no crear tablas nuevas si se puede
evitar" (mismo criterio que ya se aplicó para el CreatorOS Package,
jsonb en vez de tablas nuevas) y con el hecho de que ya tenés Producciones
reales que podrían servir de punto de partida hoy mismo. Recomiendo A,
pero es tu decisión.

---

## 4. Archivos modificados

**Biblioteca de Producción: ninguno** — es una propuesta, no código.

**Limpieza de lenguaje "CPP → lenguaje natural" (esta sí implementada y
verificada esta ronda)**:

- [src/components/hoy-screen.tsx](src/components/hoy-screen.tsx) — el botón que abre el importador decía *"¿Ya tenés un CreatorOS Package? Importar desde archivo (.cpp.json)"*; ahora dice **"Importar Producción"**.
- [src/components/revision-cpp.tsx](src/components/revision-cpp.tsx) — 3 textos visibles corregidos: la etiqueta superior de la pantalla de revisión (decía "CreatorOS Production Package", ahora "Vista previa"), el texto de carga ("Leyendo el paquete…" → "Analizando la Producción…"), y el aviso de reimportación ("Mismo `packageId`" con la palabra en código → "Es la misma Producción que importaste el…").

Los nombres de funciones/tipos (`AnalisisCPP`, `confirmarImportacionCPP`, `CreatorOSProductionPackage`, etc.) y los documentos técnicos (`CREATOROS_PACKAGE_V1_SPEC.md`, `RFC-002-...md`) se dejaron exactamente igual — son código y documentación, no interfaz, tal como pediste mantenerlos.

Verificado: `tsc --noEmit` limpio, `eslint` sin errores (mismos warnings preexistentes de siempre), 234/234 tests, `next build` exitoso.

---

## 5. Riesgos

1. **La ruta `/biblioteca` ya existe con otro propósito** (archivo de `bloques`). La propuesta la reutiliza en vez de crear una ruta nueva — coherente con la decisión ya aprobada en Sprint 1, pero implica que cuando se implemente, el archivo histórico deja de ser lo primero que se ve al entrar (pasa a pestaña "Archivo").
2. **Miniaturas y Plantillas no tienen modelo de datos real hoy** — cualquier implementación de esos dos tipos necesita al menos una decisión de forma (ver sección 3 para Plantillas; Miniaturas es más simple pero sigue sin tabla propia).
3. **"Reutilizar una Escena" cruzando de Producción implica reasignar Personaje/Locación/Plano** si la Producción destino es de una Marca distinta (esos ids son específicos de cada Proyecto) — el flujo tendría que ofrecer la misma resolución por similitud que ya existe para Blueprint/CPP, no una copia ciega de ids. Lo dejo señalado para cuando se implemente, no lo resolví en esta propuesta.
4. **Filtrar "Referencias visuales" de "Recursos"** depende de `activos.tipo === "foto"` — mismo criterio que ya usa toda la app (Locaciones = fotos, todo lo demás = Recursos); no es una distinción nueva, pero vale confirmarla porque el nombre de la columna (`tipo`) no lo deja obvio a primera vista.

---

## 6. Capturas

No aplica para la Biblioteca (es una propuesta en papel, nada para
fotografiar todavía). Para la limpieza de lenguaje CPP, sigue vigente el
mismo bloqueo de las rondas anteriores: el navegador que controlo está
aislado de tu sesión autenticada, así que no pude capturar el botón
"Importar Producción" ni la pantalla de revisión en vivo. Podés confirmar
vos mismo abriendo Hoy y mirando el nuevo texto del botón, o pedime que
retome la verificación en vivo cuando tengas una forma de que yo entre
autenticado.

---

*No se hizo commit, según lo pedido. A la espera de tu aprobación (con o
sin correcciones, incluida la decisión de Plantillas) antes de implementar
la Biblioteca.*
