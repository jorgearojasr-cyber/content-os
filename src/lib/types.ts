import type { PlanEdicion } from "./ai";

export type Proyecto = {
  id: string;
  nombre: string;
  descripcion: string;
  areaId: string | null;
  createdAt: string;
};

/** Área de Conocimiento — nivel intermedio entre el Centro Personal
 * (global) y los Proyectos. Ver `area` en schema.ts. */
export type Area = {
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

  // Capa Marca — la voz, las reglas y el objetivo del proyecto.
  // Mapeo Creative OS (no duplicar campos): "personalidad"/"tono" viven en
  // `voz`; "objetivos" en `objetivo`; la audiencia estructurada vive en la
  // tabla `avatares` — `audiencia` acá es el resumen libre general.
  voz: string;
  reglas: string;
  objetivo: string;
  historia: string;
  valores: string;
  audiencia: string;
  competidores: string;
  /** Texto con los lineamientos oficiales, o un link al documento externo. */
  manualMarca: string;

  // Lineamientos de contenido — qué CTA/hashtags usar y qué evitar.
  ctaHabituales: string;
  hashtagsFrecuentes: string;
  restricciones: string;

  // Entrenamiento permanente de marca (ver mapeo anti-duplicación en
  // schema.ts — nada de esto duplica campos existentes).
  promesa: string;
  posicionamiento: string;
  /** Uno de ARQUETIPOS_MARCA ("" = sin definir). */
  arquetipo: string;
  manifiesto: string;
  emociones: string;
  impactoEsperado: string;
  adaptacionAudiencia: string;
  /** Uno de NIVELES_FORMALIDAD ("" = sin definir). */
  formalidad: string;
  /** Uno de TIPOS_HUMOR ("" = sin definir). */
  humor: string;
  /** Uno de NIVELES_TECNICOS ("" = sin definir). */
  nivelTecnico: string;
  /** Lista separada por coma — editada como chips. */
  palabrasSiempre: string;
  /** Lista separada por coma — editada como chips. Complementa `reglas`
   * (prosa) con una lista accionable de palabras prohibidas. */
  palabrasNunca: string;
  frasesCaracteristicas: string;
  estructuraContenidos: string;
  respuestaCriticas: string;
  diferenciadores: string;

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

/** Los 12 arquetipos clásicos de marca — un marco estándar que cualquier
 * IA externa reconoce sin explicación adicional. Select fijo. */
export const ARQUETIPOS_MARCA = [
  "El Sabio",
  "El Héroe",
  "El Cuidador",
  "El Explorador",
  "El Rebelde",
  "El Mago",
  "El Hombre Común",
  "El Amante",
  "El Bufón",
  "El Creador",
  "El Gobernante",
  "El Inocente",
] as const;

/** Escalas fijas de voz — funcionan mejor como select que como texto libre
 * (un valor consistente y comparable, no una redacción distinta cada vez). */
export const NIVELES_FORMALIDAD = [
  "Muy cercano (tuteo, coloquial)",
  "Cercano pero profesional",
  "Neutro",
  "Formal",
] as const;

export const NIVELES_TECNICOS = [
  "Muy simple (cero tecnicismos)",
  "Simple, con términos técnicos explicados",
  "Intermedio (audiencia con nociones)",
  "Técnico (audiencia experta)",
] as const;

export const TIPOS_HUMOR = [
  "Sin humor",
  "Humor sutil ocasional",
  "Humor cotidiano y cercano",
  "Humor abierto / bromista",
] as const;

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
  /** Fecha de publicación PLANEADA, "YYYY-MM-DD" — `null` = sin asignar, no
   * aparece en el Calendario. Ver columna `fechaPlanificada` en schema.ts. */
  fechaPlanificada: string | null;
  /** Toggles de "Qué incluir en esta pieza" con los que se generó/editó
   * esta pieza — ver columnas homónimas en schema.ts. `posicionLogo` es
   * `PosicionLogo` (identity-compiler.ts) como texto libre; `null` = sin
   * posición elegida. */
  incluirMarca: boolean;
  incluirLogo: boolean;
  posicionLogo: string | null;
  incluirContacto: boolean;
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
  // Ficha completa (Creative OS) — "forma de hablar" ya vive en
  // vozDescrita/gestos/muletillas, no se duplica.
  historia: string;
  edad: string;
  profesion: string;
  contexto: string;
  /** Prompts maestros por medio — texto listo para pegar en la IA externa. */
  promptMaestro: string;
  promptImagen: string;
  promptVideo: string;
  promptVoz: string;
  /** Notas internas de trabajo — nunca se compilan en el contexto. */
  notas: string;
  /** Columna `jsonb` — arreglo de `VersionPersonaje` (o `[]`). Usar
   * `parseVersionesPersonaje()`. Se administra con sus propias acciones
   * (guardar/restaurar versión), no desde el formulario de edición. */
  versionesJson: unknown;
  /** Columna `jsonb` — arreglo de hasta `MAX_FOTOS_PERSONAJE` fotos tipadas
   * `{url, tipo}` (o `[]`). Usar `parseFotosPersonaje()`. */
  fotosUrlsJson: unknown;

  // Sistema de identidad completo (Fase B) — ver mapeo anti-duplicación en
  // schema.ts. Identidad:
  rolEcosistema: string;
  lugarOrigen: string;
  relacionOtrosPersonajes: string;
  // Personalidad:
  temperamento: string;
  nivelEnergia: string;
  formaEnsenar: string;
  formaResponder: string;
  emocionesTransmite: string;
  defectos: string;
  fortalezas: string;
  valores: string;
  queNuncaHaria: string;
  // Comunicación:
  acento: string;
  velocidad: string;
  tono: string;
  volumen: string;
  palabrasFavoritas: string;
  palabrasProhibidas: string;
  /** "" = hereda el de Identidad (marca) — ver `resolverVozPersonaje()`. */
  formalidad: string;
  /** "" = hereda el de Identidad (marca). */
  humor: string;
  /** "" = hereda el de Identidad (marca). */
  nivelTecnico: string;
  // Apariencia física:
  altura: string;
  complexion: string;
  edadAparente: string;
  colorPiel: string;
  cabello: string;
  barba: string;
  ojos: string;
  expresionesHabituales: string;
  postura: string;
  accesorios: string;
  // Gestos (alimentan el Prompt Video):
  gestoManos: string;
  gestoMirada: string;
  gestoSonrisa: string;
  gestoSenalar: string;
  formaCaminar: string;
  formaPararse: string;
  formaInteractuar: string;
  // Contexto de aparición:
  herramientasQueUsa: string;
  materialesQueMuestra: string;
  ambientesProhibidos: string;
  /** Chips, máxima prioridad — van primero en cualquier prompt de este
   * Personaje. Fusiona "vestuario que nunca cambia" + "lo que jamás haría
   * físicamente" (apariencia; para conducta ver `queNuncaHaria`). */
  elementosInvariables: string;
  /** Columna `jsonb` — arreglo de `FotoContextoPersonaje` (o `[]`), galería
   * adicional de referencia visual con etiqueta libre. Usar
   * `parseFotosContextoPersonaje()`. NO son las fotos de `fotosUrlsJson`. */
  fotosContextoJson: unknown;

  createdAt: string;
};

