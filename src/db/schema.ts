import { sql } from "drizzle-orm";
import { integer, jsonb, pgTable, text } from "drizzle-orm/pg-core";

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
  // Expansión "Creative OS": la marca como entidad completa. Todos con
  // default "" — las identidades existentes siguen funcionando sin tocar.
  // NOTA de mapeo (no duplicar campos): "personalidad"/"tono" viven en
  // `voz` ("Voz y personalidad"); "objetivos" en `objetivo`; la audiencia
  // ESTRUCTURADA vive en la tabla `avatares` — `audiencia` acá es el
  // resumen libre de a quién le habla la marca en general.
  historia: text("historia").notNull().default(""),
  valores: text("valores").notNull().default(""),
  audiencia: text("audiencia").notNull().default(""),
  competidores: text("competidores").notNull().default(""),
  // Manual de marca: texto con los lineamientos oficiales, o un link al
  // documento (Drive/PDF/Notion) si vive fuera de la app.
  manualMarca: text("manual_marca").notNull().default(""),
  // Lineamientos de contenido — se compilan en su propia sección.
  ctaHabituales: text("cta_habituales").notNull().default(""),
  hashtagsFrecuentes: text("hashtags_frecuentes").notNull().default(""),
  restricciones: text("restricciones").notNull().default(""),
  // Ronda "entrenamiento permanente de marca". Mapeo anti-duplicación:
  // personalidad/tono ya viven en `voz`; qué jamás haría en `restricciones`;
  // objetivos de largo plazo en `objetivo`; principios editoriales en
  // `reglas`; identidad visual resumida en `look`. Todos con default ""
  // — las identidades existentes no cambian su salida compilada.
  // -- Esencia --
  promesa: text("promesa").notNull().default(""),
  posicionamiento: text("posicionamiento").notNull().default(""),
  // Uno de ARQUETIPOS_MARCA (types.ts) — select fijo, "" = sin definir.
  arquetipo: text("arquetipo").notNull().default(""),
  manifiesto: text("manifiesto").notNull().default(""),
  // -- Audiencia --
  emociones: text("emociones").notNull().default(""),
  impactoEsperado: text("impacto_esperado").notNull().default(""),
  adaptacionAudiencia: text("adaptacion_audiencia").notNull().default(""),
  // -- Voz y estilo (formalidad/humor/nivelTecnico: selects fijos de
  //    types.ts; palabras*: listas separadas por coma, editadas como chips) --
  formalidad: text("formalidad").notNull().default(""),
  humor: text("humor").notNull().default(""),
  nivelTecnico: text("nivel_tecnico").notNull().default(""),
  palabrasSiempre: text("palabras_siempre").notNull().default(""),
  palabrasNunca: text("palabras_nunca").notNull().default(""),
  frasesCaracteristicas: text("frases_caracteristicas").notNull().default(""),
  // -- Contenido --
  estructuraContenidos: text("estructura_contenidos").notNull().default(""),
  respuestaCriticas: text("respuesta_criticas").notNull().default(""),
  // -- Límites --
  diferenciadores: text("diferenciadores").notNull().default(""),
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
  // Nullable: null = "Personaje del estudio", reutilizable en cualquier
  // proyecto (no pertenece a ninguno). Con un proyecto asignado, sigue
  // siendo el Personaje de ESE proyecto únicamente, como antes.
  proyectoId: text("proyecto_id").references(() => proyectos.id, { onDelete: "cascade" }),
  nombre: text("nombre").notNull().default(""),
  personalidad: text("personalidad").notNull().default(""),
  fisica: text("fisica").notNull().default(""),
  vestuario: text("vestuario").notNull().default(""),
  vozDescrita: text("voz_descrita").notNull().default(""),
  gestos: text("gestos").notNull().default(""),
  muletillas: text("muletillas").notNull().default(""),
  // Expansión "Creative OS": el Personaje como entidad completa. Todos con
  // default "" — los Personajes existentes (y sus fotos) siguen intactos.
  // NOTA de mapeo: "forma de hablar" ya vive en vozDescrita/gestos/
  // muletillas — no se duplica.
  historia: text("historia").notNull().default(""),
  edad: text("edad").notNull().default(""),
  profesion: text("profesion").notNull().default(""),
  // En qué situación/entorno aparece típicamente (ej. "siempre en obra").
  contexto: text("contexto").notNull().default(""),
  // Prompts maestros: texto listo para pegar en cualquier IA externa que
  // deba representar a este Personaje — por medio (general/imagen/video/voz).
  promptMaestro: text("prompt_maestro").notNull().default(""),
  promptImagen: text("prompt_imagen").notNull().default(""),
  promptVideo: text("prompt_video").notNull().default(""),
  promptVoz: text("prompt_voz").notNull().default(""),
  // Notas internas de trabajo — NUNCA se compilan en el contexto exportado.
  notas: text("notas").notNull().default(""),
  // Versiones guardadas del Personaje: arreglo de snapshots {fecha, nombre,
  // campos} de los campos de texto (las fotos no se versionan — viven en
  // Blob y siguen siendo las actuales). Ver VersionPersonaje en types.ts.
  versionesJson: jsonb("versiones_json").notNull().default([]),
  // Arreglo de hasta 4 URLs de Blob — mismo formato que la antigua columna
  // `identidades.fotos_urls_json`, ahora colgando del Personaje dueño.
  fotosUrlsJson: jsonb("fotos_urls_json").notNull().default([]),

  // Expansión "Personaje como sistema de identidad completo" (Fase B). Todos
  // con default "" — los Personajes existentes quedan intactos. Mapeo
  // anti-duplicación completo en el commit/reporte de esta ronda; resumen:
  // "contexto habitual", `personalidad`, `fisica`, `vestuario`, `vozDescrita`,
  // `gestos`, `muletillas`, `historia`, `edad` y `profesion` YA EXISTÍAN y
  // solo se REUBICARON en las nuevas secciones de la UI — ninguno se duplica
  // acá abajo.
  //
  // Identidad (rol/origen/relaciones — contexto ya existe arriba).
  rolEcosistema: text("rol_ecosistema").notNull().default(""),
  lugarOrigen: text("lugar_origen").notNull().default(""),
  relacionOtrosPersonajes: text("relacion_otros_personajes").notNull().default(""),
  // Personalidad — facetas granulares; `personalidad` (arriba) sigue siendo
  // el resumen general en prosa.
  temperamento: text("temperamento").notNull().default(""),
  nivelEnergia: text("nivel_energia").notNull().default(""),
  formaEnsenar: text("forma_ensenar").notNull().default(""),
  formaResponder: text("forma_responder").notNull().default(""),
  emocionesTransmite: text("emociones_transmite").notNull().default(""),
  defectos: text("defectos").notNull().default(""),
  fortalezas: text("fortalezas").notNull().default(""),
  valores: text("valores").notNull().default(""),
  // Conducta que NUNCA haría (comportamiento) — distinto de
  // `elementosInvariables` (apariencia física/vestuario, ver más abajo).
  queNuncaHaria: text("que_nunca_haria").notNull().default(""),
  // Comunicación — `vozDescrita` y `muletillas` (arriba) ya cubren la voz
  // general y las frases/muletillas frecuentes.
  acento: text("acento").notNull().default(""),
  velocidad: text("velocidad").notNull().default(""),
  tono: text("tono").notNull().default(""),
  volumen: text("volumen").notNull().default(""),
  palabrasFavoritas: text("palabras_favoritas").notNull().default(""),
  palabrasProhibidas: text("palabras_prohibidas").notNull().default(""),
  // Herencia de Identidad: "" = usa el valor de la marca del proyecto; con
  // un valor propio, ese prevalece SOLO para este Personaje. Mismas 3
  // escalas que Identidad (NIVELES_FORMALIDAD/TIPOS_HUMOR/NIVELES_TECNICOS).
  formalidad: text("formalidad").notNull().default(""),
  humor: text("humor").notNull().default(""),
  nivelTecnico: text("nivel_tecnico").notNull().default(""),
  // Apariencia física — `fisica`, `vestuario` y `edad` (arriba) ya cubren la
  // descripción general, el vestuario y la edad real.
  altura: text("altura").notNull().default(""),
  complexion: text("complexion").notNull().default(""),
  // Edad que APARENTA (para prompts de imagen) — distinta de `edad` (dato
  // biográfico real), que puede no coincidir.
  edadAparente: text("edad_aparente").notNull().default(""),
  colorPiel: text("color_piel").notNull().default(""),
  cabello: text("cabello").notNull().default(""),
  barba: text("barba").notNull().default(""),
  ojos: text("ojos").notNull().default(""),
  expresionesHabituales: text("expresiones_habituales").notNull().default(""),
  postura: text("postura").notNull().default(""),
  accesorios: text("accesorios").notNull().default(""),
  // Gestos — alimentan específicamente el Prompt Video (comportamiento, no
  // solo apariencia); `gestos` (arriba) sigue siendo el resumen general.
  gestoManos: text("gesto_manos").notNull().default(""),
  gestoMirada: text("gesto_mirada").notNull().default(""),
  gestoSonrisa: text("gesto_sonrisa").notNull().default(""),
  gestoSenalar: text("gesto_senalar").notNull().default(""),
  formaCaminar: text("forma_caminar").notNull().default(""),
  formaPararse: text("forma_pararse").notNull().default(""),
  formaInteractuar: text("forma_interactuar").notNull().default(""),
  // Contexto de aparición — "tipo de escenas que visita" ya lo cubre
  // `contexto` (arriba); acá solo lo nuevo.
  herramientasQueUsa: text("herramientas_que_usa").notNull().default(""),
  materialesQueMuestra: text("materiales_que_muestra").notNull().default(""),
  ambientesProhibidos: text("ambientes_prohibidos").notNull().default(""),
  // Elementos Invariables — lista de chips que fusiona "vestuario que nunca
  // cambia" + "lo que jamás haría físicamente" (apariencia, no conducta —
  // ver `queNuncaHaria` arriba). Máxima prioridad: primero en cada prompt.
  elementosInvariables: text("elementos_invariables").notNull().default(""),
  // Galería ADICIONAL de fotos de contexto, con etiqueta libre (mismo
  // patrón que `activos.etiquetas`) — NO son las 4 fotos de referencia para
  // IA de video (`fotosUrlsJson`, sin cambios); son solo referencia visual
  // para el usuario y no las descarga la guía de producción.
  fotosContextoJson: jsonb("fotos_contexto_json").notNull().default([]),

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
  // referencia correcta. Con 2+ Personajes seleccionados (ver personajeIdsJson),
  // es el PRIMERO de la lista — la referencia de imagen sigue siendo de a uno
  // a la vez (mejora futura, no de esta ronda). Null si se creó sin Personaje
  // o antes de que existiera esta columna.
  personajeId: text("personaje_id").references(() => personajes.id, { onDelete: "set null" }),
  // Arreglo completo de ids de Personajes seleccionados al generar esta
  // pieza (ver "Selección múltiple de Personajes" en Crear) — null/vacío si
  // se creó sin Personaje, con uno solo (ver personajeId), o antes de que
  // existiera esta columna. No tiene FK propia: son los mismos ids ya
  // referenciados individualmente en `personajes`.
  personajeIdsJson: jsonb("personaje_ids_json"),
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
  // Link a la publicación real (Instagram por ahora) que el usuario pegó
  // como evidencia — null hasta que lo hace. Ver `instagramEmbedHtml`.
  linkPublicacion: text("link_publicacion"),
  // HTML del embed de Instagram oEmbed, cacheado en el momento en que se
  // guarda `linkPublicacion` — nunca se vuelve a pedir a la API al abrir
  // el bloque (el límite es 200 llamadas/hora a nivel de app). Null si
  // falló la llamada, no hay credenciales configuradas, o el link no es
  // válido — ahí la UI cae al botón "Ver publicación" con el link crudo.
  instagramEmbedHtml: text("instagram_embed_html"),
  // Fecha de publicación PLANEADA (no la fecha real de publicación, que es
  // `linkPublicacion`/evidencia) — "YYYY-MM-DD", elegida a mano por el
  // usuario desde el Calendario o esta misma pieza. Null = sin asignar,
  // no aparece en el Calendario, solo vive en Biblioteca. No dispara nada
  // automático (sin recordatorios/notificaciones), es solo organización.
  fechaPlanificada: text("fecha_planificada"),
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
  // Etiquetas libres separadas por coma (ej. "exterior, piscina, dia") —
  // para busqueda y filtros. Texto plano a proposito: se busca con
  // includes(), no necesita estructura. "" = sin etiquetas.
  etiquetas: text("etiquetas").notNull().default(""),
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
  // 'pendiente' | 'trabajada' — pasa a 'trabajada' automáticamente cuando
  // el usuario genera y guarda una pieza que hizo match con esta nota (ver
  // createBloque en actions.ts). Nunca se marca a mano.
  estado: text("estado").notNull().default("pendiente"),
  // Banco de Ideas (Creative OS): 'alta' | 'media' | 'baja' — priorización
  // manual, para decidir qué idea trabajar primero. Solo organización.
  prioridad: text("prioridad").notNull().default("media"),
  // Qué bloque de Biblioteca se creó a partir de esta nota — null hasta
  // que estado pasa a 'trabajada'. Si el bloque se borra, la nota no
  // desaparece, solo pierde el enlace (onDelete: "set null").
  bloqueId: text("bloque_id").references(() => bloques.id, { onDelete: "set null" }),
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

