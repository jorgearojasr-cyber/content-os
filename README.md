# Content OS — Estudio creativo personal

Estudio creativo personal: gestión de proyectos con identidad propia, generación de
contenido asistida por IA, biblioteca con papelera de reciclaje, activos reutilizables
y un dashboard de inicio.

## Qué incluye

- **Dashboard de inicio** (`/`) — proyectos recientes, contenido reciente y acceso
  rápido para continuar donde quedaste.
- **Selector de proyectos** — crear y listar proyectos (`/proyectos`).
- **Pantalla Identidad** — Marca (voz, reglas, objetivo del proyecto), Avatar del
  cliente ideal, Personaje y Estilo. Cada campo tiene tips, ejemplos reales y chips
  de relleno rápido. Incluye **✨ Generar personaje automáticamente** y
  **✨ Completar con IA** (requieren una API key de Anthropic, ver abajo).
- **Pantalla Crear** — creación manual de piezas + vista previa en vivo de lo que el
  Compilador de Identidad produce.
- **Biblioteca** — todo lo guardado, por proyecto, con menú de acciones (ver/editar,
  duplicar, renombrar, mover a otro proyecto, archivar, eliminar) y vistas de
  **Archivados** y **Papelera** (retención de 7 días antes de purgarse para siempre).
- **Activos** — logos, fotos, videos, música, íconos, tipografías, colores, prompts,
  voz y documentos reutilizables por proyecto, con subida de archivos.
- **Subida de imágenes** — la foto de referencia del personaje admite arrastrar y
  soltar, pegar desde el portapapeles (Ctrl+V), elegir un archivo o pegar una URL.
- **Compilador de Identidad** (`src/lib/identity-compiler.ts`) — función pura y
  determinística, con pruebas automatizadas (`npm test`). Es el bloque de texto
  exacto que se antepone a cada generación con IA.
- Persistencia real en SQLite (archivo local `content-os.db`, no requiere cuenta
  ni servicio externo).
- Diseño responsive, oscuro/dorado, mobile-first.

## Cómo correrlo

Requiere Node.js 20 o superior.

```bash
npm install
npm run db:push     # crea/actualiza las tablas en content-os.db
npm run dev          # http://localhost:3000
```

### Activar las funciones de IA (opcional)

Las funciones de IA (generar personaje, completar identidad) usan la API de Claude
(Anthropic). Sin configurarla, el resto de la app funciona igual — solo esos botones
mostrarán un mensaje explicando qué falta.

1. Crea una cuenta en [console.anthropic.com](https://console.anthropic.com) y genera
   una API key.
2. Crea un archivo `.env.local` en `content-os/` con:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   # Opcional, por defecto usa claude-opus-4-8
   ANTHROPIC_MODEL=claude-opus-4-8
   ```

Para verificar el Compilador de Identidad:

```bash
npm test
```

Para probar el build de producción real (el mismo que se usaría al desplegar):

```bash
npm run build
npm start
```

## Decisiones técnicas

- **Next.js 16 (App Router) + Server Actions** — sin API REST intermedia; los
  formularios llaman directo a funciones del servidor (`src/lib/actions.ts`).
- **SQLite vía Drizzle ORM**, no Prisma — se evaluó Prisma primero, pero sus
  binarios de motor no se pudieron descargar en el entorno de desarrollo. Drizzle
  + `better-sqlite3` compila localmente y no depende de eso. El esquema
  (`src/db/schema.ts`) es simple de migrar a Postgres/Supabase más adelante.
- **`@anthropic-ai/sdk` con structured outputs (Zod)** para las funciones de IA
  (`src/lib/ai.ts`) — la IA nunca guarda directo en la base de datos: solo prellena
  el formulario de Identidad, y el usuario confirma con "Guardar identidad".
- **Papelera con purga perezosa** (al leer, no con un cron) — no hay proceso en
  segundo plano en una app Next.js local.
- **Un objeto Identidad por proyecto** (relación 1 a 1), tal como quedó definido
  en el Blueprint v1.0 / Estudio Personal v1.1.
- **Sin autenticación todavía** — no estaba en el alcance pedido para esta fase.
  Se agrega cuando el proyecto se despliegue fuera de tu máquina.

## Lo que NO está todavía (a propósito)

Segundo Cerebro, Base de Conocimiento, investigación automática, integraciones
externas, publicación, automatizaciones. Eso queda para una fase posterior.

## Estructura

```
src/
  app/
    page.tsx                       # dashboard de inicio
    proyectos/
      page.tsx                     # selector + creación
      [id]/
        layout.tsx                 # navegación por pestañas
        identidad/
          page.tsx
          ai-tools.tsx              # botones de generación con IA
        crear/page.tsx
        biblioteca/
          page.tsx                  # vistas activos/archivados/papelera
          biblioteca-lista.tsx
          [bloqueId]/editar/page.tsx
        activos/
          page.tsx
          nuevo-activo-form.tsx
          activos-lista.tsx
  components/
    ui.tsx                          # componentes visuales compartidos
    action-menu.tsx                 # menú ⋮ de acciones
    confirm-dialog.tsx              # diálogos de confirmación/prompt/select
    file-uploader.tsx               # drag&drop, paste, subida de archivos
    field-with-help.tsx             # campo con tip + ejemplos rápidos
  db/
    schema.ts                       # Proyecto, Identidad, Bloque, Activo
    index.ts                        # cliente de base de datos
  lib/
    types.ts
    identity-compiler.ts            # el núcleo del producto
    identity-compiler.test.ts
    identidad-ejemplos.ts           # tips y ejemplos de la pantalla Identidad
    actions.ts                      # todo el CRUD + acciones de IA (Server Actions)
    ai.ts                           # llamadas a la API de Anthropic
    storage.ts                      # guardado de archivos subidos
```
