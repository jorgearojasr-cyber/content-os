# CONTENT OS V2 — SPRINT 1 (propuesta — VERSIÓN FINAL, sin implementar)

> Sprint 1 aprobado con 4 decisiones incorporadas (ver abajo). Sigue siendo
> un documento de solo propuesta — **no se tocó ningún archivo de código**,
> no se rediseñó el Dashboard real, y no se marcó nada como `Deprecated` en
> el código. Queda a la espera de autorización explícita para empezar a
> implementar.

## Decisiones incorporadas en esta versión

1. **Director Creativo IA, Director de Edición, Importador de Blueprint y Decision Engine permanecen como módulos del ecosistema CreatorOS.** No se marcan como `Deprecated` — quedan confirmados como parte del sistema.
2. **Biblioteca cambia de propósito**: pasa a ser **Biblioteca de Producciones/Recursos** — deja de depender del flujo de generación (Crear).
3. **Dashboard**: se agrega una tarjeta superior fija **"Continuar Producción"** con la próxima acción más urgente, antes de la lista completa de Producciones.
4. No se modificó código todavía.

---

## 1. Árbol de la nueva arquitectura (propuesta)

```
src/
├── domains/                        # NUEVO — agrupación por dominio (propuesta)
│   ├── producciones/
│   │   ├── actions.ts               # hoy: fragmento de src/lib/actions.ts
│   │   └── types.ts
│   ├── escenas/
│   │   ├── actions.ts               # hoy: fragmento de src/lib/actions.ts (storyboardEscenas)
│   │   └── types.ts
│   ├── recursos/                    # hoy: "Activos" — mismo modelo de datos, nombre a confirmar
│   │   └── actions.ts
│   ├── miniaturas/                  # NUEVO — no existe como entidad hoy
│   │   ├── actions.ts
│   │   └── types.ts
│   ├── publicacion/                 # hoy: el paso "Cierre" dentro de Producción, sin entidad propia
│   │   └── actions.ts
│   ├── biblioteca/
│   │   └── actions.ts
│   └── configuracion/
│       └── actions.ts
├── app/                              # rutas Next.js — sin cambios de framework
├── components/                       # sin cambios de framework
├── db/                                # schema.ts se mantiene íntegro (sin migraciones en este sprint)
└── lib/                               # lo que sobreviva de lógica determinística no ligada a generación de contenido
```

**Nada de esto existe todavía** — es la forma que tomaría `src/lib/actions.ts` (hoy 2757 líneas, 111 funciones, ver `ARCHITECTURE_REPORT.md`) si se dividiera por dominio en un sprint futuro, una vez autorizado tocar código.

---

## 2. Módulos existentes → mapeo al nuevo modelo

| Módulo/pantalla actual | Dominio destino propuesto | Estado del mapeo |
|---|---|---|
| `producciones` (tabla) + `/producciones`, `/proyectos/[id]/producciones/[id]` | **Producciones** | Encaje directo — ya es el núcleo actual del sistema, cambia poco. |
| `storyboardEscenas` + Copiloto (Grabar/Editar/Cierre) | **Escenas** | Encaje directo — Copiloto Grabar ya opera "una escena a la vez". |
| `activos` (tabla) + `/proyectos/[id]/activos` | **Recursos** | Encaje directo, solo cambia el nombre del dominio. |
| — (no existe hoy como entidad) | **Miniaturas** | **Sin encaje** — hoy no hay ninguna tabla ni pantalla de miniatura independiente. Necesita modelo de datos nuevo (fuera de alcance de este sprint). |
| Paso "Cierre" del Copiloto (fecha planificada + marcar publicada) | **Publicación** | **Parcial** — hoy es un estado dentro de Producción, no una entidad propia. Convertirlo en dominio real requeriría el "nuevo modelo de datos oficial" que el congelamiento pide esperar. |
| `bloques` (tabla) + Biblioteca | **Biblioteca de Producciones/Recursos** (repropósito confirmado) | **Resuelto** — deja de ser el destino de piezas generadas por "Crear" y pasa a ser el repositorio de Producciones/Recursos ya organizados en el sistema. Ver nota de implementación abajo. |
| `/proyectos/[id]/configuracion` | **Configuración** | Encaje directo. |
| `director-creativo.ts`, Plan de Edición (Copiloto Editar), `blueprint-parser.ts`/`blueprint-prompt.ts`, `decision-engine.ts` | **Ecosistema CreatorOS** (transversal, no es uno de los 7 dominios de datos — es capa de organización sobre Producciones/Escenas) | **Confirmado — se mantienen, no se deprecian.** Decisión 1. |
| Identidad, Personajes, Avatares | *No aparece en la lista de 7 dominios del Sprint* | **Sin definición** — ver riesgo. |
| Segundo Cerebro, Calendario, Prompts, Áreas | *No aparece en la lista de 7 dominios del Sprint* | **Sin definición** — ver riesgo. |

---

## 3. Módulos candidatos a marcar como `Deprecated` (propuesta — nada marcado todavía)

Dentro del alcance declarado ("generación de IA, asistentes, chat, prompts, generación de guiones, brainstorming"):

- **Crear** (`/proyectos/[id]/crear`, `crear-pieza-form.tsx`) — todo el flujo de generación de piezas (Nivel A: Content OS arma el prompt, el usuario lo corre en ChatGPT y pega el resultado).
- **Identidad → "Generar personaje"/"Completar con IA"** (`ai-tools.tsx`, `ai-provider.ts`) — llamada directa a Anthropic.
- **Generación de imagen** (`imagen-provider.ts`, OpenAI GPT Image) — usada desde Crear/Biblioteca.
- **Segundo Cerebro** (`notas`, captura de ideas) — cae directo bajo "brainstorming".
- **Biblioteca de Prompts** (`promptsGuardados`, `/prompts`) — cae directo bajo "prompts". Nombre distinto a propósito de la nueva "Biblioteca de Producciones/Recursos" (decisión 2) — son dos tablas y dos conceptos distintos (`promptsGuardados` vs. `bloques`), no hay que confundirlos al implementar.

