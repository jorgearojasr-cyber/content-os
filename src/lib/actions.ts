"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, isNull, lt } from "drizzle-orm";
import { db } from "@/db";
import { activos, avatares, bloques, conocimiento, identidades, notas, personajes, proyectos } from "@/db/schema";
import { compileIdentity } from "./identity-compiler";
import {
  completarProyecto,
  generarContenido,
  generarPersonaje,
  generarPlanEdicion,
  inferirConfiguracion,
} from "./ai";
import type {
  ConfiguracionInferida,
  ContenidoGenerado,
  ContenidoInput,
  IdentidadCompletaSugerida,
  PersonajeSugerido,
  PlanEdicion,
} from "./ai";
import { extraerPalabrasClave, rankearResultados, extraerFragmento } from "./reutilizacion";
import type { ResultadoRelacionado } from "./reutilizacion";
import { generarImagenIA } from "./imagen-provider";
import { guardarArchivoSubido, eliminarArchivoSubido } from "./storage";
import {
  MAX_FOTOS_PERSONAJE,
  parseEscenas,
  parseFotosPersonaje,
  parsePlanEdicion,
  tieneEscenasDeVideo,
  TIPOS_ACTIVO,
} from "./types";
import type { Avatar, AvatarInput, CalidadImagen, Identidad, IdentidadInput, Personaje, PersonajeInput } from "./types";

const PAPELERA_RETENCION_DIAS = 7;

// ---------------------------------------------------------------------
// Proyectos
// ---------------------------------------------------------------------

export async function getProyectos() {
  return db.select().from(proyectos).orderBy(proyectos.createdAt);
}

export async function getProyecto(id: string) {
  const rows = await db.select().from(proyectos).where(eq(proyectos.id, id));
  return rows[0] ?? null;
}

/**
 * Crea un proyecto y, junto con él, su fila de Identidad vacía.
 * La relación es siempre 1 a 1: un proyecto sin identidad no existe.
 */
export async function createProyecto(formData: FormData) {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  if (!nombre) throw new Error("El proyecto necesita un nombre.");

  const proyectoId = randomUUID();

  await db.insert(proyectos).values({ id: proyectoId, nombre, descripcion });
  await db.insert(identidades).values({ id: randomUUID(), proyectoId });

  revalidatePath("/proyectos");
  redirect(`/proyectos/${proyectoId}/crear`);
}

export async function updateProyecto(id: string, formData: FormData) {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  if (!nombre) throw new Error("El proyecto necesita un nombre.");

  await db.update(proyectos).set({ nombre, descripcion }).where(eq(proyectos.id, id));

  revalidatePath("/proyectos");
  revalidatePath(`/proyectos/${id}`);
}

export async function deleteProyecto(id: string) {
  await db.delete(proyectos).where(eq(proyectos.id, id));
  revalidatePath("/proyectos");
  redirect("/proyectos");
}

// ---------------------------------------------------------------------
// Identidad
// ---------------------------------------------------------------------

export async function getIdentidad(proyectoId: string): Promise<Identidad | null> {
  const rows = await db
    .select()
    .from(identidades)
    .where(eq(identidades.proyectoId, proyectoId));
  return rows[0] ?? null;
}

// Marca + Estilo + Contacto — lo que de verdad es único por proyecto. Los
// campos de Personaje/Avatar quedaron deprecados acá (ver `personajes`/
// `avatares` más abajo) y ya no se leen del formData de este formulario.
const IDENTIDAD_CAMPOS = [
  "voz",
  "reglas",
  "objetivo",
  "paleta",
  "tipografia",
  "look",
  "camara",
  "ritmo",
  "estructuraCta",
  "logoUrl",
  "sitioWeb",
  "telefono",
  "direccion",
] as const satisfies ReadonlyArray<
  Exclude<
    keyof IdentidadInput,
    | "avatarJson"
    | "fotosUrlsJson"
    | "personajeNombre"
    | "personajePersonalidad"
    | "fisica"
    | "vestuario"
    | "vozDescrita"
    | "gestos"
    | "muletillas"
  >
>;

export async function updateIdentidad(proyectoId: string, formData: FormData) {
  const valores = Object.fromEntries(
    IDENTIDAD_CAMPOS.map((campo) => [campo, String(formData.get(campo) ?? "").trim()]),
  ) as unknown as Pick<IdentidadInput, (typeof IDENTIDAD_CAMPOS)[number]>;

  await db
    .update(identidades)
    .set({ ...valores, updatedAt: new Date().toISOString() })
    .where(eq(identidades.proyectoId, proyectoId));

  revalidatePath(`/proyectos/${proyectoId}/identidad`);
  revalidatePath(`/proyectos/${proyectoId}/crear`);
}

/** Sube el logo del proyecto y lo persiste de inmediato. Lee la clave
 * "foto" del FormData (no "logo") porque `FileUploader` — reutilizado tal
 * cual, sin duplicarlo — siempre manda el archivo bajo esa clave fija. */
export async function subirLogo(proyectoId: string, formData: FormData): Promise<string> {
  const archivo = formData.get("foto");
  if (!(archivo instanceof File)) throw new Error("No se recibió ningún archivo.");

  const url = await guardarArchivoSubido(archivo);

  await db
    .update(identidades)
    .set({ logoUrl: url, updatedAt: new Date().toISOString() })
    .where(eq(identidades.proyectoId, proyectoId));

  revalidatePath(`/proyectos/${proyectoId}/identidad`);
  return url;
}

/** Genera sugerencias de personaje con IA. No escribe en la base de datos —
 * quien llama decide qué hacer con el resultado (ver `createPersonaje`). */
export async function generarPersonajeAction(
  descripcion: string,
  contexto?: Partial<PersonajeSugerido>,
): Promise<PersonajeSugerido> {
  return generarPersonaje(descripcion, contexto);
}

