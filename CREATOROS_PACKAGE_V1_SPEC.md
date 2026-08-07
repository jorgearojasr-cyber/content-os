# CreatorOS Production Package v1.0 — Especificación funcional

> CONTENT OS V2 — SPRINT 2, corregido en Sprint 3. Documento de solo
> diseño — **no se modificó código, no se crearon tablas, no se hicieron
> migraciones, no se implementó el importador.** Esta especificación es
> intencionalmente independiente de Content OS: define un contrato que
> cualquier herramienta de IA puede producir y cualquier aplicación
> cliente puede consumir, hoy Content OS, mañana cualquier otra.
>
> **Historial de revisión**: v1.0 draft (Sprint 2) se llamaba "CreatorOS
> Package". Sprint 3 lo renombró a **"CreatorOS Production Package"** y
> agregó `packageId`, `createdBy` y `metadata` a la raíz — como todavía no
> existe ningún cliente implementado contra el draft anterior, esto se
> trata como corrección del mismo v1.0, no como un salto de versión.

---

## 0. Qué es el CreatorOS Production Package

Un documento **plano, versionado, autodescriptivo** que representa **una
Producción audiovisual completa** — su guion, sus recursos necesarios, su
miniatura y su intención de publicación — generado por una IA conversacional
(hoy ChatGPT, en principio cualquiera) fuera de la aplicación cliente, y
transportado como texto para que el cliente lo importe.

No es un formato de Content OS. Es un **contrato**: el productor (la IA) no
necesita saber nada de cómo un cliente particular guarda sus datos; el
cliente no necesita saber nada de cómo la IA llegó a ese contenido. Solo
comparten el contrato.

### Formato de transporte

- **JSON estricto** (UTF-8, sin comentarios, un único objeto raíz). Se eligió
  JSON sobre Markdown estructurado porque el paquete debe ser
  **máquina-validable** de punta a punta (sección 5) — un formato
  semiestructurado como el CBD actual de Content OS sirve para que un humano
  lo escriba a mano, pero un contrato entre sistemas necesita un parser
  determinístico sin ambigüedad.
