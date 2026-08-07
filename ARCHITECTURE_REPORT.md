# ARCHITECTURE_REPORT.md — Content OS

> Auditoría técnica previa a una refactorización completa. Documento de solo
> análisis — no se modificó ningún archivo de código para producirlo.
> Generado: 2026-08-07.

---

## 1. Estructura del proyecto

```
content-os/
├── src/
│   ├── app/            # Rutas (Next.js App Router) — páginas + componentes de cliente propios de cada ruta
│   │   ├── proyectos/[id]/   # Todo lo que vive DENTRO de un proyecto (ver árbol abajo)
│   │   ├── areas/            # Agrupador de proyectos
│   │   ├── biblioteca/       # Vista global de Biblioteca (todos los proyectos)
│   │   ├── calendario/       # Calendario de piezas planificadas
│   │   ├── conocimiento/     # Biblioteca de Conocimiento (documentos) — activa, ver sección 4
│   │   ├── imagenes/         # Proxy de blobs privados (route.ts, no es pantalla)
│   │   ├── personajes/       # Personajes "de estudio" (globales, sin proyecto)
│   │   ├── producciones/     # Listado global de Producciones — activa (sin equivalente por-proyecto)
│   │   ├── prompts/          # Biblioteca global de prompts guardados
│   │   ├── segundo-cerebro/  # Notas/ideas sueltas
│   │   ├── layout.tsx        # Shell raíz (Sidebar, fuentes, proxy de auth)
│   │   ├── page.tsx          # Dashboard de inicio
│   │   └── globals.css       # Tokens de diseño (CSS custom properties)
│   ├── components/     # Componentes compartidos entre rutas (no específicos de una sola pantalla)
│   ├── db/              # `schema.ts` (Drizzle) + `index.ts` (cliente Neon)
│   └── lib/              # Todo lo que no es UI: Server Actions, compiladores de prompt, parsers, motores determinísticos
├── drizzle/             # Migraciones SQL generadas + snapshots de Drizzle Kit
├── docs/
│   ├── arquitectura/    # Decisiones de arquitectura documentadas con su porqué (ver sección 6)
│   ├── phase-2/         # Spec del Director Creativo IA
│   └── hitos/           # Registro de hitos de producto
├── scripts/             # Utilidades de mantenimiento fuera de la app (respaldo de DB, seeds, reset)
├── public/              # Estáticos (logo, iconos por defecto)
├── src/proxy.ts         # Middleware de autenticación por contraseña compartida
└── drizzle.config.ts, next.config.ts, eslint.config.mjs, tsconfig.json, package.json
```

### Responsabilidad por carpeta

| Carpeta | Responsabilidad |
|---|---|
| `src/app/proyectos/[id]/` | Todo lo que un usuario hace **dentro de un Proyecto**: Identidad, Crear, Biblioteca, Activos, Producciones, Configuración. Cada subcarpeta = una pestaña de navegación. |
| `src/app/{areas,biblioteca,calendario,personajes,producciones,prompts,segundo-cerebro}/` | Vistas **globales**, cruzando todos los proyectos. |
| `src/components/` | Piezas de UI reutilizadas por **más de una** pantalla (`ui.tsx` = primitivos base, `action-menu.tsx`, `seccion-colapsable.tsx`, etc.). Un componente usado por una sola pantalla vive junto a esa pantalla en `src/app/...`, no acá — es la convención implícita del repo. |
| `src/db/` | Única fuente de verdad del modelo de datos. Nada fuera de acá define columnas. |
| `src/lib/` | El "backend": Server Actions (`actions.ts`), lógica de dominio pura (compiladores, parsers, motores de decisión), y las dos capas de proveedor de IA (`ai-provider.ts`, `imagen-provider.ts`). |
| `docs/arquitectura/` | Las reglas de diseño que el código debe respetar, con el incidente/razón que las originó — lectura obligatoria antes de refactorizar nada. |
| `drizzle/` | Historial de migraciones — **con drift conocido** respecto al estado real de la base (ver sección 4 y `docs/arquitectura/deuda-tecnica.md`). |
| `scripts/` | Scripts de un solo uso, corridos manualmente (`node scripts/...`), no parte del build. |

---

## 2. Tecnologías utilizadas

