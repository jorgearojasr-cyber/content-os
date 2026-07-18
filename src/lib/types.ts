import type { PlanEdicion } from "./ai";

export type Proyecto = {
  id: string;
  nombre: string;
  descripcion: string;
  createdAt: string;
};

/**
 * Avatar del cliente ideal: quién recibe el contenido, no quién lo crea
 * (eso es Personaje). Se guarda serializado en `identidades.avatarJson`.
 */
export type AvatarCliente = {
  nombreFicticio: string;
  edad: string;
  profesion: string;
  nivelConocimiento: string;
  problemasFrecuentes: string;
  objetivos: string;
  miedos: string;
  queBuscaAprender: string;
  comoConsumeContenido: string;
  lenguaje: string;
};

export const AVATAR_VACIO: AvatarCliente = {
  nombreFicticio: "",
  edad: "",
  profesion: "",
  nivelConocimiento: "",
  problemasFrecuentes: "",
  objetivos: "",
  miedos: "",
  queBuscaAprender: "",
  comoConsumeContenido: "",
  lenguaje: "",
};

/**
 * Adapta `avatarJson` (columna `jsonb` — Postgres/Drizzle ya lo entrega como
 * objeto, no como string) al tipo `AvatarCliente`; ante un valor ausente o
 * con forma inesperada, devuelve el avatar vacío. */
export function parseAvatar(json: unknown): AvatarCliente {
  if (json && typeof json === "object") {
    return { ...AVATAR_VACIO, ...(json as Partial<AvatarCliente>) };
  }
  return { ...AVATAR_VACIO };
}

/** True si el avatar tiene al menos un campo con contenido. */
export function avatarHasContent(avatar: AvatarCliente): boolean {
  return Object.values(avatar).some((v) => v?.trim().length > 0);
}

/**
 * El objeto Identidad completo: la razón de ser de Content OS.
 * Tres capas independientes que juntas garantizan que un proyecto se vea,
 * suene y hable siempre igual a sí mismo, pieza tras pieza.
 */
export type Identidad = {
  id: string;
  proyectoId: string;

  // Capa Marca — la voz, las reglas y el objetivo del proyecto
  voz: string;
  reglas: string;
  objetivo: string;
  /** Columna `jsonb` — ya es un objeto (o `{}`), no un string. Usar `parseAvatar()`. */
  avatarJson: unknown;

  // Capa Personaje — quién aparece, si aplica
  personajeNombre: string;
  personajePersonalidad: string;
  fisica: string;
  vestuario: string;
  vozDescrita: string;
  gestos: string;
  muletillas: string;
  /** Columna `jsonb` — arreglo de hasta 4 URLs (o `[]`), no un string.
   * Usar `parseFotosPersonaje()`. Reemplaza a la antigua `fotoUrl` única. */
  fotosUrlsJson: unknown;

  // Capa Estilo — cómo se ve y se siente
  paleta: string;
  tipografia: string;
  look: string;
  camara: string;
  ritmo: string;
  estructuraCta: string;
  logoUrl: string;

  // Contacto (opcional) — nunca se incluye en el Compilador por defecto,
  // solo cuando se activa explícitamente al crear.
  sitioWeb: string;
  telefono: string;
  direccion: string;

  updatedAt: string;
};

export type IdentidadInput = Omit<Identidad, "id" | "proyectoId" | "updatedAt">;

/** Máximo de fotos de referencia del Personaje permitidas — uno por cada
 * `TipoFotoPersonaje`, así que este número siempre debe calzar con
 * `TIPOS_FOTO_PERSONAJE.length`. */
export const MAX_FOTOS_PERSONAJE = 4;

/** Los 4 tipos de foto de referencia de un Personaje — cada uno es su
 * propio slot fijo en la UI de edición (ver `FotosPersonaje`), no una
 * posición arbitraria en un arreglo. */
export const TIPOS_FOTO_PERSONAJE = ["rostro", "perfil", "medioCuerpo", "cuerpoCompleto"] as const;
export type TipoFotoPersonaje = (typeof TIPOS_FOTO_PERSONAJE)[number];

