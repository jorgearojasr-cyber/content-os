import { sql } from "drizzle-orm";
import { jsonb, pgTable, text } from "drizzle-orm/pg-core";

/**
 * Un Proyecto es el contenedor superior (OBRABIEN, INJAR, futuros).
 * Todo lo demás cuelga de un proyecto y nunca se mezcla entre proyectos.
 */
export const proyectos = pgTable("proyectos", {
  id: text("id").primaryKey(),
  nombre: text("nombre").notNull(),
  descripcion: text("descripcion").notNull().default(""),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()`),
});

/**
 * Identidad: el núcleo del producto. Una por proyecto (relación 1 a 1).
 * Se divide en tres capas: Marca, Personaje, Estilo.
 */
export const identidades = pgTable("identidades", {
  id: text("id").primaryKey(),
  proyectoId: text("proyecto_id")
    .notNull()
    .unique()
    .references(() => proyectos.id, { onDelete: "cascade" }),

  // Capa Marca
  voz: text("voz").notNull().default(""),
  reglas: text("reglas").notNull().default(""),
  objetivo: text("objetivo").notNull().default(""),
  // Avatar del cliente ideal (ver AvatarCliente en types.ts)
  avatarJson: jsonb("avatar_json").notNull().default({}),

  // Capa Personaje
  personajeNombre: text("personaje_nombre").notNull().default(""),
  personajePersonalidad: text("personaje_personalidad").notNull().default(""),
  fisica: text("fisica").notNull().default(""),
  vestuario: text("vestuario").notNull().default(""),
  vozDescrita: text("voz_descrita").notNull().default(""),
  gestos: text("gestos").notNull().default(""),
  muletillas: text("muletillas").notNull().default(""),
  // Arreglo de hasta 4 URLs de Blob — reemplaza a la antigua `fotoUrl`
  // (columna única). Ver `parseFotosPersonaje` en types.ts.
  fotosUrlsJson: jsonb("fotos_urls_json").notNull().default([]),

  // Capa Estilo
  paleta: text("paleta").notNull().default(""),
  tipografia: text("tipografia").notNull().default(""),
  look: text("look").notNull().default(""),
  camara: text("camara").notNull().default(""),
  ritmo: text("ritmo").notNull().default(""),
  estructuraCta: text("estructura_cta").notNull().default(""),
  logoUrl: text("logo_url").notNull().default(""),

  // Contacto (opcional) — nunca se incluye en el Compilador por defecto,
  // solo cuando se activa explícitamente al crear (ver Mejora 3).
  sitioWeb: text("sitio_web").notNull().default(""),
  telefono: text("telefono").notNull().default(""),
  direccion: text("direccion").notNull().default(""),

  updatedAt: text("updated_at")
    .notNull()
    .default(sql`now()`),
});

/**
 * Personaje: quién aparece en el contenido, si aplica. Antes vivía como
 * columnas únicas dentro de `identidades` (relación 1 a 1); ahora es su
 * propia tabla porque un proyecto puede tener varios personajes (varias
 * filas por `proyectoId`) y elegir cuál usar en cada pieza. Las columnas
 * equivalentes en `identidades` (personajeNombre, fisica, etc.) quedan
 * deprecadas — se conservan por ahora, sin usarse.
 */
export const personajes = pgTable("personajes", {
  id: text("id").primaryKey(),
  proyectoId: text("proyecto_id")
    .notNull()
    .references(() => proyectos.id, { onDelete: "cascade" }),
  nombre: text("nombre").notNull().default(""),
  personalidad: text("personalidad").notNull().default(""),
  fisica: text("fisica").notNull().default(""),
  vestuario: text("vestuario").notNull().default(""),
  vozDescrita: text("voz_descrita").notNull().default(""),
  gestos: text("gestos").notNull().default(""),
  muletillas: text("muletillas").notNull().default(""),
  // Arreglo de hasta 4 URLs de Blob — mismo formato que la antigua columna
  // `identidades.fotos_urls_json`, ahora colgando del Personaje dueño.
  fotosUrlsJson: jsonb("fotos_urls_json").notNull().default([]),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()`),
});

/**
 * Avatar del cliente ideal: quién recibe el contenido, no quién lo crea
 * (eso es Personaje). Antes vivía serializado en `identidades.avatar_json`
 * (uno solo por proyecto); ahora es su propia tabla — un proyecto puede
 * tener varios avatares (varios segmentos de audiencia) y elegir cuál usar
 * en cada pieza. `identidades.avatar_json` queda deprecada.
 */