- Se transmite como un bloque de código ` ```json ` cuando el canal es una
  conversación de chat (mismo patrón que Content OS ya usa hoy para el
  Director Creativo y el Plan de Edición) — pero el formato en sí no depende
  de ese canal: el mismo JSON podría llegar por upload de archivo, por
  `POST` a una API, o por cualquier otro medio. El contrato es el contenido,
  no el transporte.

---

## 1. Estructura raíz

```json
{
  "creatorOSPackage": "1.0",
  "packageId": "string (UUID)",
  "createdBy": {
    "herramienta": "string",
    "modelo": "string | null",
    "fecha": "string (ISO-8601)"
  },
  "metadata": { ... },
  "produccion": { ... },
  "escenas": [ ... ],
  "recursos": [ ... ],
  "miniatura": { ... } | null,
  "publicacion": { ... } | null
}
```

Cinco secciones de contenido, alineadas 1 a 1 con los 5 dominios definidos
en el Sprint 1 (Producción / Escenas / Recursos / Miniatura / Publicación).
`packageId`, `createdBy` y `metadata` son metadata de identidad y
trazabilidad del paquete — nunca contenido de producción.

**`packageId` no es un id de base de datos de ningún cliente.** Es un UUID
generado por el productor (la IA) al crear el paquete, único por cada
generación — dos regeneraciones del mismo guion son dos `packageId`
distintos. Su único propósito es permitir que un cliente detecte "este
paquete exacto ya lo vi antes" (sección 8 de la RFC-002). Ningún campo del
paquete, en ninguna sección, puede depender de un id interno de la base de
datos de ningún cliente — esa es una regla dura del estándar, no solo de
`packageId`.

`metadata` es un objeto **abierto y libre**, sin campos predefinidos —
espacio para que el productor incluya contexto adicional que todavía no
tiene un campo propio en el contrato (ej. idioma, notas del generador,
referencias externas). Ningún cliente debe fallar al encontrar `metadata`
vacío (`{}`) ni al encontrar claves que no reconoce dentro de él.

---

## 2. Campos obligatorios y opcionales

### 2.1 Raíz del paquete

| Campo | Oblig. | Tipo | Notas |
|---|---|---|---|
| `creatorOSPackage` | **Sí** | string | Versión del contrato (sección 3). Todo lo demás depende de que este campo exista y sea reconocible primero. |
| `packageId` | **Sí** | string (UUID) | Identidad única de esta generación del paquete — nunca un id de base de datos de ningún cliente (ver nota arriba). |
| `createdBy.herramienta` | **Sí** | string | Ej. `"ChatGPT"`. Libre — el estándar no mantiene una lista cerrada de herramientas válidas. |
| `createdBy.modelo` | No | string \| null | Informativo, nunca usado para validar nada. |
| `createdBy.fecha` | **Sí** | string ISO-8601 | Cuándo se generó el paquete — no cuándo se importa. |
| `metadata` | No | objeto, puede ser `{}` | Libre, sin campos predefinidos — ver nota arriba. |
| `produccion` | **Sí** | objeto | Exactamente una Producción por paquete. Un paquete nunca describe más de una Producción — si un usuario tiene varias, son varios paquetes. |
| `escenas` | **Sí** | array, mínimo 1 | Un paquete sin escenas no es una Producción, es una idea suelta — fuera del alcance de este contrato. |
| `recursos` | No | array, puede ser `[]` | Una Producción puede no necesitar recursos adicionales. |
| `miniatura` | No | objeto \| `null` | Entidad independiente (Sprint 1, decisión "Miniatura no depende del documento completo") — puede omitirse y agregarse después, en otro paquete o directo en el cliente. |
| `publicacion` | No | objeto \| `null` | Igual que miniatura: la intención de publicación puede no existir todavía al momento de generar el paquete. |

### 2.2 `produccion`

| Campo | Oblig. | Tipo |
|---|---|---|
| `titulo` | **Sí** | string, no vacío |
| `formato` | **Sí** | string (enum abierto — ver sección 5, regla 6) |
| `ideaCentral` | **Sí** | string, no vacío |
| `objetivoGeneral` | No | string |
| `objetivoEspectador` | No | string |
| `publicoObjetivo` | No | string |
| `duracionEstimadaSegundos` | No | number |
| `contexto` | No | string |
| `notas` | No | string |
| `recursosGlobales.musicaPrincipal` | No | string |
| `recursosGlobales.intro` | No | string |
| `recursosGlobales.outro` | No | string |

### 2.3 `escenas[]` (cada elemento)

| Campo | Oblig. | Tipo |
|---|---|---|
| `numero` | **Sí** | integer ≥ 1, único dentro del paquete |
| `tipo` | **Sí** | string (enum abierto — ver sección 5, regla 6) |
| `objetivoNarrativo` | **Sí** | string, no vacío |
| `textoHablado` | No | string |
| `textoPantalla` | No | string |
| `duracionEstimadaSegundos` | No | number |
| `personajes` | No | array de string (nombres libres) |
| `locacion` | No | string (nombre libre) |
| `plano` | No | string (nombre libre) |
| `movimientoCamara` | No | string |
| `recursosNecesarios` | No | array de string (nombres libres — pueden o no coincidir con `recursos[].nombre`, ver sección 5, regla 7) |
| `musica` | No | string |
| `transicion` | No | string |
| `notas` | No | string |

### 2.4 `recursos[]` (cada elemento)

| Campo | Oblig. | Tipo |
|---|---|---|
| `nombre` | **Sí** | string, no vacío |
| `tipo` | **Sí** | string (enum abierto — ver sección 5, regla 6) |
| `valor` | No | string — según `tipo`: URL, hex de color, texto de un prompt, etc. |
| `notas` | No | string |
| `etiquetas` | No | array de string |

El paquete **nunca transporta binarios** — solo referencias (URLs) o texto.
Los archivos reales los sube el cliente por su cuenta.

### 2.5 `miniatura` (objeto, si está presente)

| Campo | Oblig. | Tipo |
|---|---|---|
| `descripcion` | **Sí** (si `miniatura` no es `null`) | string, no vacío — qué debe representar la miniatura |
| `promptVisual` | No | string — prompt listo para generar la imagen en una IA de imagen, si aplica |
| `textoEnMiniatura` | No | string |
| `referenciaVisual` | No | string (URL) |
| `variantes` | No | array de `{ descripcion: string, promptVisual?: string }` — hasta 3 variantes propuestas |

### 2.6 `publicacion` (objeto, si está presente)

| Campo | Oblig. | Tipo |
|---|---|---|
| `fechaPlanificada` | No | string (fecha ISO `YYYY-MM-DD`) |
| `plataformas` | No | array de string (enum abierto — Instagram, TikTok, YouTube, etc.) |
| `copy` | No | string — el texto/caption propuesto |
| `hashtags` | No | array de string |
| `cta` | No | string |

**El paquete transporta intención de publicación, nunca la ejecuta.** Ningún
cliente debe interpretar la presencia de `publicacion` como una orden de
publicar automáticamente — es información para que un humano decida.

---

## 3. Versionado del paquete

- `creatorOSPackage` es una cadena `"MAJOR.MINOR"` (ej. `"1.0"`, `"1.3"`).
  No se usa un tercer número de parche — un paquete es un documento
  generado una vez, no un software que recibe parches.
- **MAJOR** cambia únicamente cuando se rompe compatibilidad hacia atrás
  (se elimina o renombra un campo obligatorio, cambia el tipo de un campo
  existente, cambia la estructura raíz). Un cliente que solo entiende
  `"1.x"` **debe rechazar** un paquete `"2.x"` con un error explícito, nunca
  intentar interpretarlo a medias.
- **MINOR** solo puede **agregar** campos opcionales nuevos. Nunca elimina
  ni cambia el significado de un campo existente. Un cliente que solo
  conoce `"1.0"` debe poder leer un paquete `"1.4"` ignorando los campos que
  no reconoce — nunca fallar por un campo desconocido.
- Regla de compatibilidad para cualquier cliente: **comparar únicamente el
  MAJOR**. Ignorar el MINOR para decidir si se puede procesar el paquete;
  usarlo solo para saber qué campos opcionales adicionales podrían existir.
- `1.0` es la línea base de este documento. No existe ninguna versión previa
  publicada.

---

## 4. Mapa de importación

Cómo cada sección del paquete se traduce conceptualmente al importarse —
**sin asumir el esquema interno de ningún cliente particular**:

| Sección del paquete | Se traduce en el cliente a... | Notas de independencia tecnológica |
|---|---|---|
| `produccion` | Una entidad "Producción" (o su equivalente — un cliente distinto podría llamarla "Proyecto de video", "Job", etc.) | El paquete no dicta el nombre de tabla ni de entidad del cliente. |
| `escenas[]` | Una colección ordenada de "Escenas" ligadas a esa Producción | `numero` es la posición narrativa **con la que nació la escena en el paquete** — un cliente que permita reordenar debe tratar `numero` como un dato de origen, no como la posición visible actual (mismo principio que Content OS ya aplica internamente hoy con `numeroEnAnalisisDirector`, generalizado acá como regla del estándar). |
| `recursos[]` | Entidades reutilizables tipo "Recurso"/"Activo" | Los `nombre` de `recursos[]` y los `personajes`/`locacion`/`recursosNecesarios` de cada escena son **texto libre**, no ids — cada cliente decide cómo (o si) los resuelve contra su propia biblioteca. El paquete nunca asume que esa resolución ya ocurrió. |
| `miniatura` | Una entidad "Miniatura" independiente, enlazada a la Producción | Puede llegar en este mismo paquete o en un paquete posterior — el paquete de Producción no depende de tener miniatura para ser válido. |
| `publicacion` | Metadata de intención de publicación sobre la Producción | Un cliente puede no tener ningún concepto de "publicación" todavía (como Content OS hoy) — el campo es opcional exactamente por eso. |

---

## 5. Reglas de validación

1. **Versión reconocible primero.** Si `creatorOSPackage` falta, no es
   string, o su MAJOR no es soportado por el cliente → rechazar antes de
   validar cualquier otra cosa, con un mensaje que identifique la versión
   recibida vs. las soportadas.
2. **`packageId` presente y con forma de UUID.** Sin `packageId` no hay
   forma de detectar reimportaciones (sección 8 de la RFC-002) — es
   obligatorio igual que la versión, se valida en el mismo paso temprano.
3. **JSON bien formado.** Un único objeto raíz, JSON estricto (sin
   comentarios, sin trailing commas). Si falla el parseo → error genérico
   de formato, no intentar "adivinar" ni reparar el JSON.
4. **Campos obligatorios presentes y no vacíos** — según las tablas de la
   sección 2. Cada campo obligatorio faltante o vacío es un error
   **específico** (identifica el campo, ej. `"produccion.titulo es
   obligatorio"`), nunca un error genérico de "paquete inválido" sin más
   contexto.