export const ETIQUETA_TIPO_FOTO_PERSONAJE: Record<TipoFotoPersonaje, string> = {
  rostro: "Rostro",
  perfil: "Perfil",
  medioCuerpo: "Medio cuerpo",
  cuerpoCompleto: "Cuerpo completo",
};

/** Texto de ayuda breve por tipo, mostrado junto a cada slot de carga en la
 * edición de Personaje. */
export const AYUDA_TIPO_FOTO_PERSONAJE: Record<TipoFotoPersonaje, string> = {
  rostro: "Primer plano frontal — es la referencia principal de identidad.",
  perfil: "De perfil o 3/4 — ayuda a mantener la cara consistente en otros ángulos.",
  medioCuerpo: "Desde el torso hacia arriba — útil para escenas de medio cuerpo.",
  cuerpoCompleto: "De cuerpo entero — útil para escenas de acción o cuerpo completo.",
};

/** Solo `rostro` es obligatoria — es el mínimo para que el Personaje
 * funcione como referencia visual, igual que hoy (antes de tener tipos, la
 * "primera" foto cumplía este mismo rol implícitamente). */
export const TIPO_FOTO_PERSONAJE_OBLIGATORIO: TipoFotoPersonaje = "rostro";

export type FotoPersonaje = { url: string; tipo: TipoFotoPersonaje };

/**
 * Adapta `fotosUrlsJson` (columna `jsonb`) a un arreglo de fotos tipadas;
 * ante un valor ausente, con forma inesperada, o con un `tipo` que ya no es
 * uno de los 4 válidos, devuelve un arreglo vacío (o descarta solo esa
 * entrada). Nunca más de `MAX_FOTOS_PERSONAJE`, aunque la columna llegara a
 * tener más.
 */
export function parseFotosPersonaje(json: unknown): FotoPersonaje[] {
  if (!Array.isArray(json)) return [];
  return json
    .filter(
      (v): v is FotoPersonaje =>
        typeof v === "object" &&
        v !== null &&
        typeof (v as { url?: unknown }).url === "string" &&
        (v as { url: string }).url.trim().length > 0 &&
        (TIPOS_FOTO_PERSONAJE as readonly string[]).includes((v as { tipo?: unknown }).tipo as string),
    )
    .slice(0, MAX_FOTOS_PERSONAJE);
}

/** La foto de un tipo específico, o `null` si ese slot no está cargado. */
export function fotoPorTipo(fotos: FotoPersonaje[], tipo: TipoFotoPersonaje): string | null {
  return fotos.find((f) => f.tipo === tipo)?.url ?? null;
}

/** La foto "principal" de un Personaje para avatares/miniaturas en toda la
 * app — siempre prefiere `rostro` (el tipo obligatorio); si por algún
 * motivo no está cargada, cae a la primera foto disponible de cualquier
 * tipo, para no dejar el avatar vacío. */
export function fotoPrincipal(fotos: FotoPersonaje[]): string | null {
  return fotoPorTipo(fotos, TIPO_FOTO_PERSONAJE_OBLIGATORIO) ?? fotos[0]?.url ?? null;
}

/** Adapta `personajeIdsJson` (columna `jsonb` de `bloques`) a un arreglo de
 * ids; ante un valor ausente (bloques con 0-1 Personaje, o creados antes de
 * que existiera esta columna) o con forma inesperada, devuelve vacío. */