| Categoría | Tecnología | Notas |
|---|---|---|
| **Framework** | Next.js 16.2.10 (App Router) + React 19.2 + TypeScript | Server Actions como única capa de backend — no hay endpoints REST propios (salvo una excepción, ver Almacenamiento). |
| **Base de datos** | Neon Postgres (serverless) | Conexión pooleada (`DATABASE_URL`) para la app, conexión directa (`DATABASE_URL_UNPOOLED`) solo para migraciones. |
| **ORM** | Drizzle ORM (`drizzle-orm` 0.45 + `drizzle-kit` 0.31) | Migraciones aplicadas con `drizzle-kit push` — `drizzle-kit generate` está roto por drift entre el snapshot y el estado real de la base (deuda técnica documentada). |
| **Autenticación** | Gate de contraseña compartida (`src/proxy.ts`) | Una sola contraseña (`APP_PASSWORD`, hasheada) protege todo el sitio vía cookie de sesión. **No hay cuentas de usuario, ni roles, ni multi-tenant** — es una app de un solo dueño. |
| **Almacenamiento** | Vercel Blob (`@vercel/blob`) | Archivos subidos por el usuario. Los blobs privados se sirven a través de un proxy propio (`src/app/imagenes/route.ts`) porque el navegador no puede mandar el token de Blob directo en un `<img src>`. |
| **IA — texto** | `@anthropic-ai/sdk` (Claude) | Dos patrones distintos conviven (ver sección 6): llamada directa desde servidor (`ai-provider.ts`) y "prompt-y-pegado" manual (Nivel A, `director-creativo.ts`, `blueprint-prompt.ts`). |
| **IA — imagen** | `openai` SDK (GPT Image) | `imagen-provider.ts`, llamada directa desde servidor. |
| **Validación** | Zod 4 | Todos los contratos de datos que vienen de una IA externa (Director Creativo, Plan de Edición) se validan con schemas Zod antes de persistir. |
| **Testing** | Vitest | Pruebas unitarias sobre funciones puras de `src/lib/*.test.ts` — no hay pruebas de integración ni end-to-end. |
| **Estilos** | Tailwind CSS 4 + tokens CSS custom properties (`globals.css`) | Sin librería de componentes UI externa — todo hecho a mano en `components/ui.tsx`. |
| **Utilidades puntuales** | `jspdf` (exportar PDF, uso acotado) | — |
| **Despliegue** | Vercel | Producción: `content-os-coral.vercel.app`. |

---

## 3. Flujo de la aplicación

Paso a paso, desde crear un Proyecto hasta cerrar una Producción:

1. **Crear Proyecto** (`/proyectos` → `proyectos-lista.tsx` + `nuevo-proyecto-form.tsx`) — el usuario nombra el proyecto y opcionalmente lo asigna a un Área. Server Action en `actions.ts` inserta en `proyectos`.
2. **Definir Identidad** (`/proyectos/[id]/identidad`) — el usuario completa la voz de marca por secciones (historia, valores, CTA, restricciones, etc.). Cada sección se compila en un "Prompt Maestro" (`identity-compiler.ts`) — el bloque de texto que se antepone a cualquier generación posterior. Acá también viven Personajes y Avatares del proyecto.
3. **Elegir camino**: contenido simple o Producción de video.
   - **Contenido simple** (`/proyectos/[id]/crear`): el usuario arma el contexto → Content OS compila un prompt de texto (Nivel A) → el usuario lo corre afuera y pega el resultado → se guarda como `Bloque` en Biblioteca.
   - **Producción de video** (el flujo más elaborado):
     1. **Importar Blueprint (CBD)** — el usuario pega un CBD (guion en Markdown ya generado afuera) en un importador; `blueprint-parser.ts` lo parsea (Nivel B, sin IA) en escenas estructuradas.
     2. **Revisión** (`revision-blueprint.tsx`) — resolver qué Personaje/Locación/Plano corresponde a cada escena (motor de similitud, Nivel B) antes de confirmar.
     3. **Director Creativo IA (opcional)** — desde la misma pantalla de Revisión, el usuario puede pedir una opinión profesional sobre el storyboard completo a una IA externa (Nivel A): Content OS arma el prompt, el usuario pega la respuesta, se valida contra un schema Zod y queda guardada junto a la Producción.
     4. **Confirmar** — se crea la fila `producciones` + una fila `storyboard_escenas` por escena. Cada escena recibe un índice inmutable (`numeroEnAnalisisDirector`) que la liga para siempre a lo que dijo el Director, sin importar cuántas veces se reordene el storyboard después.
     5. **Copiloto — Grabar** (`/copiloto/[escenaId]`) — pantalla guiada escena por escena: guion, checklist de lo que falta, recomendación de plano (heurística) y los hallazgos del Director relevantes para esa escena específica, cada uno con una acción concreta.
     6. **Copiloto — Editar** — cuando todas las escenas están grabadas: hallazgos de alcance completo del Director (repetición/transición entre escenas) + "Director de Edición" (otro pase de IA que arma un plan de montaje para editar a mano afuera).
     7. **Cierre** — se define fecha de publicación y la Producción queda marcada como publicada.