5. **`escenas` no vacío, `numero` sin duplicados.** Los números no
   necesitan ser correlativos sin huecos (aunque se recomienda 1..N), pero
   ningún paquete puede tener dos escenas con el mismo `numero`.
6. **Enums abiertos, nunca cierran el paquete.** `formato`, `tipo` de
   escena, `tipo` de recurso, `plataformas` son listas de valores
   *sugeridos*, no una lista cerrada. Un cliente que reciba un valor que no
   reconoce debe tratarlo como "otro"/valor libre y **seguir procesando el
   paquete** — nunca rechazarlo por un enum desconocido. Esto es lo que
   permite que una IA proponga un tipo de escena nuevo sin romper clientes
   ya construidos.
7. **Las referencias cruzadas no se validan como error.** Que
   `escenas[].recursosNecesarios` mencione un nombre que no aparece en
   `recursos[]` (o viceversa) **no invalida el paquete** — es texto libre
   que el cliente resuelve más tarde, con su propio criterio (ej. Content
   OS ya tiene un motor de similitud para esto). El estándar solo exige que
   el paquete sea internamente consistente en su propia estructura, nunca
   que sus referencias por nombre ya estén resueltas.
8. **Sin contenido ejecutable.** Ningún campo de texto debe contener HTML ni
   scripts — el estándar recomienda que el productor no los incluya, y
   exige que todo cliente sanitice cualquier texto del paquete antes de
   renderizarlo, sin excepción.