export type PersonajeInput = Omit<
  Personaje,
  "id" | "proyectoId" | "createdAt" | "fotosUrlsJson" | "versionesJson" | "fotosContextoJson"
>;

/** Los roles posibles de un Personaje dentro del ecosistema de contenido —
 * select fijo, igual criterio que ARQUETIPOS_MARCA (marco reconocible sin
 * explicación adicional). */
export const ROLES_PERSONAJE = [
  "Educador principal",
  "Presentador",
  "Experto técnico",
  "Anfitrión",
  "Testimonial / Cliente",
  "Apoyo secundario",
  "Narrador",
  "Otro",
] as const;

export type FotoContextoPersonaje = { url: string; etiqueta: string };

/** Adapta `fotosContextoJson` a un arreglo tipado — ante un valor ausente o
 * con forma inesperada, devuelve vacío (o descarta solo esa entrada). Sin
 * límite de cantidad (a diferencia de `parseFotosPersonaje`). */
export function parseFotosContextoPersonaje(json: unknown): FotoContextoPersonaje[] {
  if (!Array.isArray(json)) return [];
  return json.filter(
    (v): v is FotoContextoPersonaje =>
      typeof v === "object" &&
      v !== null &&
      typeof (v as { url?: unknown }).url === "string" &&
      (v as { url: string }).url.trim().length > 0 &&
      typeof (v as { etiqueta?: unknown }).etiqueta === "string",
  );
}