4. En paralelo, en cualquier punto: **Activos** (medios reutilizables), **Segundo Cerebro** (notas sueltas con match automático contra Biblioteca), **Calendario** y **Prompts** (biblioteca de prompts) están disponibles como utilidades transversales, no como pasos obligatorios de este flujo.

---

## 4. Modelo de datos

15 tablas en `src/db/schema.ts`. La mayoría de las redundancias listadas abajo **ya están señaladas como tales en los comentarios del propio schema** — no son hipótesis mías, son deuda técnica que el equipo ya documentó al crearla.

| Entidad | Qué representa | Relación |
|---|---|---|
| `area` | Agrupador opcional de Proyectos que comparten conocimiento de fondo | 1 Área → N Proyectos |
| `proyectos` | Contenedor raíz — una marca/cliente | 1 Proyecto → N Identidad(1), Personajes(vía uso), Bloques, Activos, Notas, Producciones... |
| `identidades` | Voz de marca de un Proyecto — Marca + Personaje(legado) + Estilo | 1 a 1 con `proyectos` |
| `personajes` | Quién aparece en el contenido — **global**, ya no pertenece a un Proyecto | N a N implícito con Bloques/Producciones vía `personajeId`/tabla puente |
| `avatares` | Segmento de audiencia (cliente ideal) de un Proyecto — puede haber varios | N por Proyecto |
| `bloques` | Una pieza de contenido guardada en Biblioteca | N por Proyecto; referencia opcional a `personajes` |
| `activos` | Recurso reutilizable (foto, logo, música, color, prompt, etc.) por proyecto | N por Proyecto |
| `notas` | Apunte rápido de Segundo Cerebro, con o sin proyecto | N por Proyecto (opcional); puede enlazar a un `bloque` |
| `conocimiento` | **Tabla vieja**, ver redundancia abajo | N por Proyecto |
| `documentos` | Biblioteca de Conocimiento actual — reemplaza a `conocimiento` | proyecto/área/personaje todos opcionales e independientes entre sí |
| `promptsGuardados` | Prompt de referencia reutilizable, global u por-proyecto | Proyecto opcional; Personaje opcional |
| `planos` | Catálogo fijo de tipos de plano de cámara | Sin FK entrante — catálogo de referencia |
| `producciones` | Un video específico dentro de un Proyecto | N por Proyecto |
| `storyboardEscenas` | Una escena planificada dentro de una Producción | N por Producción |
| `storyboardEscenasPersonajes` | Tabla puente N a N entre escena y personaje | — |

### Redundancias detectadas (citadas directamente del código)