/** Genera una identidad completa con IA a partir de una descripción libre.
 * No escribe en la base de datos — el usuario revisa y confirma. */
export async function completarProyectoAction(
  descripcion: string,
): Promise<IdentidadCompletaSugerida> {
  return completarProyecto(descripcion);
}

// ---------------------------------------------------------------------
// Personajes
// ---------------------------------------------------------------------

/** Más reciente primero — el mismo criterio usado en toda la app para
 * elegir el "por defecto" cuando hay varios (Crear, vista previa, etc.).
 * Compara por fecha real (no por string): las filas migradas desde
 * `identidades` llevan un `created_at` en formato ISO (`new Date().toISOString()`),
 * mientras que las filas nuevas usan el formato nativo de Postgres — un
 * `<` de strings entre ambos formatos da un orden incorrecto. */
export async function getPersonajes(proyectoId: string): Promise<Personaje[]> {
  const rows = await db.select().from(personajes).where(eq(personajes.proyectoId, proyectoId));
  return rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/** Personajes DEL ESTUDIO (`proyectoId` null) — no pertenecen a ningún
 * proyecto, reutilizables en cualquiera. Mismo criterio de orden que
 * `getPersonajes`. */
export async function getPersonajesDelEstudio(): Promise<Personaje[]> {
  const rows = await db.select().from(personajes).where(isNull(personajes.proyectoId));
  return rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/** Todos los personajes de todos los proyectos MÁS los del estudio, con el
 * nombre de su proyecto ya resuelto (`""` para los del estudio — la
 * pantalla decide mostrar "Estudio" mirando `proyectoId === null`) — usado
 * por la pantalla global /personajes. Más reciente primero, mismo criterio
 * (y mismo motivo) que `getPersonajes`. */
export async function getTodosLosPersonajes(): Promise<(Personaje & { proyectoNombre: string })[]> {
  const [todosPersonajes, todosProyectos] = await Promise.all([
    db.select().from(personajes),
    db.select().from(proyectos),
  ]);
  const nombrePorProyecto = new Map(todosProyectos.map((p) => [p.id, p.nombre]));
  return todosPersonajes
    .map((p) => ({ ...p, proyectoNombre: p.proyectoId ? (nombrePorProyecto.get(p.proyectoId) ?? "") : "" }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/** `personajeId` es globalmente único — no se acota por proyecto (y no se
 * podría de forma uniforme: un Personaje del estudio no tiene proyecto al
 * que acotar). Esto es lo que permite que un Personaje del estudio
 * funcione idéntico a uno de proyecto en cualquier generación. */
export async function getPersonaje(personajeId: string): Promise<Personaje | null> {
  const rows = await db.select().from(personajes).where(eq(personajes.id, personajeId));
  return rows[0] ?? null;
}

/** Revalida las rutas que muestran este Personaje: siempre la lista
 * global, y además Identidad/Crear del proyecto dueño si tiene uno (los
 * del estudio no aparecen en ninguna pantalla de proyecto). */
function revalidarRutasPersonaje(proyectoId: string | null) {
  revalidatePath("/personajes");
  if (proyectoId) {
    revalidatePath(`/proyectos/${proyectoId}/identidad`);
    revalidatePath(`/proyectos/${proyectoId}/crear`);
  }
}

const PERSONAJE_CAMPOS = [
  "nombre",
  "personalidad",
  "fisica",
  "vestuario",
  "vozDescrita",
  "gestos",
  "muletillas",
] as const satisfies ReadonlyArray<keyof PersonajeInput>;

function leerCamposPersonaje(formData: FormData) {
  return Object.fromEntries(
    PERSONAJE_CAMPOS.map((campo) => [campo, String(formData.get(campo) ?? "").trim()]),
  ) as unknown as PersonajeInput;
}

function leerFotosDeFormData(formData: FormData): string[] {
  return formData
    .getAll("fotosUrls")
    .map((v) => String(v).trim())
    .filter((v) => v.length > 0)
    .slice(0, MAX_FOTOS_PERSONAJE);
}

/** Crea un Personaje nuevo — nunca sobrescribe uno existente, ni siquiera
 * desde los botones de IA ("Generar personaje" crea uno nuevo en la lista,
 * ver ai-tools.tsx / personajes-lista.tsx). `proyectoId: null` = Personaje
 * del estudio. */
export async function createPersonaje(
  proyectoId: string | null,
  formData: FormData,
): Promise<{ id: string }> {
  const valores = leerCamposPersonaje(formData);
  const fotosUrlsJson = leerFotosDeFormData(formData);
  const id = randomUUID();

  await db.insert(personajes).values({ id, proyectoId, ...valores, fotosUrlsJson });

  revalidarRutasPersonaje(proyectoId);
  return { id };
}

export async function updatePersonaje(personajeId: string, formData: FormData) {
  const valores = leerCamposPersonaje(formData);
  const fotosUrlsJson = leerFotosDeFormData(formData);

  const [actualizado] = await db
    .update(personajes)
    .set({ ...valores, fotosUrlsJson })
    .where(eq(personajes.id, personajeId))
    .returning({ proyectoId: personajes.proyectoId });

  revalidarRutasPersonaje(actualizado?.proyectoId ?? null);
}

export async function deletePersonaje(personajeId: string) {
  const existente = await getPersonaje(personajeId);

  await db.delete(personajes).where(eq(personajes.id, personajeId));

  for (const url of parseFotosPersonaje(existente?.fotosUrlsJson)) {
    await eliminarArchivoSubido(url).catch(() => {});
  }

  revalidarRutasPersonaje(existente?.proyectoId ?? null);
}

/** Sube una foto de referencia a un Personaje YA GUARDADO (hasta
 * `MAX_FOTOS_PERSONAJE`) y persiste de inmediato — no espera a que se
 * guarde el resto del formulario. Para un Personaje todavía sin guardar
 * ("+ Nuevo personaje"), usar `subirArchivoTemporal` en su lugar. */
export async function subirFotoPersonaje(personajeId: string, formData: FormData): Promise<string[]> {
  const archivo = formData.get("foto");
  if (!(archivo instanceof File)) throw new Error("No se recibió ningún archivo.");

  const personaje = await getPersonaje(personajeId);
  const fotosActuales = parseFotosPersonaje(personaje?.fotosUrlsJson);
  if (fotosActuales.length >= MAX_FOTOS_PERSONAJE) {
    throw new Error(`Ya tienes ${MAX_FOTOS_PERSONAJE} fotos de referencia — elimina una antes de subir otra.`);
  }

  const url = await guardarArchivoSubido(archivo);
  const fotosNuevas = [...fotosActuales, url];

  await db.update(personajes).set({ fotosUrlsJson: fotosNuevas }).where(eq(personajes.id, personajeId));

  revalidarRutasPersonaje(personaje?.proyectoId ?? null);
  return fotosNuevas;
}

/** Elimina una foto de referencia (y su blob) de un Personaje ya guardado. */
export async function eliminarFotoPersonaje(personajeId: string, url: string): Promise<string[]> {
  const personaje = await getPersonaje(personajeId);
  const fotosNuevas = parseFotosPersonaje(personaje?.fotosUrlsJson).filter((f) => f !== url);

  await db.update(personajes).set({ fotosUrlsJson: fotosNuevas }).where(eq(personajes.id, personajeId));

  await eliminarArchivoSubido(url).catch(() => {});

  revalidarRutasPersonaje(personaje?.proyectoId ?? null);
  return fotosNuevas;
}

/** Sube un archivo sin tocar la base de datos — usado por el formulario
 * "+ Nuevo personaje" mientras el Personaje todavía no existe como fila
 * (no hay a qué fila persistirle la foto todavía). El estado de "cuáles
 * fotos lleva este personaje nuevo" vive en el cliente hasta que se
 * guarda con `createPersonaje`, que sí las persiste todas juntas. */
export async function subirArchivoTemporal(formData: FormData): Promise<string> {
  const archivo = formData.get("foto");
  if (!(archivo instanceof File)) throw new Error("No se recibió ningún archivo.");
  return guardarArchivoSubido(archivo);
}

/** Borra un archivo subido con `subirArchivoTemporal` que el usuario quitó
 * antes de guardar — best effort, nunca bloquea la interacción. */
export async function eliminarArchivoTemporal(url: string): Promise<void> {
  await eliminarArchivoSubido(url).catch(() => {});
}

// ---------------------------------------------------------------------
// Avatares
// ---------------------------------------------------------------------

/** Más reciente primero — ver comentario de `getPersonajes` sobre por qué
 * se compara por fecha real y no por string. */
export async function getAvatares(proyectoId: string): Promise<Avatar[]> {
  const rows = await db.select().from(avatares).where(eq(avatares.proyectoId, proyectoId));
  return rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getAvatarPorId(proyectoId: string, avatarId: string): Promise<Avatar | null> {
  const rows = await db
    .select()
    .from(avatares)
    .where(and(eq(avatares.id, avatarId), eq(avatares.proyectoId, proyectoId)));
  return rows[0] ?? null;
}

const AVATAR_CAMPOS = [
  "nombreFicticio",
  "edad",
  "profesion",
  "nivelConocimiento",
  "problemasFrecuentes",
  "objetivos",
  "miedos",
  "queBuscaAprender",
  "comoConsumeContenido",
  "lenguaje",
] as const satisfies ReadonlyArray<keyof AvatarInput>;

function leerCamposAvatar(formData: FormData) {
  return Object.fromEntries(
    AVATAR_CAMPOS.map((campo) => [campo, String(formData.get(campo) ?? "").trim()]),
  ) as unknown as AvatarInput;
}

/** Crea un Avatar nuevo — nunca sobrescribe uno existente. */
export async function createAvatar(proyectoId: string, formData: FormData): Promise<{ id: string }> {
  const valores = leerCamposAvatar(formData);
  const id = randomUUID();

  await db.insert(avatares).values({ id, proyectoId, ...valores });

  revalidatePath(`/proyectos/${proyectoId}/identidad`);
  revalidatePath(`/proyectos/${proyectoId}/crear`);
  return { id };
}

export async function updateAvatar(proyectoId: string, avatarId: string, formData: FormData) {
  const valores = leerCamposAvatar(formData);

  await db
    .update(avatares)
    .set(valores)
    .where(and(eq(avatares.id, avatarId), eq(avatares.proyectoId, proyectoId)));

  revalidatePath(`/proyectos/${proyectoId}/identidad`);
  revalidatePath(`/proyectos/${proyectoId}/crear`);
}

export async function deleteAvatar(proyectoId: string, avatarId: string) {
  await db.delete(avatares).where(and(eq(avatares.id, avatarId), eq(avatares.proyectoId, proyectoId)));

  revalidatePath(`/proyectos/${proyectoId}/identidad`);
  revalidatePath(`/proyectos/${proyectoId}/crear`);
}

// ---------------------------------------------------------------------
// Biblioteca (Bloques)
// ---------------------------------------------------------------------

/**
 * Purga definitivamente los bloques en papelera cuyo plazo de retención
 * (7 días desde que se eliminaron) ya venció. Sin cron: se ejecuta de
 * forma perezosa cada vez que se lee la biblioteca o la papelera.
 */
async function purgarPapeleraVencida() {
  const corteMs = Date.now() - PAPELERA_RETENCION_DIAS * 24 * 60 * 60 * 1000;
  const corte = new Date(corteMs).toISOString();
  await db
    .delete(bloques)
    .where(and(eq(bloques.estado, "papelera"), lt(bloques.eliminadoAt, corte)));
}

function diasRestantesEnPapelera(eliminadoAt: string): number {
  const msTranscurridos = Date.now() - new Date(eliminadoAt).getTime();
  const diasTranscurridos = msTranscurridos / (24 * 60 * 60 * 1000);
  return Math.max(0, Math.ceil(PAPELERA_RETENCION_DIAS - diasTranscurridos));
}

export async function getBloques(proyectoId: string) {
  await purgarPapeleraVencida();
  const rows = await db
    .select()
    .from(bloques)
    .where(and(eq(bloques.proyectoId, proyectoId), eq(bloques.estado, "activo")));
  return rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** Los bloques activos de TODOS los proyectos (sin archivados ni
 * papelera), con el nombre de su proyecto ya resuelto — usado por la
 * pantalla global /biblioteca. Más recientes primero. */
export async function getTodosLosBloquesActivos() {
  await purgarPapeleraVencida();
  const [todosBloques, todosProyectos] = await Promise.all([
    db.select().from(bloques).where(eq(bloques.estado, "activo")),
    db.select().from(proyectos),
  ]);
  const nombrePorProyecto = new Map(todosProyectos.map((p) => [p.id, p.nombre]));
  return todosBloques
    .map((b) => ({ ...b, proyectoNombre: nombrePorProyecto.get(b.proyectoId) ?? "" }))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getBloquesArchivados(proyectoId: string) {
  const rows = await db
    .select()
    .from(bloques)
    .where(and(eq(bloques.proyectoId, proyectoId), eq(bloques.estado, "archivado")));
  return rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getPapelera(proyectoId: string) {
  await purgarPapeleraVencida();
  const rows = await db
    .select()
    .from(bloques)
    .where(and(eq(bloques.proyectoId, proyectoId), eq(bloques.estado, "papelera")));
  return rows
    .sort((a, b) => (a.eliminadoAt < b.eliminadoAt ? 1 : -1))
    .map((bloque) => ({ ...bloque, diasRestantes: diasRestantesEnPapelera(bloque.eliminadoAt) }));
}

export async function getBloque(proyectoId: string, bloqueId: string) {
  const rows = await db
    .select()
    .from(bloques)
    .where(and(eq(bloques.id, bloqueId), eq(bloques.proyectoId, proyectoId)));
  return rows[0] ?? null;
}

/**
 * Genera una pieza de contenido con IA para el wizard de "Crear". Compila
 * la identidad del proyecto automáticamente — el cliente nunca maneja
 * Marca/Personaje/Estilo/Avatar directamente. No escribe en la base de
 * datos; el usuario revisa el resultado y confirma con "Guardar en
 * Biblioteca" (que sigue siendo `createBloque`, sin cambios).
 */
export async function generarContenidoAction(
  proyectoId: string,
  input: Omit<ContenidoInput, "identidadCompilada" | "conocimientoRelevante"> & {
    /** Casillas "Qué incluir en esta pieza" de Crear — controlan qué
     * secciones del Compilador se pasan a esta generación en particular.
     * Nunca se guardan; solo viven mientras dura este llamado. */
    incluirPersonaje?: boolean;
    incluirMarca?: boolean;
    incluirContacto?: boolean;
    /** Por defecto true (mismo criterio que las otras casillas cuando no
     * llegan). En false, ni siquiera se consulta la Base de Conocimiento —
     * no solo se omite del prompt. */
    incluirConocimiento?: boolean;
    /** Cuál Personaje/Avatar de la lista del proyecto usar en esta
     * generación (selector en Crear cuando hay más de uno). Ausente/vacío
     * = ninguno seleccionado, la sección respectiva se omite. */
    personajeId?: string;
    avatarId?: string;
  },
): Promise<ContenidoGenerado> {
  const { incluirPersonaje, incluirMarca, incluirContacto, incluirConocimiento, personajeId, avatarId, ...resto } =
    input;
  const [identidad, personaje, avatar] = await Promise.all([
    getIdentidad(proyectoId),
    // Sin acotar por proyecto a propósito: personajeId puede ser un
    // Personaje del estudio, que no pertenece a este (ni a ningún) proyecto.
    personajeId ? getPersonaje(personajeId) : Promise.resolve(null),
    avatarId ? getAvatarPorId(proyectoId, avatarId) : Promise.resolve(null),
  ]);
  const identidadCompilada = identidad
    ? compileIdentity(identidad, { incluirPersonaje, incluirMarca, incluirContacto, personaje, avatar })
    : "";
  const conocimientoRelevante =
    incluirConocimiento === false ? "" : await conocimientoRelevantePara(proyectoId, input.tema);
  return generarContenido({
    ...resto,
    identidadCompilada,
    conocimientoRelevante: conocimientoRelevante || undefined,
  });
}

/**
 * "Crear rápido": infiere la configuración de producción a partir de una
 * idea libre. El cliente siempre debe mostrar el resultado como un resumen
 * editable para confirmar antes de llamar a `generarContenidoAction` — esta
 * función nunca genera el contenido final por sí sola. Usa el Personaje y
 * el Avatar más recientes del proyecto (si hay varios) solo para informar
 * mejor la inferencia — no hay casillas de selección en este paso.
 */
export async function inferirConfiguracionAction(
  proyectoId: string,
  idea: string,
): Promise<ConfiguracionInferida> {
  const [identidad, personaje, avatar] = await Promise.all([
    getIdentidad(proyectoId),
    getPersonajes(proyectoId).then((lista) => lista[0] ?? null),
    getAvatares(proyectoId).then((lista) => lista[0] ?? null),
  ]);
  const identidadCompilada = identidad ? compileIdentity(identidad, { personaje, avatar }) : "";
  return inferirConfiguracion(idea, identidadCompilada);
}

/** Parsea el `escenasJson` que llega serializado como string desde un
 * FormData (siempre string, incluso para campos que representan JSON) al
 * valor que espera la columna `jsonb`. Ante JSON inválido, no revienta el
 * guardado del resto del bloque — simplemente no guarda escenas. */
function parsearEscenasDeFormData(valor: string): unknown {
  try {
    return JSON.parse(valor);
  } catch {
    return null;
  }
}

/**
 * Crea un bloque manualmente o desde una generación de IA, y guarda, junto
 * con el texto, el bloque de identidad exacto que el Compilador produjo en
 * ese momento — evidencia de que la identidad se usó, y de qué decía.
 * `escenasJson` es opcional: solo viene poblado desde el flujo de "Crear"
 * con IA; las piezas manuales no lo usan. `personajeId` (si vino del
 * selector de Crear) queda guardado en el bloque — es lo que después usa
 * `generarImagenParaEscena` para tomar la foto de referencia correcta.
 */
export async function createBloque(proyectoId: string, formData: FormData) {
  const titulo = String(formData.get("titulo") ?? "").trim();
  const formato = String(formData.get("formato") ?? "manual").trim();
  const texto = String(formData.get("texto") ?? "").trim();
  if (!titulo || !texto) throw new Error("El bloque necesita título y texto.");

  const escenasJsonRaw = formData.get("escenasJson");
  const escenasJson =
    typeof escenasJsonRaw === "string" && escenasJsonRaw.trim()
      ? parsearEscenasDeFormData(escenasJsonRaw)
      : null;

  const personajeId = String(formData.get("personajeId") ?? "").trim() || null;
  const avatarId = String(formData.get("avatarId") ?? "").trim() || null;

  const [identidad, personaje, avatar] = await Promise.all([
    getIdentidad(proyectoId),
    personajeId ? getPersonaje(personajeId) : Promise.resolve(null),
    avatarId ? getAvatarPorId(proyectoId, avatarId) : Promise.resolve(null),
  ]);
  const identidadCompilada = identidad ? compileIdentity(identidad, { personaje, avatar }) : "";

  await db.insert(bloques).values({
    id: randomUUID(),
    proyectoId,
    personajeId,
    titulo,
    formato,
    texto,
    identidadCompilada,
    escenasJson,
  });

  revalidatePath(`/proyectos/${proyectoId}/biblioteca`);
  revalidatePath("/biblioteca");
}

/** Actualiza título/formato/texto y, opcionalmente, `escenasJson`.
 * `identidadCompilada` queda congelado desde la creación — es evidencia de
 * qué identidad se usó entonces. `escenasJson` solo se toca si vino
 * explícitamente en el formData (el formulario de texto plano, sin
 * escenas, nunca lo envía — así no se borra por accidente). */
export async function updateBloque(proyectoId: string, bloqueId: string, formData: FormData) {
  const titulo = String(formData.get("titulo") ?? "").trim();
  const formato = String(formData.get("formato") ?? "manual").trim();
  const texto = String(formData.get("texto") ?? "").trim();
  if (!titulo || !texto) throw new Error("El bloque necesita título y texto.");

  const actualizacion: { titulo: string; formato: string; texto: string; escenasJson?: unknown } = {
    titulo,
    formato,
    texto,
  };

  const escenasJsonRaw = formData.get("escenasJson");
  if (escenasJsonRaw !== null) {
    const valor = String(escenasJsonRaw);
    actualizacion.escenasJson = valor.trim() ? parsearEscenasDeFormData(valor) : null;
  }

  await db
    .update(bloques)
    .set(actualizacion)
    .where(and(eq(bloques.id, bloqueId), eq(bloques.proyectoId, proyectoId)));

  revalidatePath(`/proyectos/${proyectoId}/biblioteca`);
  revalidatePath("/biblioteca");
}

/**
 * Genera (o regenera) la imagen de una escena específica con IA real
 * (OpenAI). Si el bloque tiene un Personaje asociado (el que estaba
 * seleccionado en Crear al generar esta pieza — ver `createBloque`) y ese
 * Personaje tiene fotos de referencia, se usa automáticamente la primera
 * como referencia; el usuario nunca vuelve a seleccionarla a mano. Sin
 * Personaje asociado, no hay foto de referencia. Persiste el resultado
 * directamente en `escenasJson` (no depende de que el usuario después
 * presione "Guardar cambios": generar una imagen cuesta dinero real, así
 * que no debe poder perderse por no guardar a tiempo).
 */
export async function generarImagenParaEscena(
  proyectoId: string,
  bloqueId: string,
  numeroEscena: number,
  calidad: CalidadImagen,
): Promise<string> {
  const bloque = await getBloque(proyectoId, bloqueId);
  if (!bloque) throw new Error("El bloque ya no existe.");

  const escenas = parseEscenas(bloque.escenasJson);
  const index = escenas.findIndex((e) => e.numero === numeroEscena);
  if (index === -1) throw new Error("Esa escena ya no existe.");

  const promptImagen = escenas[index].promptImagen.trim();
  if (!promptImagen) throw new Error("Esta escena no tiene un prompt de imagen para generar.");

  // Usa la PRIMERA foto del Personaje asociado al bloque como referencia —
  // múltiples referencias a la vez sería una mejora futura del proveedor de
  // imagen, no de esta ronda (ver comentario en imagen-provider.ts).
  const personaje = bloque.personajeId ? await getPersonaje(bloque.personajeId) : null;
  const fotoReferenciaUrl = parseFotosPersonaje(personaje?.fotosUrlsJson).at(0);

  const imagenGeneradaUrl = await generarImagenIA(promptImagen, fotoReferenciaUrl, calidad);

  const nuevasEscenas = escenas.map((e, i) => (i === index ? { ...e, imagenGeneradaUrl } : e));

  await db
    .update(bloques)
    .set({ escenasJson: nuevasEscenas })
    .where(and(eq(bloques.id, bloqueId), eq(bloques.proyectoId, proyectoId)));

  revalidatePath(`/proyectos/${proyectoId}/biblioteca/${bloqueId}/editar`);

  return imagenGeneradaUrl;
}

/**
 * DIRECTOR DE EDICIÓN: analiza una pieza de video ya generada y guarda un
 * plan de edición profesional (ver `generarPlanEdicion` en ai.ts) — nunca
 * se dispara automáticamente, solo cuando el usuario presiona el botón.
 * Se genera una sola vez: si ya existe `planEdicionJson`, quien llama debe
 * usar `regenerar: true` explícitamente para reemplazarlo.
 */
export async function generarPlanEdicionAction(
  proyectoId: string,
  bloqueId: string,
  regenerar = false,
): Promise<PlanEdicion> {
  const bloque = await getBloque(proyectoId, bloqueId);
  if (!bloque) throw new Error("El bloque ya no existe.");

  const planExistente = parsePlanEdicion(bloque.planEdicionJson);
  if (planExistente && !regenerar) return planExistente;

  const escenas = parseEscenas(bloque.escenasJson);
  if (!tieneEscenasDeVideo(escenas)) {
    throw new Error("Esta pieza no tiene escenas de video para generar un plan de edición.");
  }

  const plan = await generarPlanEdicion({
    formato: bloque.formato,
    identidadCompilada: bloque.identidadCompilada,
    texto: bloque.texto,
    escenas: escenas.map((e) => ({
      numero: e.numero,
      duracionSegundos: e.duracionSegundos,
      descripcion: e.descripcion,
      guionHablado: e.guionHablado,
      textoEnPantalla: e.textoEnPantalla,
    })),
  });

  await db
    .update(bloques)
    .set({ planEdicionJson: plan })
    .where(and(eq(bloques.id, bloqueId), eq(bloques.proyectoId, proyectoId)));

  revalidatePath(`/proyectos/${proyectoId}/biblioteca/${bloqueId}/editar`);

  return plan;
}

export async function renombrarBloque(proyectoId: string, bloqueId: string, formData: FormData) {
  const titulo = String(formData.get("titulo") ?? "").trim();
  if (!titulo) throw new Error("El bloque necesita un título.");

  await db
    .update(bloques)
    .set({ titulo })
    .where(and(eq(bloques.id, bloqueId), eq(bloques.proyectoId, proyectoId)));

  revalidatePath(`/proyectos/${proyectoId}/biblioteca`);
  revalidatePath("/biblioteca");
}

export async function duplicarBloque(proyectoId: string, bloqueId: string) {
  const original = await getBloque(proyectoId, bloqueId);
  if (!original) throw new Error("El bloque ya no existe.");

  await db.insert(bloques).values({
    id: randomUUID(),
    proyectoId,
    titulo: `${original.titulo} (copia)`,
    formato: original.formato,
    texto: original.texto,
    identidadCompilada: original.identidadCompilada,
    escenasJson: original.escenasJson,
    estado: "activo",
  });

  revalidatePath(`/proyectos/${proyectoId}/biblioteca`);
  revalidatePath("/biblioteca");
}

export async function moverBloqueAProyecto(
  bloqueId: string,
  proyectoActualId: string,
  nuevoProyectoId: string,
) {
  await db
    .update(bloques)
    .set({ proyectoId: nuevoProyectoId })
    .where(and(eq(bloques.id, bloqueId), eq(bloques.proyectoId, proyectoActualId)));

  revalidatePath(`/proyectos/${proyectoActualId}/biblioteca`);
  revalidatePath(`/proyectos/${nuevoProyectoId}/biblioteca`);
  revalidatePath("/biblioteca");
}

export async function archivarBloque(proyectoId: string, bloqueId: string) {
  await db
    .update(bloques)
    .set({ estado: "archivado" })
    .where(and(eq(bloques.id, bloqueId), eq(bloques.proyectoId, proyectoId)));
  revalidatePath(`/proyectos/${proyectoId}/biblioteca`);
  revalidatePath("/biblioteca");
}

export async function desarchivarBloque(proyectoId: string, bloqueId: string) {
  await db
    .update(bloques)
    .set({ estado: "activo" })
    .where(and(eq(bloques.id, bloqueId), eq(bloques.proyectoId, proyectoId)));
  revalidatePath(`/proyectos/${proyectoId}/biblioteca`);
  revalidatePath("/biblioteca");
}

/** Elimina "suavemente": el bloque va a la papelera y desaparece de
 * inmediato de la Biblioteca, pero se puede recuperar durante 7 días. */
export async function moverAPapelera(proyectoId: string, bloqueId: string) {
  await db
    .update(bloques)
    .set({ estado: "papelera", eliminadoAt: new Date().toISOString() })
    .where(and(eq(bloques.id, bloqueId), eq(bloques.proyectoId, proyectoId)));
  revalidatePath(`/proyectos/${proyectoId}/biblioteca`);
  revalidatePath("/biblioteca");
}

export async function restaurarBloque(proyectoId: string, bloqueId: string) {
  await db
    .update(bloques)
    .set({ estado: "activo", eliminadoAt: "" })
    .where(and(eq(bloques.id, bloqueId), eq(bloques.proyectoId, proyectoId)));
  revalidatePath(`/proyectos/${proyectoId}/biblioteca`);
  revalidatePath("/biblioteca");
}

/** Elimina para siempre, sin pasar por la papelera (o desde la papelera). */
export async function eliminarBloquePermanente(proyectoId: string, bloqueId: string) {
  await db
    .delete(bloques)
    .where(and(eq(bloques.id, bloqueId), eq(bloques.proyectoId, proyectoId)));
  revalidatePath(`/proyectos/${proyectoId}/biblioteca`);
  revalidatePath("/biblioteca");
}

// ---------------------------------------------------------------------
// Activos
// ---------------------------------------------------------------------

export async function getActivos(proyectoId: string) {
  const rows = await db.select().from(activos).where(eq(activos.proyectoId, proyectoId));
  return rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function createActivoTexto(proyectoId: string, formData: FormData) {
  const tipo = String(formData.get("tipo") ?? "").trim();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const valor = String(formData.get("valor") ?? "").trim();
  const notas = String(formData.get("notas") ?? "").trim();
  if (!tipo || !nombre) throw new Error("El activo necesita tipo y nombre.");

  await db.insert(activos).values({ id: randomUUID(), proyectoId, tipo, nombre, valor, notas });
  revalidatePath(`/proyectos/${proyectoId}/activos`);
}

export async function createActivoArchivo(proyectoId: string, formData: FormData) {
  const tipo = String(formData.get("tipo") ?? "").trim();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const notas = String(formData.get("notas") ?? "").trim();
  const archivo = formData.get("archivo");
  if (!tipo || !nombre) throw new Error("El activo necesita tipo y nombre.");
  if (!(archivo instanceof File)) throw new Error("No se recibió ningún archivo.");

  const valor = await guardarArchivoSubido(archivo);

  await db.insert(activos).values({ id: randomUUID(), proyectoId, tipo, nombre, valor, notas });
  revalidatePath(`/proyectos/${proyectoId}/activos`);
}

export async function deleteActivo(proyectoId: string, activoId: string) {
  const rows = await db
    .select()
    .from(activos)
    .where(and(eq(activos.id, activoId), eq(activos.proyectoId, proyectoId)));
  const activo = rows[0];

  await db.delete(activos).where(and(eq(activos.id, activoId), eq(activos.proyectoId, proyectoId)));

  const esTipoArchivo = TIPOS_ACTIVO.find((t) => t.value === activo?.tipo)?.archivo ?? false;
  if (activo?.valor && esTipoArchivo) {
    await eliminarArchivoSubido(activo.valor).catch(() => {});
  }

  revalidatePath(`/proyectos/${proyectoId}/activos`);
}

// ---------------------------------------------------------------------
// Segundo Cerebro (Notas)
// ---------------------------------------------------------------------

/** Todas las notas, de cualquier proyecto o sin vincular — el filtrado por
 * proyecto/"sin vincular" se hace en el cliente, igual que en Biblioteca. */
export async function getNotas() {
  const rows = await db.select().from(notas);
  return rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** Guarda una idea con cero fricción: solo el texto es obligatorio. Se
 * puede vincular a un proyecto después, nunca al momento de crearla. */
export async function createNota(formData: FormData) {
  const texto = String(formData.get("texto") ?? "").trim();
  if (!texto) throw new Error("La nota necesita texto.");

  await db.insert(notas).values({ id: randomUUID(), texto });
  revalidatePath("/segundo-cerebro");
  revalidatePath("/");
}

/** Vincula o desvincula (proyectoId null) una nota a un proyecto — siempre
 * una acción manual del usuario, la IA nunca decide esto por su cuenta. */
export async function vincularNota(notaId: string, proyectoId: string | null) {
  await db.update(notas).set({ proyectoId }).where(eq(notas.id, notaId));
  revalidatePath("/segundo-cerebro");
  revalidatePath("/");
}

/** Borrado directo, sin papelera — son apuntes rápidos de bajo riesgo. */
export async function deleteNota(notaId: string) {
  await db.delete(notas).where(eq(notas.id, notaId));
  revalidatePath("/segundo-cerebro");
  revalidatePath("/");
}

// ---------------------------------------------------------------------
// Base de Conocimiento
// ---------------------------------------------------------------------

export async function getConocimiento(proyectoId: string) {
  const rows = await db.select().from(conocimiento).where(eq(conocimiento.proyectoId, proyectoId));
  return rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function createConocimiento(proyectoId: string, formData: FormData) {
  const titulo = String(formData.get("titulo") ?? "").trim();
  const contenido = String(formData.get("contenido") ?? "").trim();
  if (!titulo || !contenido) throw new Error("La entrada necesita título y contenido.");

  await db.insert(conocimiento).values({ id: randomUUID(), proyectoId, titulo, contenido });
  revalidatePath(`/proyectos/${proyectoId}/identidad`);
}

export async function deleteConocimiento(proyectoId: string, conocimientoId: string) {
  await db
    .delete(conocimiento)
    .where(and(eq(conocimiento.id, conocimientoId), eq(conocimiento.proyectoId, proyectoId)));
  revalidatePath(`/proyectos/${proyectoId}/identidad`);
}

// ---------------------------------------------------------------------
// Reutilización Inteligente
// ---------------------------------------------------------------------

const MAX_RESULTADOS_POR_FUENTE = 5;

export type ContenidoRelacionado = {
  biblioteca: ResultadoRelacionado[];
  conocimiento: ResultadoRelacionado[];
  segundoCerebro: ResultadoRelacionado[];
};

/**
 * Busca coincidencias simples por palabras clave (sin embeddings, sin
 * búsqueda semántica) entre `tema` y tres fuentes de este proyecto:
 * Biblioteca (bloques activos), Base de Conocimiento, y las notas del
 * Segundo Cerebro ya vinculadas a este proyecto. Máximo 5 resultados por
 * fuente; ninguno si el tema no tiene palabras clave reales o no hay
 * coincidencias razonables.
 */
export async function buscarContenidoRelacionado(
  proyectoId: string,
  tema: string,
): Promise<ContenidoRelacionado> {
  const palabrasClave = extraerPalabrasClave(tema);
  if (palabrasClave.length === 0) {
    return { biblioteca: [], conocimiento: [], segundoCerebro: [] };
  }

  const [bloquesProyecto, conocimientoProyecto, notasProyecto] = await Promise.all([
    db.select().from(bloques).where(and(eq(bloques.proyectoId, proyectoId), eq(bloques.estado, "activo"))),
    db.select().from(conocimiento).where(eq(conocimiento.proyectoId, proyectoId)),
    db.select().from(notas).where(eq(notas.proyectoId, proyectoId)),
  ]);

  const biblioteca = rankearResultados(
    bloquesProyecto,
    (b) => `${b.titulo} ${b.texto}`,
    (b) => ({ id: b.id, titulo: b.titulo, fragmento: extraerFragmento(b.texto) }),
    palabrasClave,
    MAX_RESULTADOS_POR_FUENTE,
  );

  const conocimientoResultados = rankearResultados(
    conocimientoProyecto,
    (c) => `${c.titulo} ${c.contenido}`,
    (c) => ({ id: c.id, titulo: c.titulo, fragmento: extraerFragmento(c.contenido) }),
    palabrasClave,
    MAX_RESULTADOS_POR_FUENTE,
  );

  const segundoCerebro = rankearResultados(
    notasProyecto,
    (n) => n.texto,
    (n) => ({ id: n.id, titulo: extraerFragmento(n.texto, 40), fragmento: extraerFragmento(n.texto) }),
    palabrasClave,
    MAX_RESULTADOS_POR_FUENTE,
  );

  return { biblioteca, conocimiento: conocimientoResultados, segundoCerebro };
}

/**
 * Igual que la búsqueda de Conocimiento dentro de `buscarContenidoRelacionado`,
 * pero para inyectar en el prompt de generación en vez de mostrar en el
 * panel — por eso usa el `contenido` completo de cada entrada, no el
 * fragmento recortado para UI. Devuelve "" si no hay coincidencias.
 */
async function conocimientoRelevantePara(proyectoId: string, tema: string): Promise<string> {
  const palabrasClave = extraerPalabrasClave(tema);
  if (palabrasClave.length === 0) return "";

  const conocimientoProyecto = await db
    .select()
    .from(conocimiento)
    .where(eq(conocimiento.proyectoId, proyectoId));

  const relevante = rankearResultados(
    conocimientoProyecto,
    (c) => `${c.titulo} ${c.contenido}`,
    (c) => ({ id: c.id, titulo: c.titulo, fragmento: c.contenido }),
    palabrasClave,
    MAX_RESULTADOS_POR_FUENTE,
  );

  return relevante.map((r) => `${r.titulo}\n${r.fragmento}`).join("\n\n");
}

// ---------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------

/** Datos para la pantalla de inicio: proyecto más reciente ("continuar
 * donde quedé"), proyectos recientes, contenido reciente entre todos los
 * proyectos, y cuántas notas del Segundo Cerebro todavía no se vinculan
 * a ningún proyecto. */
export async function getDashboardData() {
  const todosProyectos = await db.select().from(proyectos);
  // Solo las columnas que realmente usa el dashboard (fecha de actividad y
  // logo) — no trae la identidad completa (voz, personaje, avatar, etc.).
  const identidadesResumen = await db
    .select({
      proyectoId: identidades.proyectoId,
      updatedAt: identidades.updatedAt,
      logoUrl: identidades.logoUrl,
    })
    .from(identidades);
  const identidadPorProyecto = new Map(identidadesResumen.map((i) => [i.proyectoId, i]));
  const bloquesActivos = await db.select().from(bloques).where(eq(bloques.estado, "activo"));
  // Solo id+nombre — el mismo criterio liviano que `identidadesResumen`, para
  // resolver "proyecto · personaje · fecha" en Contenidos recientes.
  const personajesResumen = await db.select({ id: personajes.id, nombre: personajes.nombre }).from(personajes);
  const nombrePorPersonaje = new Map(personajesResumen.map((p) => [p.id, p.nombre]));

  // Ya se consultan todos los bloques activos para "Contenidos recientes" —
  // se reutiliza esa misma lista para el conteo por proyecto, sin agregar
  // una consulta nueva.
  const conteoContenidosPorProyecto = new Map<string, number>();
  for (const b of bloquesActivos) {
    conteoContenidosPorProyecto.set(b.proyectoId, (conteoContenidosPorProyecto.get(b.proyectoId) ?? 0) + 1);
  }

  function ultimaActividad(p: { id: string; createdAt: string }): string {
    return identidadPorProyecto.get(p.id)?.updatedAt ?? p.createdAt;
  }

  const proyectosOrdenados = [...todosProyectos]
    .sort((a, b) => (ultimaActividad(a) < ultimaActividad(b) ? 1 : -1))
    .map((p) => ({
      ...p,
      ultimaActividad: ultimaActividad(p),
      totalContenidos: conteoContenidosPorProyecto.get(p.id) ?? 0,
      logoUrl: identidadPorProyecto.get(p.id)?.logoUrl ?? "",
    }));

  const nombrePorProyecto = new Map(todosProyectos.map((p) => [p.id, p.nombre]));
  const bloquesRecientes = bloquesActivos
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 6)
    .map((b) => ({
      ...b,
      proyectoNombre: nombrePorProyecto.get(b.proyectoId) ?? "",
      personajeNombre: b.personajeId ? (nombrePorPersonaje.get(b.personajeId) ?? "") : "",
    }));

  const notasSinVincular = (await db.select().from(notas).where(isNull(notas.proyectoId))).length;

  return {
    proyectoReciente: proyectosOrdenados[0] ?? null,
    proyectosRecientes: proyectosOrdenados.slice(0, 5),
    bloquesRecientes,
    notasSinVincular,
  };
}