/** Los campos de texto de un Personaje que un snapshot de versión captura —
 * las fotos no se versionan (viven en Blob, siguen siendo las actuales). */
export const CAMPOS_VERSION_PERSONAJE = [
  "nombre",
  "personalidad",
  "fisica",
  "vestuario",
  "vozDescrita",
  "gestos",
  "muletillas",
  "historia",
  "edad",
  "profesion",
  "contexto",
  "promptMaestro",
  "promptImagen",
  "promptVideo",
  "promptVoz",
  "notas",
  // Fase B — el snapshot de versión sigue siendo "toda la ficha de texto".
  "rolEcosistema",
  "lugarOrigen",
  "relacionOtrosPersonajes",
  "temperamento",
  "nivelEnergia",
  "formaEnsenar",
  "formaResponder",
  "emocionesTransmite",
  "defectos",
  "fortalezas",
  "valores",
  "queNuncaHaria",
  "acento",
  "velocidad",
  "tono",
  "volumen",
  "palabrasFavoritas",
  "palabrasProhibidas",
  "formalidad",
  "humor",
  "nivelTecnico",
  "altura",
  "complexion",
  "edadAparente",
  "colorPiel",
  "cabello",
  "barba",
  "ojos",
  "expresionesHabituales",
  "postura",
  "accesorios",
  "gestoManos",
  "gestoMirada",
  "gestoSonrisa",
  "gestoSenalar",
  "formaCaminar",
  "formaPararse",
  "formaInteractuar",
  "herramientasQueUsa",
  "materialesQueMuestra",
  "ambientesProhibidos",
  "elementosInvariables",
] as const satisfies ReadonlyArray<keyof PersonajeInput>;

/** Un snapshot completo de la ficha de texto de un Personaje en un momento
 * dado — guardado a mano con "Guardar versión", restaurable después. */
export type VersionPersonaje = {
  /** ISO string del momento en que se guardó. */
  fecha: string;
  /** Nombre libre que el usuario le dio a la versión ("" = sin nombre). */
  nombre: string;
  campos: Record<(typeof CAMPOS_VERSION_PERSONAJE)[number], string>;
};

/** Adapta `versionesJson` (columna `jsonb`) a un arreglo de versiones; ante
 * un valor ausente o con forma inesperada, devuelve un arreglo vacío. */
export function parseVersionesPersonaje(json: unknown): VersionPersonaje[] {
  if (!Array.isArray(json)) return [];
  return json.filter(
    (v): v is VersionPersonaje =>
      typeof v === "object" &&
      v !== null &&
      typeof (v as { fecha?: unknown }).fecha === "string" &&
      typeof (v as { campos?: unknown }).campos === "object" &&
      (v as { campos?: unknown }).campos !== null,
  );
}

/** Los 3 campos de voz que un Personaje puede heredar de la Identidad del
 * proyecto ("" = hereda) o definir por su cuenta (valor propio prevalece,
 * SOLO para este Personaje). */
export type CampoHerencia = "formalidad" | "humor" | "nivelTecnico";

export type ValorHeredado = {
  valor: string;
  /** true = viene de Identidad (marca), false = valor propio del Personaje. */
  heredado: boolean;
};

/** Resuelve un campo con herencia: el valor propio del Personaje si lo
 * definió, o el de la Identidad del proyecto si lo dejó vacío. Puro y
 * determinista — sin IA. Usado tanto por `compilarPersonaje()` como por la
 * UI para mostrar "Usando el de la marca: X" vs. un valor propio. */
export function resolverVozPersonaje(
  personaje: Personaje,
  identidad: Identidad | null,
  campo: CampoHerencia,
): ValorHeredado {
  const propio = personaje[campo].trim();
  if (propio) return { valor: propio, heredado: false };
  return { valor: identidad?.[campo]?.trim() ?? "", heredado: true };
}