9. **Confirmación humana antes de persistir.** La validación técnica exitosa
   nunca es suficiente para guardar el paquete automáticamente — todo
   cliente debe mostrar una vista previa y esperar confirmación explícita
   del usuario (mismo principio "automático nunca silencioso" que ya rige
   Content OS, elevado acá a regla del estándar, no una particularidad de
   esta app).

---

## 6. Diagrama del flujo de importación

```
┌─────────────────────────────┐
│   ChatGPT (o cualquier IA)   │
└──────────────┬───────────────┘
               │ genera
               ▼
┌────────────────────────────────────────────────┐
│   CreatorOS Production Package v1 (JSON)         │
│   { creatorOSPackage, packageId, createdBy,      │
│     metadata, produccion, escenas[], recursos[], │
│     miniatura, publicacion }                     │
└──────────────┬─────────────────────────────────┘
               │ el usuario copia/pega o sube el archivo
               ▼
┌─────────────────────────────────────────────────────┐
│                CLIENTE (Content OS u otro)            │
│                                                         │
│  1. ¿Versión reconocible y MAJOR soportado?             │
│         │ no ──────────────► rechazar (error de versión)│
│         │ sí                                            │
│  2. ¿JSON bien formado?                                 │
│         │ no ──────────────► rechazar (error de formato)│
│         │ sí                                            │
│  3. ¿Campos obligatorios presentes? (sección 2)          │
│         │ no ──────────────► rechazar (error por campo) │
│         │ sí                                            │
│  4. Resolver nombres libres (personajes/locación/        │
│     recursos) contra la biblioteca propia del cliente    │
│     — coincidencias quedan resueltas, el resto queda     │
│     pendiente de resolución manual (no bloquea nada)      │
│         │                                                │
│  5. Vista previa al usuario — nunca se persiste sin       │
│     confirmación explícita                                │
│         │ usuario confirma                                │
│         ▼                                                │
│  6. Persistir en el modelo de datos PROPIO del cliente     │
│     (el paquete nunca dicta ese esquema)                   │
└─────────────────────────────────────────────────────┘
```

---

## Principios que mantienen el estándar independiente de la tecnología

1. **Nunca asume el esquema interno de ningún cliente** — usa nombres y
   tipos de dominio, no columnas de base de datos.
2. **Toda referencia entre entidades es por nombre libre**, nunca por id
   interno de ninguna aplicación — cada cliente decide cómo resolverlas.
3. **Enums abiertos** — un valor no reconocido nunca invalida el paquete,
   permite que la IA productora evolucione sin coordinar con cada cliente.
4. **El paquete es plano y serializable** — sin funciones, sin referencias
   circulares, transportable como texto puro por cualquier canal.
5. **Confirmación humana explícita siempre**, antes de cualquier
   persistencia — ningún cliente conforme al estándar puede saltarse este
   paso.
6. **Versionado por compatibilidad, no por fecha** — un cliente decide qué
   procesar comparando el MAJOR, nunca "si es reciente".

---

*Fuera de alcance de este Sprint (según lo indicado): no se implementó el
importador, no se tocó código, no se crearon tablas ni migraciones. Esta
especificación es la única fuente para diseñar el importador cuando se
autorice.*