1. **`identidades` guarda una "Capa Personaje" completa (columnas `personajeNombre`, `personajePersonalidad`, `fisica`, `vestuario`, `vozDescrita`, `gestos`, `muletillas`, `fotosUrlsJson`) que duplica exactamente lo que hoy vive en la tabla `personajes`.** El propio comentario del schema (`schema.ts:128-136`) lo dice explícitamente: *"Las columnas equivalentes en `identidades`... quedan deprecadas — se conservan por ahora, sin usarse."* Candidato directo a eliminar en la refactorización (requiere confirmar primero que ninguna lectura vieja las usa).
2. **`identidades.avatarJson` vs. la tabla `avatares`.** Mismo patrón: el comentario en `schema.ts:255-259` dice *"Antes vivía serializado en `identidades.avatar_json`... `identidades.avatar_json` queda deprecada"* — la tabla `avatares` es la fuente de verdad actual, la columna sigue existiendo sin usarse.
3. **`storyboardEscenas.proyectoId` es derivable de `producciones.proyectoId`.** El propio comentario (`schema.ts:630-633`) lo admite: *"queda por ahora (redundante pero de bajo riesgo)... se puede derivar siempre vía `producciones.proyectoId`."* No rompe nada hoy, pero es una columna que puede desincronizarse si algún UPDATE olvida mantenerla igual.
4. **`conocimiento` vs. `documentos`.** `conocimiento` (`schema.ts:405-420`) es, según su propio comentario, la *"Base de Conocimiento"* original, ya migrada a `notas` en una ronda anterior y luego reemplazada conceptualmente por `documentos` (*"la tabla `conocimiento` vieja (deprecada, migrada a notas en una ronda anterior — se deja intacta)"*, `schema.ts:427-428`). **Confirmado en la auditoría de código muerto (sección 8): la tabla `conocimiento` no tiene ningún CRUD activo — cero referencias fuera de `schema.ts`.** La ruta `/conocimiento` sigue viva, pero opera sobre `documentos`, no sobre esta tabla. Es candidata directa a `DROP TABLE` en la refactorización.
5. **`bloques.personajeId` + `bloques.personajeIdsJson`** — dos campos para la misma relación (uno-a-uno legado vs. arreglo actual de selección múltiple), documentado en `schema.ts:293-305` como algo mantenido a propósito por compatibilidad, no un error, pero sigue siendo dos formas de la misma información en la misma fila.
6. **Patrón "campo `*Json` en vez de tabla propia" repetido varias veces** (`bloques.escenasJson`, `bloques.planEdicionJson`, `producciones.planEdicionJson`, `personajes.versionesJson`, `personajes.fotosUrlsJson`) — consistente como decisión de diseño (evitar tablas para datos que no se consultan individualmente), pero vale revisarlo en la refactorización: algunos de estos (`escenasJson` de un Bloque vs. `storyboardEscenas` como filas propias) representan el **mismo concepto de "escena"** modelado de dos formas completamente distintas según si la pieza nació de Crear o de una Producción — ver el comentario de línea `498-500` que ya avisa de esto ("es un concepto DISTINTO... no lo toques al tocar esto").

---

## 5. Pantallas

| Ruta | Propósito | Archivo(s) principal(es) | Componentes clave |
|---|---|---|---|
| `/` | Dashboard de inicio: proyectos y contenido reciente | `src/app/page.tsx` | `Sidebar` (layout) |
| `/proyectos` | Listar/crear Proyectos | `proyectos/page.tsx`, `proyectos-lista.tsx`, `nuevo-proyecto-form.tsx` | — |
| `/proyectos/[id]` | Overview del proyecto | `proyectos/[id]/page.tsx` | `project-nav.tsx` |
| `/proyectos/[id]/identidad` | Voz de marca, Personajes, Avatares | `identidad/page.tsx`, `personajes-lista.tsx`, `avatares-lista.tsx`, `ai-tools.tsx` | `identity-compiler.ts`, `prompt-maestro.tsx`, `identidad-checklist.tsx`, `madurez-bar.tsx`, `validador-consistencia.tsx` |
| `/proyectos/[id]/crear` | Crear pieza de contenido simple (Nivel A) | `crear/page.tsx`, `crear-pieza-form.tsx` | `contexto-para-chatgpt.tsx`, `hoy-screen.tsx` |
| `/proyectos/[id]/biblioteca` | Piezas guardadas, archivo, papelera | `biblioteca/page.tsx`, `biblioteca-lista.tsx` (1029 líneas — la pantalla más grande del repo) | `documentos-lista.tsx` |
| `/proyectos/[id]/biblioteca/[bloqueId]/editar` | Editar una pieza ya generada | `editar/page.tsx`, `editar-bloque-escenas.tsx` | `escenas-editor.tsx` |
| `/proyectos/[id]/activos` | Medios reutilizables del proyecto | `activos/page.tsx`, `activos-lista.tsx`, `nuevo-activo-form.tsx`, `fotos-lugar.tsx` | `file-uploader.tsx` |
| `/proyectos/[id]/configuracion` | Ajustes del proyecto | `configuracion/page.tsx`, `configuracion-form.tsx` | — |
| `/proyectos/[id]/producciones/[produccionId]` | Detalle de una Producción — grilla de escenas | `producciones/[produccionId]/page.tsx`, `produccion-escenas.tsx` | `produccion-nav.tsx`, `escena-panel.tsx` (huérfano, ver sección 8) |
| `/copiloto/[escenaId]` | Grabar una escena, guiado | `copiloto/[escenaId]/page.tsx`, `copiloto-grabar.tsx` (720 líneas) | `seccion-colapsable.tsx`, `estado-produccion-badge.tsx` |
| `/copiloto/editar` | Fase de edición del video completo | `copiloto/editar/page.tsx` | `plan-edicion-panel.tsx` |
| `/copiloto/cierre` | Publicar/cerrar la Producción | `copiloto/cierre/page.tsx` | — |
| `/areas` y `/areas/[id]` | Agrupar proyectos por Área | `areas/page.tsx`, `areas/[id]/page.tsx`, `nueva-area-form.tsx`, `area-acciones.tsx` | — |
| `/biblioteca` | Biblioteca global (todos los proyectos) | `biblioteca/page.tsx`, `biblioteca-global-lista.tsx` | — |
| `/calendario` | Calendario de piezas planificadas | `calendario/page.tsx`, `calendario-mes.tsx` | — |
| `/personajes` | Personajes "de estudio" (sin proyecto) | `personajes/page.tsx`, `personajes-global-lista.tsx` | — |
| `/producciones` | Listado global de Producciones (no hay listado equivalente dentro de `/proyectos/[id]`) | `producciones/page.tsx`, `producciones-lista.tsx` | Enlazada desde `sidebar.tsx` ("Mis videos") |
| `/prompts` | Biblioteca global de prompts guardados | `prompts/page.tsx` | `prompts-lista.tsx` |
| `/segundo-cerebro` | Notas/ideas sueltas | `segundo-cerebro/page.tsx`, `segundo-cerebro-lista.tsx` | `relacionado-panel.tsx` |
| `/conocimiento` | Biblioteca de Conocimiento (documentos: archivo/link/texto) — pese al nombre de la ruta, opera sobre la tabla `documentos`, no sobre la tabla vieja `conocimiento` (ver sección 8) | `conocimiento/page.tsx` | `documentos-lista.tsx` |