export function parsePersonajeIds(json: unknown): string[] {
  if (!Array.isArray(json)) return [];
  return json.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

export type PersonajeResumen = { nombre: string; fotoUrl: string | null; fotos: FotoPersonaje[] };

/** Mapa id -> {nombre, foto principal, fotos completas} para resolver
 * rápido qué Personaje generó un Bloque (`bloque.personajeId`) sin pasar el
 * objeto completo — usado por la guía de producción de Biblioteca. */
export function personajesPorId(personajes: Personaje[]): Record<string, PersonajeResumen> {
  const mapa: Record<string, PersonajeResumen> = {};
  for (const p of personajes) {
    const fotos = parseFotosPersonaje(p.fotosUrlsJson);
    mapa[p.id] = { nombre: p.nombre, fotoUrl: fotoPrincipal(fotos), fotos };
  }
  return mapa;
}

export type Bloque = {
  id: string;
  proyectoId: string;
  /** Qué Personaje estaba seleccionado al generar esta pieza (null si se
   * creó sin Personaje, o antes de que existiera esta columna) — usado por
   * la generación de imagen para tomar la foto de referencia correcta. Con
   * 2+ Personajes (ver personajeIdsJson), es el primero de la lista. */
  personajeId: string | null;
  /** Columna `jsonb`, nullable — arreglo completo de ids cuando se
   * seleccionaron 2+ Personajes juntos. Usar `parsePersonajeIds()`. */
  personajeIdsJson: unknown;
  titulo: string;
  formato: string;
  texto: string;
  identidadCompilada: string;
  estado: string;
  eliminadoAt: string;
  /** Columna `jsonb`, nullable — ya es un arreglo (o `null`), no un string. Usar `parseEscenas()`. */
  escenasJson: unknown;
  /** Columna `jsonb`, nullable — el Plan de Edición generado por el Director
   * de Edición (o `null` si todavía no se generó). Usar `parsePlanEdicion()`. */
  planEdicionJson: unknown;
  /** Link a la publicación real (Instagram, por ahora) pegado como
   * evidencia — `null` hasta que el usuario lo agrega. */
  linkPublicacion: string | null;
  /** HTML del embed de Instagram oEmbed, cacheado — `null` si todavía no se
   * pidió, si la llamada falló, o si no hay credenciales configuradas. */
  instagramEmbedHtml: string | null;
  createdAt: string;
};

/**
 * Personaje: quién aparece en el contenido, si aplica. Un proyecto puede
 * tener varios (ver Crear: selector de cuál usar). Reemplaza a las
 * columnas `personaje*`/`fotosUrlsJson` que antes vivían en `Identidad`
 * (ahora deprecadas ahí, una fila fija por proyecto no alcanzaba).
 */
export type Personaje = {
  id: string;
  /** `null` = Personaje DEL ESTUDIO — no pertenece a ningún proyecto,
   * reutilizable en cualquiera. Con un proyecto asignado, sigue siendo
   * exclusivo de ese proyecto, como antes. */
  proyectoId: string | null;
  nombre: string;
  personalidad: string;
  fisica: string;
  vestuario: string;
  vozDescrita: string;
  gestos: string;
  muletillas: string;
  /** Columna `jsonb` — arreglo de hasta `MAX_FOTOS_PERSONAJE` fotos tipadas
   * `{url, tipo}` (o `[]`). Usar `parseFotosPersonaje()`. */
  fotosUrlsJson: unknown;
  createdAt: string;
};

export type PersonajeInput = Omit<Personaje, "id" | "proyectoId" | "createdAt" | "fotosUrlsJson">;

/** True si el personaje tiene al menos un campo de texto con contenido
 * (fotos no cuentan — mismo criterio que antes en Identidad). */
export function personajeTieneContenido(personaje: Personaje): boolean {
  return (
    [
      personaje.nombre,
      personaje.personalidad,
      personaje.fisica,
      personaje.vestuario,
      personaje.vozDescrita,
      personaje.gestos,
      personaje.muletillas,
    ].some((v) => v.trim().length > 0) || parseFotosPersonaje(personaje.fotosUrlsJson).length > 0
  );
}

/**
 * Avatar del cliente ideal: quién recibe el contenido. Un proyecto puede
 * tener varios (distintos segmentos de audiencia). Reemplaza a la columna
 * `avatarJson` que antes vivía en `Identidad` (ahora deprecada ahí).
 */
export type Avatar = {
  id: string;
  proyectoId: string;
  /** Doble uso: dato de la ficha Y título de la tarjeta en la lista. */
  nombreFicticio: string;
  edad: string;
  profesion: string;
  nivelConocimiento: string;
  problemasFrecuentes: string;
  objetivos: string;
  miedos: string;
  queBuscaAprender: string;
  comoConsumeContenido: string;
  lenguaje: string;
  createdAt: string;
};

export type AvatarInput = Omit<Avatar, "id" | "proyectoId" | "createdAt">;

/** True si el avatar tiene al menos un campo de texto con contenido. */
export function avatarTieneContenido(avatar: Avatar): boolean {
  return [
    avatar.nombreFicticio,
    avatar.edad,
    avatar.profesion,
    avatar.nivelConocimiento,
    avatar.problemasFrecuentes,
    avatar.objetivos,
    avatar.miedos,
    avatar.queBuscaAprender,
    avatar.comoConsumeContenido,
    avatar.lenguaje,
  ].some((v) => v.trim().length > 0);
}

/**
 * Unidad estructural universal de una pieza generada: escena de video con
 * duración real, página de carrusel (duracionSegundos: 0, promptVideo
 * vacío), o la imagen única (arreglo de un elemento). Un solo modelo de
 * datos para los 5 tipos de contenido — ver decisión de diseño en el plan.
 */
export type Escena = {
  numero: number;
  duracionSegundos: number;
  descripcion: string;
  guionHablado: string;
  promptImagen: string;
  promptVideo: string;
  textoEnPantalla: string;
  /** Solo para contenido tipo lista de N cosas/elementos: el objeto físico
   * concreto de esta escena (ver EscenaSchema en ai.ts). "" si no aplica,
   * o si la escena se guardó antes de que existiera este campo. */
  elementoConcreto?: string;
  /** Prompt de imagen fija para producción manual asistida (Gemini/Nano
   * Banana) — distinto de `promptImagen`, que alimenta la generación
   * automática vía OpenAI (`generarImagenParaEscena`). "" si no aplica, o
   * si la escena se guardó antes de que existiera este campo. */
  promptVisual?: string;
  /** Etiqueta EXACTA de un Activo visual (foto de lugar) que esta escena usa
   * como referencia — ver "## Activos visuales disponibles" en
   * identity-compiler.ts. "" si ninguno coincidió con esta escena, o si se
   * guardó antes de que existiera este campo. Se resuelve contra el
   * proyecto (por nombre de Activo) para mostrar la foto real en la guía de
   * producción, ver `biblioteca-lista.tsx`. */
  activoReferenciado?: string;
  /**
   * URL local (/uploads/xxx.png) de la imagen generada con IA para esta
   * escena. Opcional a propósito: no es parte de lo que la IA de texto
   * genera (ver EscenaSchema en ai.ts, que no lo incluye) — se agrega
   * después, manualmente, cuando el usuario pide la imagen desde el editor
   * de escenas. Las escenas guardadas antes de este campo simplemente no
   * lo tienen (undefined al leerlas), sin romper nada.
   */
  imagenGeneradaUrl?: string;
};

export type CalidadImagen = "low" | "medium" | "high";

/** Adapta `escenasJson` (columna `jsonb`, nullable) al tipo `Escena[]`; ante
 * un valor ausente o con forma inesperada, devuelve un arreglo vacío. */
export function parseEscenas(json: unknown): Escena[] {
  return Array.isArray(json) ? (json as Escena[]) : [];
}

/** True si al menos una escena tiene duración real de video — el mismo
 * criterio que distingue video (Video Corto/Largo, Historia con video) de
 * un desglose puramente de imagen/carrusel (`duracionSegundos: 0`). */
export function tieneEscenasDeVideo(escenas: Escena[]): boolean {
  return escenas.some((e) => e.duracionSegundos > 0);
}

/** True si esta pieza tiene escenas pero ninguna con duración real de
 * video — un Carrusel o una Imagen de varias láminas. El Director de
 * Edición sigue ofreciendo un plan para estas piezas, pero como una
 * CONVERSIÓN a video (láminas estáticas + Ken Burns + música), no como
 * indicaciones sobre metraje ya filmado. Es lo que decide si el botón
 * "Generar Plan de Edición" muestra el texto de conversión. */
export function esConversionAVideo(escenas: Escena[]): boolean {
  return escenas.length > 0 && !tieneEscenasDeVideo(escenas);
}

/** Adapta `planEdicionJson` (columna `jsonb`, nullable) al tipo `PlanEdicion`;
 * `null` si todavía no se generó ningún plan o el valor no tiene forma de
 * objeto. */
export function parsePlanEdicion(json: unknown): PlanEdicion | null {
  return json && typeof json === "object" ? (json as PlanEdicion) : null;
}

/** Arma el bloque de texto plano (sin el encabezado `## Escenas`) a partir
 * del arreglo de escenas — usado tanto al generar como al editar, para que
 * el `texto` guardado siempre derive de la misma lógica. */
export function formatearEscenas(escenas: Escena[]): string {
  return escenas
    .map((e) => {
      const partes = [`Escena ${e.numero}${e.duracionSegundos ? ` (${e.duracionSegundos}s)` : ""}`];
      if (e.descripcion) partes.push(e.descripcion);
      if (e.guionHablado) partes.push(`Guión: ${e.guionHablado}`);
      if (e.textoEnPantalla) partes.push(`Texto en pantalla: ${e.textoEnPantalla}`);
      return partes.join("\n");
    })
    .join("\n\n");
}

/**
 * Reemplaza solo la sección `## Escenas` dentro de un `texto` plano ya
 * existente, dejando el resto (Copy, Hashtags, CTA, etc.) intacto. Se usa
 * al editar manualmente las escenas de un bloque ya guardado, donde no
 * existen por separado los demás campos para reconstruir el texto entero.
 * Las secciones se detectan por el salto de línea doble seguido de "## ",
 * no por un solo "\n\n" (que también separa escenas entre sí).
 */
export function reemplazarSeccionEscenas(textoActual: string, escenas: Escena[]): string {
  const nuevoContenido = formatearEscenas(escenas);
  const nuevaSeccion = nuevoContenido ? `## Escenas\n${nuevoContenido}` : "";

  // Los formularios enviados como Server Action normalizan los saltos de
  // línea de un <textarea> a CRLF — se normaliza a "\n" antes de dividir en
  // secciones para no depender de qué line-ending traiga `textoActual`.
  const textoNormalizado = textoActual.replace(/\r\n/g, "\n").trim();
  const secciones = textoNormalizado ? textoNormalizado.split(/\n\n(?=## )/) : [];
  const index = secciones.findIndex((s) => s.startsWith("## Escenas"));

  if (index >= 0) {
    if (nuevaSeccion) {
      secciones[index] = nuevaSeccion;
    } else {
      secciones.splice(index, 1);
    }
  } else if (nuevaSeccion) {
    secciones.push(nuevaSeccion);
  }

  return secciones.join("\n\n");
}

export type Activo = {
  id: string;
  proyectoId: string;
  tipo: string;
  nombre: string;
  valor: string;
  notas: string;
  createdAt: string;
};

export type Nota = {
  id: string;
  texto: string;
  proyectoId: string | null;
  estado: string;
  bloqueId: string | null;
  createdAt: string;
};

export type Conocimiento = {
  id: string;
  proyectoId: string;
  titulo: string;
  contenido: string;
  createdAt: string;
};

// Catálogo recortado: solo Instagram/Facebook/TikTok/YouTube + manual.
// Usado hoy únicamente por el <select> manual de biblioteca/[bloqueId]/editar.
export const FORMATOS_CONTENIDO = [
  "Post Instagram",
  "Reel Instagram",
  "Historia Instagram",
  "Carrusel Instagram",
  "Post Facebook",
  "Historia Facebook",
  "TikTok",
  "Video YouTube",
  "Imagen",
  "Nota manual",
  "Otro formato",
] as const;

// ---------------------------------------------------------------------
// Crear (3 modos): constantes compartidas por Crear rápido/guiado/profesional
// ---------------------------------------------------------------------

export const TIPOS_CONTENIDO = [
  {
    value: "Video Corto",
    icono: "🎥",
    descripcion: "Instagram Reels · TikTok · Facebook Reels · YouTube Shorts",
  },
  { value: "Carrusel", icono: "📚", descripcion: "" },
  { value: "Imagen", icono: "🖼", descripcion: "" },
  { value: "Historia", icono: "📖", descripcion: "Instagram y Facebook" },
  { value: "Video Largo", icono: "▶", descripcion: "YouTube" },
] as const;

export type TipoContenido = (typeof TIPOS_CONTENIDO)[number]["value"];

export type TipoPublicacion = {
  value: string;
  aspectRatio: string;
  /** Duración máxima real de este formato, en segundos — solo aplica a
   * video (Reel/Story/TikTok/Short); ausente = formato estático (Post/
   * Carrusel), sin duración. */
  duracionMaxSegundos?: number;
};

/** Especificaciones reales (aspect ratio, duración máxima) de cada
 * combinación Plataforma + Tipo de publicación — no existía este catálogo
 * en el código (solo nombres de formato sueltos, ver `FORMATOS_CONTENIDO`,
 * sin specs asociadas), así que se define acá con los valores estándar
 * conocidos de cada red, no combinaciones inventadas. Clave = valor de
 * `PLATAFORMAS_CONTENIDO`. */
export const TIPOS_PUBLICACION_POR_PLATAFORMA: Record<string, TipoPublicacion[]> = {
  Instagram: [
    { value: "Reel", aspectRatio: "9:16", duracionMaxSegundos: 90 },
    { value: "Story", aspectRatio: "9:16", duracionMaxSegundos: 15 },
    { value: "Post (feed)", aspectRatio: "4:5" },
    { value: "Carrusel", aspectRatio: "4:5" },
  ],
  TikTok: [
    { value: "Video", aspectRatio: "9:16", duracionMaxSegundos: 60 },
    { value: "Story", aspectRatio: "9:16", duracionMaxSegundos: 15 },
  ],
  Facebook: [
    { value: "Post", aspectRatio: "4:5" },
    { value: "Story", aspectRatio: "9:16", duracionMaxSegundos: 20 },
    { value: "Reel", aspectRatio: "9:16", duracionMaxSegundos: 90 },
  ],
  YouTube: [
    { value: "Short", aspectRatio: "9:16", duracionMaxSegundos: 60 },
    { value: "Video", aspectRatio: "16:9", duracionMaxSegundos: 180 },
  ],
};

const ICONO_POR_FORMATO = new Map(TIPOS_CONTENIDO.map((t) => [t.value as string, t.icono]));

/** Ícono según formato de un Bloque — piezas hechas a mano (formato
 * "manual") o cualquier otro valor libre caen al ícono genérico. Usado en
 * Biblioteca y en "Contenido reciente" de Crear. */
export function iconoFormato(formato: string): string {
  return ICONO_POR_FORMATO.get(formato) ?? "📄";
}

export const TIPOS_PRODUCCION = [
  { value: "Persona hablando a cámara", icono: "👤" },
  { value: "Persona + apoyo visual (B-Roll)", icono: "👤" },
  { value: "Solo escenas reales", icono: "🏗" },
  { value: "Solo imágenes", icono: "🖼" },
  { value: "Animación", icono: "🎨" },
  { value: "IA decide automáticamente", icono: "🤖" },
] as const;

// "Automático" NO va en este arreglo — el `Select` compartido en
// crear-campos.tsx ya antepone su propia opción "Automático" (value="")
// antes de mapear estas; agregarla acá la duplicaba en el dropdown.
export const PLATAFORMAS_CONTENIDO = ["Instagram", "TikTok", "Facebook", "YouTube"] as const;

export const DURACIONES_VIDEO_CORTO = ["15s", "30s", "45s", "60s"] as const;
/** Duraciones para YouTube + "Video" (horizontal, hasta 3 min) — el rango
 * corto (`DURACIONES_VIDEO_CORTO`) no alcanza para este formato; ver
 * `esYoutubeVideo` en crear-campos.tsx para cuándo se usa esta lista en
 * vez de la corta. */
export const DURACIONES_VIDEO_LARGO_YOUTUBE = ["60s", "90s", "120s", "180s"] as const;
export const NUMEROS_ESCENAS = ["3", "5", "6", "8"] as const;
export const NUMEROS_PAGINAS_CARRUSEL = ["5", "7", "10", "12"] as const;
export const ESTILOS_IMAGEN = [
  "Fotografía realista",
  "Miniatura",
  "Infografía",
  "Comparativa",
  "Publicidad",
] as const;

export const TIPOS_ACTIVO = [
  { value: "foto", label: "Fotografía", archivo: true },
  { value: "video", label: "Video", archivo: true },
  { value: "musica", label: "Música", archivo: true },
  { value: "icono", label: "Ícono", archivo: true },
  { value: "prompt", label: "Prompt", archivo: false },
  { value: "voz", label: "Voz", archivo: false },
  { value: "documento", label: "Documento", archivo: true },
  { value: "recurso_grafico", label: "Recurso gráfico", archivo: true },
  { value: "otro", label: "Otro", archivo: false },
] as const;