/** True si el personaje tiene al menos un campo de texto con contenido
 * (fotos sí cuentan; notas internas no definen "contenido" por sí solas
 * pero se incluyen igual — cualquier dato guardado hace real al Personaje). */
export function personajeTieneContenido(personaje: Personaje): boolean {
  return (
    CAMPOS_VERSION_PERSONAJE.some((campo) => personaje[campo].trim().length > 0) ||
    parseFotosPersonaje(personaje.fotosUrlsJson).length > 0
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
  promptVideo: string;
  textoEnPantalla: string;
  /** Solo para contenido tipo lista de N cosas/elementos: el objeto físico
   * concreto de esta escena (ver EscenaSchema en ai.ts). "" si no aplica,
   * o si la escena se guardó antes de que existiera este campo. */
  elementoConcreto?: string;
  /** Prompt de imagen fija — usado tanto para producción manual asistida
   * (Gemini/Nano Banana, el usuario lo copia) como para la generación
   * automática vía OpenAI (`generarImagenParaEscena`). Único campo de
   * prompt de imagen de una escena (antes existía también `promptImagen`,
   * un campo separado sin instrucciones para el modelo que quedaba
   * siempre vacío — se eliminó). "" si no aplica, o si la escena se
   * guardó antes de que existiera este campo. */
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
  /** Etiquetas libres separadas por coma ("" = sin etiquetas). */
  etiquetas: string;
  createdAt: string;
};

/** Prioridades del Banco de Ideas — organización manual, nada automático. */
export const PRIORIDADES_NOTA = [
  { value: "alta", label: "Alta", icono: "🔴" },
  { value: "media", label: "Media", icono: "🟡" },
  { value: "baja", label: "Baja", icono: "🟢" },
] as const;

export type Nota = {
  id: string;
  texto: string;
  proyectoId: string | null;
  estado: string;
  /** Una de PRIORIDADES_NOTA: alta | media | baja. */
  prioridad: string;
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

/** Tipos de documento de la Biblioteca de Conocimiento. */
export const TIPOS_DOCUMENTO = [
  { value: "archivo", label: "Archivo (PDF, Word, MD, TXT…)" },
  { value: "link", label: "Link externo" },
  { value: "texto", label: "Texto / resumen" },
] as const;

/**
 * Un documento de la Biblioteca de Conocimiento — material de referencia
 * de la marca (normativas, investigaciones, documentación, resúmenes).
 * `proyectoId` nullable: `null` = global (chip "Global" en proyectos).
 * `personajeId` opcional vincula el documento a un Personaje.
 */
export type Documento = {
  id: string;
  proyectoId: string | null;
  areaId: string | null;
  personajeId: string | null;
  titulo: string;
  /** Una de TIPOS_DOCUMENTO: archivo | link | texto. */
  tipo: string;
  /** URL (Blob o link externo); "" para tipo texto. */
  valor: string;
  /** Contenido pegado o resumen buscable del archivo/link. */
  contenido: string;
  /** Etiquetas libres separadas por coma ("" = sin etiquetas). */
  etiquetas: string;
  createdAt: string;
};

/** Categorías fijas de la Biblioteca de Prompts — sin categoría libre a
 * propósito, para que el filtro por categoría sea siempre exhaustivo. La
 * categoría ES el "tipo" del prompt (no hay un campo tipo separado). */
export const CATEGORIAS_PROMPT = ["Logo", "Personaje", "Video", "Imagen", "Otro"] as const;
export type CategoriaPrompt = (typeof CATEGORIAS_PROMPT)[number];

/** Ciclo de vida de un prompt guardado. */
export const ESTADOS_PROMPT = [
  { value: "activo", label: "Activo" },
  { value: "borrador", label: "Borrador" },
  { value: "archivado", label: "Archivado" },
] as const;

/**
 * Un prompt de texto guardado a mano como referencia — sin relación
 * automática con ninguna pieza/escena, el usuario lo copia y pega
 * manualmente en el flujo de "Exportar contexto". `proyectoId` nullable:
 * `null` = global (visible en todos los proyectos, con chip "Global");
 * con un proyecto asignado, exclusivo de ese proyecto.
 */
export type PromptGuardado = {
  id: string;
  proyectoId: string | null;
  titulo: string;
  texto: string;
  categoria: string;
  /** Etiquetas libres separadas por coma ("" = sin etiquetas). */
  etiquetas: string;
  /** Personaje asociado — `null` = prompt general, sin Personaje. Si el
   * Personaje se borra, el prompt queda sin asociar (no se pierde). */
  personajeId: string | null;
  /** Parte en 1 y sube en cada edición del texto/título. */
  version: number;
  /** Una de ESTADOS_PROMPT: activo | borrador | archivado. */
  estado: string;
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

/** Paso 2 de Crear ("¿Cómo quieres comunicarlo?") para Formatos de VIDEO
 * (Video Corto, Video Largo, Historia) — sin cambios. */
export const TIPOS_PRODUCCION = [
  { value: "Persona hablando a cámara", icono: "👤" },
  { value: "Persona + apoyo visual (B-Roll)", icono: "👤" },
  { value: "Solo escenas reales", icono: "🏗" },
  { value: "Solo imágenes", icono: "🖼" },
  { value: "Animación", icono: "🎨" },
  { value: "IA decide automáticamente", icono: "🤖" },
] as const;

/** Paso 2 de Crear para Formatos de IMAGEN FIJA (Imagen, Carrusel) — las 6
 * opciones de video no aplican a una pieza estática (nunca hay "escenas" ni
 * B-Roll), así que usan su propio set relevante. */
export const TIPOS_PRODUCCION_IMAGEN = [
  { value: "Persona/retrato real", icono: "👤" },
  { value: "Producto u objeto", icono: "📦" },
  { value: "Ilustración o gráfico", icono: "🎨" },
  { value: "Solo texto/tipografía", icono: "🔤" },
  { value: "IA decide automáticamente", icono: "🤖" },
] as const;

/** Los Formatos que son piezas ESTÁTICAS (nunca tienen escenas ni video) —
 * usan `TIPOS_PRODUCCION_IMAGEN` en vez de `TIPOS_PRODUCCION` en el Paso 2
 * de Crear. */
export const FORMATOS_IMAGEN_FIJA = ["Imagen", "Carrusel"] as const;

// "Automático" NO va en este arreglo — cualquier `Select` que lo use
// antepone su propia opción "Automático" (value="") antes de mapear
// estas; agregarla acá la duplicaba en el dropdown.
export const PLATAFORMAS_CONTENIDO = ["Instagram", "TikTok", "Facebook", "YouTube"] as const;

export const DURACIONES_VIDEO_CORTO = ["15s", "30s", "45s", "60s"] as const;
/** Duraciones para YouTube + "Video" (horizontal, hasta 3 min) — el rango
 * corto (`DURACIONES_VIDEO_CORTO`) no alcanza para este formato. */
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
  { value: "audio", label: "Audio", archivo: true },
  { value: "musica", label: "Música", archivo: true },
  { value: "animacion", label: "Animación", archivo: true },
  { value: "logo", label: "Logo", archivo: true },
  { value: "icono", label: "Ícono", archivo: true },
  { value: "prompt", label: "Prompt", archivo: false },
  { value: "voz", label: "Voz", archivo: false },
  { value: "documento", label: "Documento", archivo: true },
  { value: "recurso_grafico", label: "Recurso gráfico", archivo: true },
  { value: "otro", label: "Otro", archivo: false },
] as const;

// ---------------------------------------------------------------------
// Producción (Fase 2) — Planos + Storyboard de Escenas
// ---------------------------------------------------------------------
//
// Distinto de `Escena` (arriba en este archivo) — esa es el artefacto de
// contenido dentro de un Bloque ya guardado en Biblioteca; esto es la
// planificación de PRE-producción a nivel de Proyecto. Ver comentario
// largo en schema.ts junto a `storyboardEscenas` para el detalle completo
// de la separación entre ambos conceptos.

/** Tipo de plano de cámara — catálogo de referencia (Primer plano, Plano
 * detalle, etc.), ver seed en scripts/. Sin UI de administración todavía
 * (Fase 2) — solo se lee desde selectores futuros. */
export type Plano = {
  id: string;
  nombre: string;
  descripcion: string;
  cuandoUsarlo: string;
  createdAt: string;
  updatedAt: string;
};

/** El rol narrativo de una escena dentro de la producción — determina
 * dónde encaja en el arco de la pieza, no su duración ni su formato. */
export const TIPOS_ESCENA_STORYBOARD = [
  "GANCHO",
  "PROBLEMA",
  "DESCUBRIMIENTO",
  "SOLUCION",
  "CTA",
  "BROLL",
  "TRANSICION",
  "OTRA",
] as const;
export type TipoEscenaStoryboard = (typeof TIPOS_ESCENA_STORYBOARD)[number];

/** Progreso de producción de una escena — BORRADOR es el estado inicial
 * siempre; el resto lo actualiza el usuario a mano según avanza. */
export const ESTADOS_PRODUCCION_ESCENA = ["BORRADOR", "GRABADA", "EDITADA", "PUBLICADA"] as const;
export type EstadoProduccionEscena = (typeof ESTADOS_PRODUCCION_ESCENA)[number];

/**
 * Producción (Fase 3.4): un video/pieza específico dentro de un Proyecto
 * (marca) — dueño de su propio storyboard, aislado del de cualquier otro
 * video del mismo Proyecto. Los campos de texto libre (`contexto`,
 * `musicaPrincipal`, `intro`, `outro`) son las secciones "Contexto" y
 * "Recursos globales" del Creative Blueprint Document.
 */
export type Produccion = {
  id: string;
  proyectoId: string;
  titulo: string;
  formato: string;
  ideaCentral: string;
  objetivoGeneral: string;
  objetivoEspectador: string;
  publicoObjetivo: string;
  /** `null` = sin intención de duración declarada todavía. */
  duracionEstimadaSegundos: number | null;
  contexto: string;
  musicaPrincipal: string;
  intro: string;
  outro: string;
  notas: string;
  createdAt: string;
  updatedAt: string;
};

/** Produccion con sus métricas reales calculadas desde sus escenas — lo
 * que devuelve el listado de Producciones de un Proyecto. */
export type ProduccionConMetricas = Produccion & {
  totalEscenas: number;
  duracionCalculadaSegundos: number;
};

/**
 * StoryboardEscena: unidad de planificación de una producción, propia de
 * una Producción (un video, Fase 3.4) — existe con o sin una pieza
 * (Bloque) ya armada a partir de ella. `numero` = posición narrativa
 * original; `orden` = posición actual (editable al reordenar). El
 * "tiempo" de cada escena NUNCA se guarda acá — se calcula sumando
 * `duracionSegundos` de las escenas anteriores según `orden`.
 */
export type StoryboardEscena = {
  id: string;
  proyectoId: string;
  produccionId: string;
  numero: number;
  orden: number;
  duracionSegundos: number;
  /** Una de TIPOS_ESCENA_STORYBOARD. */
  tipoEscena: string;
  objetivoNarrativo: string;
  emocion: string;
  valorEspectador: string;
  /** Activo (tipo="foto") usado como referencia visual del lugar; `null`
   * = sin locación asignada todavía. */
  locacionId: string | null;
  /** `null` = sin plano de cámara asignado todavía. */
  planoId: string | null;
  movimientoCamara: string;
  accion: string;
  textoHablado: string;
  textoPantalla: string;
  /** Texto libre por ahora — candidato a lista estructurada en una fase
   * futura, no hoy. */
  recursosNecesarios: string;
  promptIa: string;
  promptVideoIa: string;
  musica: string;
  transicion: string;
  /** Una de ESTADOS_PRODUCCION_ESCENA. */
  estadoProduccion: string;
  notas: string;
  createdAt: string;
  updatedAt: string;
};

/** StoryboardEscena hidratada con sus Personajes relacionados (tabla puente
 * `storyboard_escenas_personajes`, Fase 3.1) — lo que devuelven las
 * lecturas del módulo de Producción; la tabla en sí no vive en este tipo,
 * solo los ids resueltos. */
export type StoryboardEscenaConPersonajes = StoryboardEscena & {
  personajeIds: string[];
};