---

## 6. Módulos

- **Auth** — `src/proxy.ts`: gate único de contraseña compartida sobre todo el sitio, sin conceptos de usuario/rol.
- **Proyectos / Áreas** — entidad raíz de organización; un Área agrupa Proyectos.
- **Identidad** — voz de marca por proyecto + Personajes + Avatares; produce el "Prompt Maestro" que alimenta todo lo demás.
- **Crear (contenido simple)** — flujo Nivel A de una sola pieza (imagen/carrusel/post).
- **Producción (video con storyboard)** — el módulo más grande: import de Blueprint, Revisión, Director Creativo IA, Copiloto (Grabar/Editar/Cierre).
- **Director Creativo IA** — subsistema propio dentro de Producción: un único análisis de IA por Producción, generado una vez, consumido en modo lectura en dos pantallas distintas (Copiloto Grabar y Copiloto Editar) mediante funciones puras de clasificación (`director-creativo.ts`).
- **Decision Engine** — motor determinístico (sin IA) de sugerencias de campo (ej. Movimiento de cámara, Emoción) con tres niveles de fricción (Automático/Sugerido/Manual), documentado en `docs/arquitectura/principios-de-diseno.md`.
- **Biblioteca** — repositorio de piezas terminadas, con archivado y papelera de reciclaje (purga perezosa, sin cron).
- **Activos** — medios reutilizables por proyecto.
- **Segundo Cerebro** — notas/ideas sueltas con matching por similitud contra Biblioteca.
- **Calendario / Prompts** — utilidades transversales de planificación y reutilización.
- **Publicación** — no es un módulo separado: vive como el paso final ("Cierre") dentro de Producción; no existe integración real con ninguna red social (más allá de un helper de evidencia por oEmbed de Instagram).
- **Proveedores de IA** — capa de infraestructura compartida por varios módulos: `ai-provider.ts` (Anthropic, llamada directa) e `imagen-provider.ts` (OpenAI, llamada directa) — ver la inconsistencia arquitectónica señalada en la sección 7.

---

## 7. Dependencias entre módulos

No hay una capa de mensajería ni de eventos entre módulos — toda comunicación es **llamada directa de función**, casi siempre a través de un único punto de entrada: `src/lib/actions.ts`.