export const avatares = pgTable("avatares", {
  id: text("id").primaryKey(),
  proyectoId: text("proyecto_id")
    .notNull()
    .references(() => proyectos.id, { onDelete: "cascade" }),
  // Doble uso: dato de la ficha Y título de la tarjeta en la lista.
  nombreFicticio: text("nombre_ficticio").notNull().default(""),
  edad: text("edad").notNull().default(""),
  profesion: text("profesion").notNull().default(""),
  nivelConocimiento: text("nivel_conocimiento").notNull().default(""),
  problemasFrecuentes: text("problemas_frecuentes").notNull().default(""),
  objetivos: text("objetivos").notNull().default(""),
  miedos: text("miedos").notNull().default(""),
  queBuscaAprender: text("que_busca_aprender").notNull().default(""),
  comoConsumeContenido: text("como_consume_contenido").notNull().default(""),
  lenguaje: text("lenguaje").notNull().default(""),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()`),
});

/**
 * Bloque: una pieza de contenido guardada en la Biblioteca.
 * En la Fase 1 se crean a mano (sin IA); guardamos también el bloque de
 * identidad compilado en el momento de creación, como evidencia de que
 * el Compilador se usó y de qué produjo exactamente.
 */
export const bloques = pgTable("bloques", {
  id: text("id").primaryKey(),
  proyectoId: text("proyecto_id")
    .notNull()
    .references(() => proyectos.id, { onDelete: "cascade" }),
  // Qué Personaje estaba seleccionado al generar esta pieza — permite que
  // la generación de imagen (más tarde, desde Biblioteca) use la foto de
  // referencia correcta. Null si se creó sin Personaje o antes de que
  // existiera esta columna.
  personajeId: text("personaje_id").references(() => personajes.id, { onDelete: "set null" }),
  titulo: text("titulo").notNull(),
  formato: text("formato").notNull().default("manual"),
  texto: text("texto").notNull(),
  identidadCompilada: text("identidad_compilada").notNull().default(""),
  // 'activo' | 'archivado' | 'papelera'
  estado: text("estado").notNull().default("activo"),
  // ISO string de cuándo se movió a la papelera; "" si no está eliminado
  eliminadoAt: text("eliminado_at").notNull().default(""),
  // Arreglo de Escena (ver Escena en types.ts); null si el bloque no tiene
  // desglose estructurado (creado a mano, o formato sin escenas). Permite
  // editar y regenerar por escena más adelante.
  escenasJson: jsonb("escenas_json"),
  // Plan de Edición (ver PlanEdicion en types.ts); null hasta que el
  // usuario presiona "Generar Plan de Edición" — se genera una sola vez y
  // se conserva, no se recalcula en cada visita.
  planEdicionJson: jsonb("plan_edicion_json"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()`),
});

/**
 * Activos: recursos reutilizables de un proyecto (logos, fotos, videos,
 * música, íconos, tipografías, colores, prompts, voz, documentos).
 * `valor` guarda una ruta de archivo subido, una URL, o texto libre
 * (hex de color, prompt, etc.) según el `tipo`.
 */
export const activos = pgTable("activos", {
  id: text("id").primaryKey(),
  proyectoId: text("proyecto_id")
    .notNull()
    .references(() => proyectos.id, { onDelete: "cascade" }),
  tipo: text("tipo").notNull(),
  nombre: text("nombre").notNull(),
  valor: text("valor").notNull().default(""),
  notas: text("notas").notNull().default(""),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()`),
});

/**
 * Segundo Cerebro: apuntes rápidos, de fricción cero — no requieren ni
 * título ni proyecto. `proyectoId` es nullable a propósito: una idea se
 * puede anotar antes de saber a qué proyecto pertenece, y vincularla
 * después es siempre una acción manual del usuario (la IA nunca decide
 * esto sola). Si el proyecto vinculado se borra, la nota no desaparece —
 * solo se desvincula (onDelete: "set null").
 */
export const notas = pgTable("notas", {
  id: text("id").primaryKey(),
  texto: text("texto").notNull(),
  proyectoId: text("proyecto_id").references(() => proyectos.id, { onDelete: "set null" }),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()`),
});

/**
 * Base de Conocimiento: material de referencia por proyecto (a diferencia
 * de las notas del Segundo Cerebro, siempre pertenece a un proyecto).
 * Solo texto plano en esta fase — sin archivos adjuntos.
 */
export const conocimiento = pgTable("conocimiento", {
  id: text("id").primaryKey(),
  proyectoId: text("proyecto_id")
    .notNull()
    .references(() => proyectos.id, { onDelete: "cascade" }),
  titulo: text("titulo").notNull(),
  contenido: text("contenido").notNull().default(""),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()`),
});