### Confirmados como parte del ecosistema CreatorOS — NO se deprecian (decisión 1)

- **Director Creativo IA** (`director-creativo.ts`) — opina sobre un guion ya escrito y organiza decisiones de producción pendientes (Personaje/Locación/Recurso). Se mantiene.
- **Director de Edición** (Plan de Edición dentro de Copiloto Editar) — organiza el montaje, no genera contenido. Se mantiene.
- **Importador de Blueprint/CBD** (`blueprint-parser.ts`, `blueprint-prompt.ts`) — precursor confirmado del futuro importador del CreatorOS Package (Sprint 2). Se mantiene, sin reconstrucción.
- **Decision Engine** (`decision-engine.ts`, sugerencias determinísticas de Movimiento de cámara/Emoción) — Nivel B, sin proveedor de IA. Se mantiene.

---

## 4. Propuesta del nuevo Dashboard (en papel — no implementado)

Reemplaza el Dashboard actual (proyectos recientes + contenido reciente) por una lista de Producciones con su estado y la próxima acción concreta. Se agrega una tarjeta fija arriba de todo (decisión 3) con la producción más urgente, para que el usuario nunca tenga que buscarla entre la lista:

```
┌═══════════════════════════════════════════════┐
║  CONTINUAR PRODUCCIÓN                          ║
║                                                 ║
║  Reel — Lanzamiento producto X                 ║
║  ● En grabación (3/6 escenas)                  ║
║                                                 ║
║  ▶ Grabar Escena 4                             ║
└═══════════════════════════════════════════════┘

┌─────────────────────────────────────────────┐
│  PRODUCCIONES                                │
├─────────────────────────────────────────────┤
│  Reel — Lanzamiento producto X                │
│  ● En grabación (3/6 escenas)                 │
│  → Grabar Escena 4                            │
├─────────────────────────────────────────────┤
│  Carrusel — Testimonios                       │
│  ● Grabación terminada                        │
│  → Editar Escena 5                            │
├─────────────────────────────────────────────┤
│  Reel — Detrás de cámara                      │
│  ● Edición terminada, sin miniatura           │
│  → Crear Miniatura                            │
├─────────────────────────────────────────────┤
│  Short — Tip rápido                           │
│  ● Listo para publicar                        │
│  → Publicar                                   │
└─────────────────────────────────────────────┘
```

**Dato técnico relevante para cuando se implemente**: la lógica de "próxima acción" ya tiene una base determinística parcial hoy — `src/lib/estado-produccion.ts` (`resolverFaseCopiloto`) ya calcula la fase de una Producción (Grabar → Editar → Cierre) a partir del estado de sus escenas. La fase Miniatura/Publicación como pasos explícitos separados es lo único que faltaría modelar, y depende del "nuevo modelo de datos oficial" pendiente.

**Pendiente de definir en el Product Spec**: el criterio para elegir CUÁL Producción aparece en "Continuar Producción" cuando hay varias activas a la vez (¿la más reciente? ¿la más avanzada? ¿la que el usuario tocó por última vez?) — no lo asumo acá, es una decisión de producto.

No se creó ningún componente, ruta ni archivo para esto — es solo la propuesta visual pedida.

---

## 5. Archivos modificados

**Ninguno.** Por la decisión de mantener este Sprint 1 en fase de solo análisis, no se tocó ningún archivo de `src/`. Único archivo nuevo: este documento (`SPRINT_1_PROPUESTA.md`).

---

## 6. Riesgos encontrados

Resueltos por las decisiones de esta aprobación (dejo constancia para trazabilidad, ya no bloquean nada):

- ~~Ambigüedad "asistente" vs. "organización" (Director Creativo/Edición/Decision Engine)~~ → resuelto por decisión 1: se mantienen.
- ~~Biblioteca depende del flujo de generación que se deprecia~~ → resuelto por decisión 2: repropósito confirmado a Biblioteca de Producciones/Recursos.

Vigentes:

1. **Cinco módulos existentes no aparecen en la lista de 7 dominios del Sprint** (Identidad, Personajes, Avatares, Segundo Cerebro, Calendario, Áreas). Sin una decisión explícita, quedan en un limbo: ni confirmados en el nuevo modelo, ni marcados para deprecar.
2. **`src/lib/actions.ts` es el único punto de escritura de las 15 tablas** (2757 líneas). Cualquier "desacople del flujo principal" real, cuando se autorice, va a tocar ese archivo casi con certeza — no hay forma de desacoplar sin tocarlo, aunque el desacople en sí no sea una migración de datos.
3. **Miniatura y Publicación no tienen modelo de datos propio hoy.** Cualquier avance real más allá de la propuesta visual del Dashboard requiere el "nuevo modelo de datos oficial" que el congelamiento y este mismo sprint piden esperar — no se puede avanzar en código para estos dos dominios sin eso.
4. **Nuevo, de esta ronda**: el criterio para elegir qué Producción muestra la tarjeta "Continuar Producción" cuando hay varias activas no está definido — ver nota en sección 4.
5. **Nuevo, de esta ronda**: repropósito de Biblioteca (decisión 2) implica que el flujo de entrada de piezas cambia — hoy `bloques` nace de "Crear" (que se deprecia); el nuevo flujo de entrada (¿importación directa del CreatorOS Package?) todavía no está definido. No lo asumo, queda para el Product Spec.

---

*No avanzar al Sprint 2 sin aprobación — según lo indicado.*