- **Todas las pantallas dependen de `actions.ts`**, nunca al revés. Es el único archivo que importa el cliente de base de datos (`src/db/index.ts`) para escritura — ninguna pantalla ni componente hace `db.insert/update/delete` directo.
- **`actions.ts` depende de los módulos de dominio puro** (`identity-compiler.ts`, `personaje-compiler.ts`, `blueprint-parser.ts`, `decision-engine.ts`, `estado-produccion.ts`, `estimacion-duracion.ts`, `director-creativo.ts`) para transformar datos antes de persistir — esos módulos, a su vez, no importan `actions.ts` ni `db/`, son funciones puras que reciben y devuelven datos planos.
- **`actions.ts` depende de los dos proveedores de IA** (`ai-provider.ts`, `imagen-provider.ts`) para las funciones que sí llaman a un proveedor en el servidor — `ai.ts` es una capa intermedia delgada sobre `ai-provider.ts` (documentada explícitamente para poder cambiar de proveedor sin tocar el resto del código).
- **El módulo Director Creativo IA es el único que expone funciones de lectura/clasificación consumidas directamente por componentes de UI** (`hallazgosParaEscena`, `hallazgosParaGrabar`, `agruparHallazgosPorPrioridad`, etc. en `director-creativo.ts`, usadas desde `src/app/.../copiloto/[escenaId]/page.tsx` y `.../copiloto/editar/page.tsx`) — el resto de la lógica de dominio se consume casi siempre indirectamente, a través de `actions.ts`.
- **`types.ts`** es transversal: lo importan tanto `actions.ts` como casi todos los componentes de UI, para los tipos de dominio y los `parse*` que adaptan columnas `jsonb` a tipos TypeScript (ej. `parseAnalisisDirectorCreativo`, `parsePlanEdicion`).
- **Componentes de `src/components/`** dependen de `src/lib/*` (tipos, formateo) pero no llaman `actions.ts` directamente en su mayoría — reciben las Server Actions ya vinculadas (`bind`) como props desde el `page.tsx` que los renderiza (patrón consistente en toda la app).
- **Punto de acoplamiento más fuerte**: `actions.ts` conoce las 15 tablas y buena parte de la lógica de validación de cada una — es el módulo del que depende literalmente todo lo demás, y el que más se resentiría en una refactorización (ver sección 9, punto 1).
- **Inconsistencia real a resolver**: dos módulos (`ai-provider.ts`, `imagen-provider.ts`) rompen la regla Nivel A/Nivel B (sección 6) llamando directo a un proveedor de IA desde `actions.ts`, mientras que `director-creativo.ts` y `blueprint-prompt.ts` deliberadamente no lo hacen — dos filosofías de integración de IA conviviendo sin una tercera capa que las unifique o las diferencie explícitamente en el código (solo en los docs).

---

## 8. Código muerto

Auditoría verificada por cross-referencia de imports en todo `src/` (no especulación) — la mayor parte del código está efectivamente en uso; la cantidad real de código muerto es baja.

### Componentes
**Ninguno dentro de `src/components/`** — los 27 componentes ahí tienen al menos un importador fuera de sí mismos.

Hay una excepción **fuera** de esa carpeta: **`src/app/proyectos/[id]/producciones/[produccionId]/escena-panel.tsx`** (componente `EscenaPanel`, "Modo Plan"). Verificado con `grep -rn "EscenaPanel"` en todo `src`: aparece únicamente en comentarios (`copiloto-grabar.tsx:207` — *"`EscenaPanel` (Modo Plan) no se toca"*; `produccion-escenas.tsx:99` — *"antes abría `EscenaPanel` acá mismo"*), nunca en un `import`. Es un componente completo, sin ningún punto de entrada activo. Candidato firme a eliminar.

### Páginas/rutas
**Ninguna ruta muerta confirmada.** Los tres candidatos más obvios a primera vista resultaron todos activos:
- `/producciones` (global) — no es redundante con nada dentro de `/proyectos/[id]`, porque **no existe** un listado de Producciones por-proyecto (solo el detalle `[produccionId]/page.tsx`). Es el único listado que existe, enlazado desde `sidebar.tsx` ("Mis videos").
- `/imagenes` — no es una página, es un endpoint API (`route.ts`) usado activamente por `src/lib/imagen-url.ts` para servir blobs privados.
- `/conocimiento` — activa, enlazada desde el Sidebar, pero opera sobre la tabla `documentos` (ver abajo).