/**
 * Biblioteca de Conocimiento: documentos de referencia de la marca —
 * archivos (PDF, Word, Markdown, TXT — cualquier archivo va a Blob),
 * links externos (normativas, investigaciones, documentacion) o texto
 * plano (resumenes, notas largas). Distinta de las notas del Segundo
 * Cerebro (apuntes rapidos de ideas) y de la tabla `conocimiento` vieja
 * (deprecada, migrada a notas en una ronda anterior — se deja intacta).
 * `proyectoId` nullable: null = documento GLOBAL del estudio, mismo
 * patron que personajes/prompts. `personajeId` opcional para vincular un
 * documento a un Personaje (ej. su biografia extendida). El resto de las
 * relaciones (activos/ideas/contenido) se resuelven por palabras clave
 * en la capa de Relaciones Inteligentes, no con FKs por cada par.
 */
export const documentos = pgTable("documentos", {
  id: text("id").primaryKey(),
  proyectoId: text("proyecto_id").references(() => proyectos.id, { onDelete: "cascade" }),
  personajeId: text("personaje_id").references(() => personajes.id, { onDelete: "set null" }),
  titulo: text("titulo").notNull(),
  // Una de TIPOS_DOCUMENTO (types.ts): archivo | link | texto.
  tipo: text("tipo").notNull().default("texto"),
  // URL del archivo subido (Blob) o del link externo; "" para tipo texto.
  valor: text("valor").notNull().default(""),
  // Texto plano buscable: el contenido pegado (tipo texto), o un resumen/
  // descripcion de que contiene el archivo o link.
  contenido: text("contenido").notNull().default(""),
  // Etiquetas libres separadas por coma — mismo criterio que activos.
  etiquetas: text("etiquetas").notNull().default(""),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()`),
});

/**
 * Biblioteca de Prompts: texto de referencia guardado a mano (no una pieza
 * de Biblioteca) que el usuario copia y pega manualmente en el flujo de
 * "Exportar contexto" — sin ninguna relación automática con una pieza o
 * escena específica. `proyectoId` nullable a propósito, mismo patrón que
 * `personajes`: null = prompt GLOBAL, reutilizable en cualquier proyecto;
 * con un proyecto asignado, es exclusivo de ese proyecto.
 */
export const promptsGuardados = pgTable("prompts_guardados", {
  id: text("id").primaryKey(),
  proyectoId: text("proyecto_id").references(() => proyectos.id, { onDelete: "cascade" }),
  titulo: text("titulo").notNull(),
  texto: text("texto").notNull(),
  // Una de CATEGORIAS_PROMPT (types.ts): Logo | Personaje | Video | Imagen | Otro.
  // NOTA: la categoría ES el "tipo" del prompt — no existe un campo "tipo"
  // separado a propósito, serían dos nombres para la misma dimensión.
  categoria: text("categoria").notNull().default("Otro"),
  // Expansión "Creative OS": etiquetas libres separadas por coma (mismo
  // criterio que activos.etiquetas), Personaje asociado opcional (si el
  // Personaje se borra, el prompt queda sin asociar, no se pierde),
  // versión (parte en 1, sube en cada edición) y estado del ciclo de vida
  // (una de ESTADOS_PROMPT: activo | borrador | archivado).
  etiquetas: text("etiquetas").notNull().default(""),
  personajeId: text("personaje_id").references(() => personajes.id, { onDelete: "set null" }),
  version: integer("version").notNull().default(1),
  estado: text("estado").notNull().default("activo"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()`),
});