### Funciones/utilidades
**Un solo caso confirmado**: `saludoChile()` en `src/lib/fecha.ts:50` — exportada, cero referencias en el resto del código ni en tests. Candidata directa a eliminar.

Todo lo demás verificado con uso real: `useReconocimientoVoz` (`reconocimiento-voz.ts`), `urlImagenVisible` (`imagen-url.ts`, 10 archivos), `explicarError` (`errores.ts`, 22 archivos), `formatearFechaChile`/`formatearFechaPlanificada` (`fecha.ts`), todo `madurez.ts` y todo `calendario.ts`.

### Tabla `conocimiento` — muerta, confirmado
Cero referencias al identificador Drizzle `conocimiento` fuera de `src/db/schema.ts`. Ninguna función de `actions.ts` la toca (ni un `select`, ni un `insert`). Coincide exactamente con lo que su propio comentario admite (`schema.ts:427-428`). Su reemplazo funcional, la tabla `documentos`, tiene CRUD completo activo (`createDocumento`/`updateDocumento`/`deleteDocumento`/`getTodosLosDocumentos` en `actions.ts`) consumido por la pantalla `/conocimiento`.

### Tabla `avatares` — activa, no es código muerto
CRUD completo (`getAvatares`, `getAvatarPorId`, `createAvatar`, `updateAvatar`, `deleteAvatar` en `actions.ts`) llamado desde `identidad/page.tsx` (edición) y `biblioteca/[bloqueId]/editar/page.tsx` (lectura).

### Documentación desatualizada detectada de paso (no es código muerto, pero engaña al leer el schema)
El comentario de `producciones.analisisDirectorCreativoJson`/`estadoAnalisisDirectorCreativo` (`schema.ts:576-578`) dice *"Ninguna pantalla las consume todavía"* — **ya no es cierto**: se usan activamente en `copiloto/[escenaId]/page.tsx` y `copiloto/editar/page.tsx` desde la fase PHASE-2-IMPLEMENTACION-3A/3B del proyecto. Vale la pena limpiar este comentario en la refactorización para que no confunda a quien lea el schema por primera vez.

---

## 9. Complejidad — las 5 zonas más complejas

1. **`src/lib/actions.ts` (2757 líneas, 111 funciones exportadas)** — con enorme diferencia, el punto más complejo del repo. Es el único archivo de Server Actions de toda la aplicación: CRUD de las 15 tablas, más orquestación (importar Blueprint, confirmar Producción, generar Plan de Edición). Cualquier cambio de modelo de datos toca este archivo. No está dividido por dominio — todo vive en un mismo namespace de funciones top-level.
2. **`src/components/revision-blueprint.tsx` (991 líneas)** — un solo componente cliente que combina: resolución de campos pendientes (Personaje/Locación/Plano), el formulario de "pegar respuesta del Director Creativo", el estado de vigente/desactualizado, y el checklist final antes de confirmar. Mezcla varias responsabilidades en un solo archivo sin subdividir.
3. **`src/app/proyectos/[id]/biblioteca/biblioteca-lista.tsx` (1029 líneas)** — la pantalla más larga del repo. Cubre listado, filtros, archivado, papelera y la guía de producción paso a paso (Gemini → animar → CapCut) todo en un mismo componente.
4. **`src/app/proyectos/[id]/producciones/[produccionId]/copiloto/copiloto-grabar.tsx` (720 líneas)** — concentra el formulario de grabación completo de una escena (guion, checklist, recomendaciones del Director con deep-links, selector de modo de creación IA/manual, y el panel "Ver detalles" con todos los campos editables) en un único componente.
5. **`src/db/schema.ts` (701 líneas, 15 tablas)** — no es complejo por lógica sino por acoplamiento: varias tablas comparten claves foráneas hacia `proyectos`/`personajes`/`activos` sin un patrón consistente de cascada (`cascade` vs `set null` mezclados sin una regla documentada por tabla), lo que hace que entender el efecto de borrar cualquier entidad raíz requiera leer el archivo completo.

---

## 10. Diagrama de arquitectura actual

```
┌─────────────────────────────────────────────────────────────────────┐
│                      NAVEGADOR (Next.js App Router)                  │
│  Server Components (páginas) + Client Components (formularios/UI)    │
└───────────────────────────────┬───────────────────────────────────┘
                                 │  llamadas directas a Server Actions
                                 │  (sin capa REST intermedia)
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    src/proxy.ts — gate de autenticación               │
│              (contraseña compartida, cookie de sesión)                │
└───────────────────────────────┬───────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        src/lib/actions.ts                            │
│        (2757 líneas — TODO el CRUD + orquestación de flujos)          │
└──────┬─────────────┬──────────────┬───────────────┬─────────────────┘
       │              │               │                │
       ▼              ▼               ▼                ▼
┌────────────┐ ┌──────────────┐ ┌───────────────┐ ┌──────────────────┐
│  Drizzle    │ │ Compiladores │ │ Motores        │ │ Proveedores de IA │
│  ORM        │ │ de prompt    │ │ determinísticos│ │ (llamada directa) │
│  (schema.ts)│ │ (Nivel A)    │ │ (Nivel B)      │ │                    │
│             │ │ blueprint-   │ │ decision-      │ │ ai-provider.ts     │
│             │ │ prompt.ts    │ │ engine.ts      │ │  → Anthropic SDK   │
│             │ │ director-    │ │ blueprint-     │ │ imagen-provider.ts │
│             │ │ creativo.ts  │ │ parser.ts      │ │  → OpenAI SDK      │
│             │ │ identity-    │ │ similitud.ts   │ │                    │
│             │ │ compiler.ts  │ │ estimacion-    │ │                    │
│             │ │              │ │ duracion.ts    │ │                    │
└──────┬──────┘ └──────┬───────┘ └───────┬────────┘ └─────────┬─────────┘
       │                │  (el usuario copia/pega              │
       │                │   afuera y afuera, Content OS         │
       │                │   nunca ve esa IA)                    │
       ▼                ▼                                       ▼
┌────────────┐  ┌──────────────────┐                  ┌──────────────────┐
│   Neon      │  │  IA EXTERNA        │                  │  Anthropic /      │
│  Postgres   │  │  (ChatGPT/Claude/  │                  │  OpenAI (API      │
│  (15 tablas)│  │  Gemini, la que    │                  │  directa desde    │
│             │  │  el usuario elija) │                  │  el servidor)     │
└────────────┘  └──────────────────┘                  └──────────────────┘

                                                        ┌──────────────────┐
                                                        │  Vercel Blob      │
                                                        │  (archivos        │
                                                        │  subidos) — se    │
                                                        │  sirven vía       │
                                                        │  /imagenes proxy  │
                                                        └──────────────────┘
```

**Lectura del diagrama**: hay dos caminos de IA completamente distintos operando en paralelo — el de la derecha (llamada directa, servidor→proveedor) y el del centro (Content OS arma el prompt, el usuario lo lleva afuera). No hay una capa que los unifique; el módulo que use cada uno depende de en qué fase del proyecto se escribió esa función (ver sección 7).

---

## Resumen ejecutivo para priorizar la refactorización

Lo que este informe encontró como más accionable, de mayor a menor impacto:

1. **`src/lib/actions.ts` (2757 líneas / 111 funciones)** es el cuello de botella estructural del proyecto — cualquier refactorización seria debería empezar por dividirlo en módulos por dominio (Proyectos, Identidad, Producción, Biblioteca, etc.) antes de tocar cualquier otra cosa.
2. **Tres piezas de código muerto verificadas y de bajo riesgo para eliminar ya**: la tabla `conocimiento`, el componente `EscenaPanel` (`escena-panel.tsx`), y la función `saludoChile()`.
3. **Redundancia de datos con eliminación segura**: las columnas "capa Personaje" y `avatarJson` de `identidades`, ambas ya marcadas como deprecadas en el propio código y sin escrituras activas detectadas.
4. **Inconsistencia arquitectónica a resolver conscientemente** (no a "arreglar" sin decidir primero): dos patrones de integración de IA conviviendo (`ai-provider.ts`/`imagen-provider.ts` de llamada directa vs. el patrón Nivel A de copiar-y-pegar). Antes de refactorizar, vale la pena decidir si migrar todo a un solo patrón o formalizar la coexistencia.
5. **Documentación desactualizada** en `schema.ts` sobre `analisisDirectorCreativoJson` — de bajo riesgo pero fácil de arreglar de paso.
