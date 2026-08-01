"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  activos,
  area,
  avatares,
  bloques,
  documentos,
  identidades,
  notas,
  personajes,
  planos,
  promptsGuardados,
  proyectos,
  storyboardEscenas,
  storyboardEscenasPersonajes,
} from "@/db/schema";
import { compileIdentity } from "./identity-compiler";
import type { PosicionLogo } from "./identity-compiler";
import { completarProyecto, generarPersonaje, generarPlanEdicion, revisarEscena } from "./ai";
import type { EscenaRevisada, IdentidadCompletaSugerida, PersonajeSugerido, PlanEdicion } from "./ai";
import { extraerPalabrasClave, rankearResultados, extraerFragmento } from "./reutilizacion";
import { generarImagenIA } from "./imagen-provider";
import { guardarArchivoSubido, eliminarArchivoSubido } from "./storage";
import {
  CAMPOS_VERSION_PERSONAJE,
  esConversionAVideo,
  fotoPrincipal,
  MAX_FOTOS_PERSONAJE,
  parseEscenas,
  parseFotosContextoPersonaje,
  parseFotosPersonaje,
  parsePersonajeIds,
  parsePlanEdicion,
  parseVersionesPersonaje,
  TIPOS_ACTIVO,
  TIPOS_FOTO_PERSONAJE,
} from "./types";
import type {
  Area,
  Avatar,
  AvatarInput,
  CalidadImagen,
  Documento,
  Escena,
  FotoContextoPersonaje,
  FotoPersonaje,
  Identidad,
  IdentidadInput,
  Personaje,
  PersonajeInput,
  Plano,
  PromptGuardado,
  Proyecto,
  StoryboardEscenaConPersonajes,
  TipoFotoPersonaje,
} from "./types";

const PAPELERA_RETENCION_DIAS = 7;

// ---------------------------------------------------------------------
// Proyectos
// ---------------------------------------------------------------------

export async function getProyectos() {
  return db.select().from(proyectos).orderBy(proyectos.createdAt);
}

/** Cuántas piezas activas (no archivadas ni en papelera) tiene guardadas
 * cada proyecto en su Biblioteca — mismo criterio que `totalContenidos`
 * del dashboard. Se usa para marcar los proyectos sin contenido en el
 * listado de /proyectos. */
export async function getConteoContenidoPorProyecto(): Promise<Record<string, number>> {
  const bloquesActivos = await db
    .select({ proyectoId: bloques.proyectoId })
    .from(bloques)
    .where(eq(bloques.estado, "activo"));
  const conteo: Record<string, number> = {};
  for (const b of bloquesActivos) {
    conteo[b.proyectoId] = (conteo[b.proyectoId] ?? 0) + 1;
  }
  return conteo;
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
  // Opcional: mismo resultado que asignarla después desde Configuración,
  // solo que en un paso — "" (Sin Área) es el default del selector.
  const areaId = String(formData.get("areaId") ?? "").trim() || null;
  if (!nombre) throw new Error("El proyecto necesita un nombre.");

  const proyectoId = randomUUID();

  await db.insert(proyectos).values({ id: proyectoId, nombre, descripcion, areaId });
  await db.insert(identidades).values({ id: randomUUID(), proyectoId });

  revalidatePath("/proyectos");
  revalidatePath("/areas");
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

/** Asigna o quita (areaId null) el Área de un proyecto existente. */
export async function asignarAreaProyecto(proyectoId: string, areaId: string | null) {
  await db.update(proyectos).set({ areaId }).where(eq(proyectos.id, proyectoId));
  revalidatePath("/proyectos");
  revalidatePath("/areas");
  if (areaId) revalidatePath(`/areas/${areaId}`);
}

// ---------------------------------------------------------------------
// Áreas de Conocimiento
// ---------------------------------------------------------------------

export async function getAreas(): Promise<Area[]> {
  return db.select().from(area).orderBy(area.createdAt);
}

export async function getArea(id: string): Promise<Area | null> {
  const rows = await db.select().from(area).where(eq(area.id, id));
  return rows[0] ?? null;
}

export async function getProyectosDeArea(areaId: string): Promise<Proyecto[]> {
  return db.select().from(proyectos).where(eq(proyectos.areaId, areaId)).orderBy(proyectos.createdAt);
}

export async function createArea(formData: FormData) {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  if (!nombre) throw new Error("El Área necesita un nombre.");

  const id = randomUUID();
  await db.insert(area).values({ id, nombre, descripcion });

  revalidatePath("/areas");
  revalidatePath("/proyectos");
  redirect(`/areas/${id}`);
}

export async function updateArea(id: string, formData: FormData) {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  if (!nombre) throw new Error("El Área necesita un nombre.");

  await db.update(area).set({ nombre, descripcion }).where(eq(area.id, id));

  revalidatePath("/areas");
  revalidatePath(`/areas/${id}`);
}

/** Borra el Área — sus proyectos quedan "sin Área" (areaId set null por
 * la FK), sus documentos propios de Área se borran en cascada. */
export async function deleteArea(id: string) {
  await db.delete(area).where(eq(area.id, id));
  revalidatePath("/areas");
  revalidatePath("/proyectos");
  redirect("/areas");
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
  "historia",
  "valores",
  "audiencia",
  "competidores",
  "manualMarca",
  "ctaHabituales",
  "hashtagsFrecuentes",
  "restricciones",
  "promesa",
  "posicionamiento",
  "arquetipo",
  "manifiesto",
  "emociones",
  "impactoEsperado",
  "adaptacionAudiencia",
  "formalidad",
  "humor",
  "nivelTecnico",
  "palabrasSiempre",
  "palabrasNunca",
  "frasesCaracteristicas",
  "estructuraContenidos",
  "respuestaCriticas",
  "diferenciadores",
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

// Mismos campos que captura un snapshot de versión — una sola lista de
// verdad para el formulario, el guardado y el versionado.
const PERSONAJE_CAMPOS = CAMPOS_VERSION_PERSONAJE;

function leerCamposPersonaje(formData: FormData) {
  return Object.fromEntries(
    PERSONAJE_CAMPOS.map((campo) => [campo, String(formData.get(campo) ?? "").trim()]),
  ) as unknown as PersonajeInput;
}

/** Cada foto ya subida viaja como un `<input type="hidden" name="fotos">`
 * con su `{url, tipo}` serializado en JSON (ver `FotosPersonaje`) —
 * entradas con JSON inválido o `tipo` desconocido se descartan en
 * silencio. Además, cada slot vacío expone su propio campo de texto
 * `foto-{tipo}` (el "pega el enlace" de `FileUploader`) para una URL
 * pegada a mano que nunca pasó por `subirFotoPersonaje`/
 * `subirArchivoTemporal` — se usa solo si ese tipo no llegó ya por el
 * campo `fotos`. */
function leerFotosDeFormData(formData: FormData): FotoPersonaje[] {
  const desdeJson = formData
    .getAll("fotos")
    .map((v) => {
      try {
        return JSON.parse(String(v)) as unknown;
      } catch {
        return null;
      }
    })
    .filter(
      (v): v is FotoPersonaje =>
        typeof v === "object" &&
        v !== null &&
        typeof (v as { url?: unknown }).url === "string" &&
        (TIPOS_FOTO_PERSONAJE as readonly string[]).includes((v as { tipo?: unknown }).tipo as string),
    );

  const desdePegado = TIPOS_FOTO_PERSONAJE.map((tipo) => {
    const url = String(formData.get(`foto-${tipo}`) ?? "").trim();
    return url ? { url, tipo } : null;
  }).filter((v): v is FotoPersonaje => v !== null);

  const combinado = [...desdeJson];
  for (const foto of desdePegado) {
    if (!combinado.some((f) => f.tipo === foto.tipo)) combinado.push(foto);
  }
  return combinado.slice(0, MAX_FOTOS_PERSONAJE);
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

  for (const foto of parseFotosPersonaje(existente?.fotosUrlsJson)) {
    await eliminarArchivoSubido(foto.url).catch(() => {});
  }

  revalidarRutasPersonaje(existente?.proyectoId ?? null);
}

/** Guarda un snapshot de la ficha de texto ACTUAL del Personaje (las fotos
 * no se versionan — siguen siendo las actuales) al final de su lista de
 * versiones, con un nombre libre opcional. Nunca modifica la ficha. */
export async function guardarVersionPersonaje(personajeId: string, nombreVersion: string) {
  const personaje = await getPersonaje(personajeId);
  if (!personaje) throw new Error("El personaje ya no existe.");

  const campos = Object.fromEntries(
    CAMPOS_VERSION_PERSONAJE.map((campo) => [campo, personaje[campo]]),
  ) as Record<(typeof CAMPOS_VERSION_PERSONAJE)[number], string>;

  const versiones = [
    ...parseVersionesPersonaje(personaje.versionesJson),
    { fecha: new Date().toISOString(), nombre: nombreVersion.trim(), campos },
  ];

  await db.update(personajes).set({ versionesJson: versiones }).where(eq(personajes.id, personajeId));

  revalidarRutasPersonaje(personaje.proyectoId);
}

/** Restaura la ficha de texto del Personaje a la versión `indice` de su
 * lista. Las fotos y la lista de versiones quedan intactas — restaurar no
 * borra historia, así que siempre se puede volver a la ficha previa si
 * antes se guardó como versión. */
export async function restaurarVersionPersonaje(personajeId: string, indice: number) {
  const personaje = await getPersonaje(personajeId);
  if (!personaje) throw new Error("El personaje ya no existe.");

  const version = parseVersionesPersonaje(personaje.versionesJson)[indice];
  if (!version) throw new Error("Esa versión ya no existe.");

  const valores = Object.fromEntries(
    CAMPOS_VERSION_PERSONAJE.map((campo) => [campo, version.campos[campo] ?? ""]),
  );

  await db.update(personajes).set(valores).where(eq(personajes.id, personajeId));

  revalidarRutasPersonaje(personaje.proyectoId);
}

/** Elimina la versión `indice` de la lista — la ficha actual no cambia. */
export async function eliminarVersionPersonaje(personajeId: string, indice: number) {
  const personaje = await getPersonaje(personajeId);
  if (!personaje) throw new Error("El personaje ya no existe.");

  const versiones = parseVersionesPersonaje(personaje.versionesJson).filter((_, i) => i !== indice);

  await db.update(personajes).set({ versionesJson: versiones }).where(eq(personajes.id, personajeId));

  revalidarRutasPersonaje(personaje.proyectoId);
}

/** Sube una foto de referencia de un `tipo` específico (rostro/perfil/
 * medioCuerpo/cuerpoCompleto) a un Personaje YA GUARDADO, y persiste de
 * inmediato — no espera a que se guarde el resto del formulario. Cada tipo
 * es su propio slot fijo: subir a un tipo que ya tenía foto REEMPLAZA esa
 * foto (borra el blob viejo), no la agrega como una quinta. Para un
 * Personaje todavía sin guardar ("+ Nuevo personaje"), usar
 * `subirArchivoTemporal` en su lugar. */
export async function subirFotoPersonaje(
  personajeId: string,
  tipo: TipoFotoPersonaje,
  formData: FormData,
): Promise<FotoPersonaje[]> {
  const archivo = formData.get("foto");
  if (!(archivo instanceof File)) throw new Error("No se recibió ningún archivo.");

  const personaje = await getPersonaje(personajeId);
  const fotosActuales = parseFotosPersonaje(personaje?.fotosUrlsJson);
  const fotoReemplazada = fotosActuales.find((f) => f.tipo === tipo);

  const url = await guardarArchivoSubido(archivo);
  const fotosNuevas = [...fotosActuales.filter((f) => f.tipo !== tipo), { url, tipo }];

  await db.update(personajes).set({ fotosUrlsJson: fotosNuevas }).where(eq(personajes.id, personajeId));

  if (fotoReemplazada) await eliminarArchivoSubido(fotoReemplazada.url).catch(() => {});

  revalidarRutasPersonaje(personaje?.proyectoId ?? null);
  return fotosNuevas;
}

/** Elimina una foto de referencia (y su blob) de un Personaje ya guardado —
 * identificada por su URL, no por tipo (cada URL es única entre las 4). */
export async function eliminarFotoPersonaje(personajeId: string, url: string): Promise<FotoPersonaje[]> {
  const personaje = await getPersonaje(personajeId);
  const fotosNuevas = parseFotosPersonaje(personaje?.fotosUrlsJson).filter((f) => f.url !== url);

  await db.update(personajes).set({ fotosUrlsJson: fotosNuevas }).where(eq(personajes.id, personajeId));

  await eliminarArchivoSubido(url).catch(() => {});

  revalidarRutasPersonaje(personaje?.proyectoId ?? null);
  return fotosNuevas;
}

/** Sube una foto a la galería ADICIONAL de contexto (etiqueta libre, sin
 * límite de cantidad) — distinta de las 4 fotos de referencia de arriba,
 * que la guía de producción NO descarga. La etiqueta llega vacía y se
 * completa después con `editarEtiquetaFotoContexto`. */
export async function subirFotoContextoPersonaje(
  personajeId: string,
  formData: FormData,
): Promise<FotoContextoPersonaje[]> {
  const archivo = formData.get("foto");
  if (!(archivo instanceof File)) throw new Error("No se recibió ningún archivo.");

  const personaje = await getPersonaje(personajeId);
  const url = await guardarArchivoSubido(archivo);
  const nuevas = [...parseFotosContextoPersonaje(personaje?.fotosContextoJson), { url, etiqueta: "" }];

  await db.update(personajes).set({ fotosContextoJson: nuevas }).where(eq(personajes.id, personajeId));

  revalidarRutasPersonaje(personaje?.proyectoId ?? null);
  return nuevas;
}

export async function editarEtiquetaFotoContexto(
  personajeId: string,
  url: string,
  etiqueta: string,
): Promise<FotoContextoPersonaje[]> {
  const personaje = await getPersonaje(personajeId);
  const nuevas = parseFotosContextoPersonaje(personaje?.fotosContextoJson).map((f) =>
    f.url === url ? { ...f, etiqueta: etiqueta.trim() } : f,
  );

  await db.update(personajes).set({ fotosContextoJson: nuevas }).where(eq(personajes.id, personajeId));

  revalidarRutasPersonaje(personaje?.proyectoId ?? null);
  return nuevas;
}

export async function eliminarFotoContextoPersonaje(
  personajeId: string,
  url: string,
): Promise<FotoContextoPersonaje[]> {
  const personaje = await getPersonaje(personajeId);
  const nuevas = parseFotosContextoPersonaje(personaje?.fotosContextoJson).filter((f) => f.url !== url);

  await db.update(personajes).set({ fotosContextoJson: nuevas }).where(eq(personajes.id, personajeId));

  await eliminarArchivoSubido(url).catch(() => {});

  revalidarRutasPersonaje(personaje?.proyectoId ?? null);
  return nuevas;
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
 *
 * Devuelve, junto al contenido, `personajeIdsUsados` — los Personajes
 * realmente usados en la compilación (los elegidos a mano — uno o varios —,
 * o el que decidió el sistema si el selector estaba en "Automático", que
 * sigue siendo de a uno). El cliente lo necesita para guardar el bloque con
 * el/los Personaje(s) correctos asociados.
 */
/**
 * "Revisar cambios" — cuando el usuario edita a mano Descripción o Texto
 * en pantalla de una escena, al editar un bloque ya guardado en
 * Biblioteca, esto vuelve a generar SOLO los prompts/referencias de esa
 * escena (ver `revisarEscena` en ai.ts), con el resto de las escenas como
 * contexto de coherencia — sin reiniciar toda la pieza. Recompila la
 * identidad con los mismos Personajes/Activos que ya tenía la pieza, para
 * que la revisión use las mismas instrucciones (fotos de referencia,
 * etc.) que el contexto original.
 *
 * `contexto` (tema/tipoContenido/tipoProduccion/personajeIds) va como
 * parámetro SEPARADO de `input` (escena/otrasEscenas): se conoce en el
 * servidor y se deja pre-aplicado con `.bind()` (ver editar/page.tsx).
 * Nunca envuelvas esta función en un arrow function para "fusionar"
 * contexto — eso rompe la serialización de Server Actions al pasarla a
 * un Client Component.
 */
export async function revisarEscenaAction(
  proyectoId: string,
  contexto: {
    tema: string;
    tipoContenido: string;
    tipoProduccion: string;
    personajeIds?: string[];
    /** Toggles actuales de "Qué incluir en esta pieza" — reflejan el
     * estado EN VIVO de los controles del cliente al momento de presionar
     * "Regenerar prompts", no necesariamente lo que quedó guardado en el
     * bloque (que solo se actualiza al confirmar "Guardar cambios"). Sin
     * estos campos (Crear todavía sin guardar), se usan los defaults de
     * `compileIdentity`. */
    incluirMarca?: boolean;
    incluirLogo?: boolean;
    posicionLogo?: PosicionLogo | null;
    incluirContacto?: boolean;
    avatarId?: string;
  },
  input: {
    escena: Pick<Escena, "numero" | "descripcion" | "textoEnPantalla">;
    otrasEscenas: { numero: number; descripcion: string; textoEnPantalla: string }[];
  },
): Promise<EscenaRevisada> {
  const [identidad, personajesExplicitos, activosDelProyecto, avatar] = await Promise.all([
    getIdentidad(proyectoId),
    Promise.all((contexto.personajeIds ?? []).map((id) => getPersonaje(id))),
    getActivos(proyectoId),
    contexto.avatarId ? getAvatarPorId(proyectoId, contexto.avatarId) : Promise.resolve(null),
  ]);
  const personajes = personajesExplicitos.filter((p): p is Personaje => p !== null);
  const activosVisuales = activosDelProyecto
    .filter((a) => a.tipo === "foto")
    .map((a) => ({ etiqueta: a.nombre, url: a.valor }));
  const identidadCompilada = identidad
    ? compileIdentity(identidad, {
        incluirMarca: contexto.incluirMarca,
        incluirContacto: contexto.incluirContacto,
        personajes,
        activosVisuales,
        avatar: contexto.incluirMarca !== false ? avatar : null,
        posicionLogo: contexto.incluirLogo ? (contexto.posicionLogo ?? null) : null,
      })
    : "";

  return revisarEscena({
    identidadCompilada,
    tema: contexto.tema,
    tipoContenido: contexto.tipoContenido,
    tipoProduccion: contexto.tipoProduccion,
    escena: input.escena,
    otrasEscenas: input.otrasEscenas,
  });
}

/** Parsea un campo JSON (`escenasJson`, `personajeIds`) que llega
 * serializado como string desde un FormData (siempre string, incluso para
 * campos que representan JSON). Ante JSON inválido, no revienta el guardado
 * del resto del bloque — simplemente devuelve un valor que los parsers de
 * `types.ts` (`parseEscenas`, `parsePersonajeIds`) tratan como vacío. */
function parsearJsonDeFormData(valor: string): unknown {
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
 * con IA; las piezas manuales no lo usan. `personajeIds` (si vino del
 * selector múltiple de Crear, como JSON de un arreglo de ids) queda
 * guardado en el bloque — `personajeId` (singular, el primero) es lo que
 * después usa `generarImagenParaEscena` para tomar la foto de referencia
 * correcta; `personajeIdsJson` guarda el arreglo completo cuando hay 2+.
 * `personajeId` (singular, sin `personajeIds`) sigue soportado tal cual
 * para no romper otros llamadores.
 */
export async function createBloque(proyectoId: string, formData: FormData) {
  const titulo = String(formData.get("titulo") ?? "").trim();
  const formato = String(formData.get("formato") ?? "manual").trim();
  const texto = String(formData.get("texto") ?? "").trim();
  if (!titulo || !texto) throw new Error("El bloque necesita título y texto.");

  const escenasJsonRaw = formData.get("escenasJson");
  const escenasJson =
    typeof escenasJsonRaw === "string" && escenasJsonRaw.trim()
      ? parsearJsonDeFormData(escenasJsonRaw)
      : null;

  const personajeIdsRaw = formData.get("personajeIds");
  const personajeIdsDelFormulario =
    typeof personajeIdsRaw === "string" && personajeIdsRaw.trim()
      ? parsePersonajeIds(parsearJsonDeFormData(personajeIdsRaw))
      : [];
  const personajeIdSingular = String(formData.get("personajeId") ?? "").trim() || null;
  const idsPersonajes =
    personajeIdsDelFormulario.length > 0
      ? personajeIdsDelFormulario
      : personajeIdSingular
        ? [personajeIdSingular]
        : [];
  const personajeId = idsPersonajes[0] ?? null;
  const avatarId = String(formData.get("avatarId") ?? "").trim() || null;
  const tema = String(formData.get("tema") ?? "").trim();
  // Toggles de "Qué incluir en esta pieza" (Paso 4) — se persisten junto
  // con el bloque para poder precargarlos al editar (ver QueIncluir en
  // que-incluir.tsx). Ausentes en el FormData = mismos defaults que Crear.
  const incluirMarcaRaw = formData.get("incluirMarca");
  const incluirMarca = incluirMarcaRaw === null ? true : incluirMarcaRaw === "true";
  const incluirLogo = formData.get("incluirLogo") === "true";
  const posicionLogo = incluirLogo ? String(formData.get("posicionLogo") ?? "").trim() || null : null;
  const incluirContacto = formData.get("incluirContacto") === "true";

  const [identidad, personajes, avatar] = await Promise.all([
    getIdentidad(proyectoId),
    Promise.all(idsPersonajes.map((id) => getPersonaje(id))).then((lista) =>
      lista.filter((p): p is Personaje => p !== null),
    ),
    avatarId ? getAvatarPorId(proyectoId, avatarId) : Promise.resolve(null),
  ]);
  const identidadCompilada = identidad ? compileIdentity(identidad, { personajes, avatar }) : "";

  const bloqueId = randomUUID();
  await db.insert(bloques).values({
    id: bloqueId,
    proyectoId,
    personajeIdsJson: idsPersonajes.length >= 2 ? idsPersonajes : null,
    personajeId,
    titulo,
    formato,
    texto,
    identidadCompilada,
    escenasJson,
    incluirMarca,
    incluirLogo,
    posicionLogo,
    incluirContacto,
  });

  if (tema) await marcarNotaComoTrabajadaSiHizoMatch(proyectoId, tema, bloqueId);

  revalidatePath(`/proyectos/${proyectoId}/biblioteca`);
  revalidatePath("/biblioteca");
}

/** Si `tema` (la idea con la que se generó esta pieza) hace match por
 * palabras clave con alguna nota 'pendiente' de este proyecto, esa nota
 * pasa a 'trabajada' con el bloque recién creado — es la misma idea que
 * originó la pieza. A propósito usa el umbral laxo de siempre (cualquier
 * coincidencia cuenta) — no el más estricto del panel "Esto ya existe
 * sobre este tema" — porque acá "algo" es mejor que nada: si el usuario
 * generó contenido a partir de una nota, vincularla es una ayuda aunque
 * el match sea parcial. Sin coincidencias, no toca nada. */
async function marcarNotaComoTrabajadaSiHizoMatch(proyectoId: string, tema: string, bloqueId: string) {
  const palabrasClave = extraerPalabrasClave(tema);
  if (palabrasClave.length === 0) return;

  const notasPendientes = await db
    .select()
    .from(notas)
    .where(and(eq(notas.proyectoId, proyectoId), eq(notas.estado, "pendiente")));

  const [mejorMatch] = rankearResultados(
    notasPendientes,
    (n) => n.texto,
    (n) => ({ id: n.id, titulo: n.texto, fragmento: n.texto }),
    palabrasClave,
    1,
  );
  if (!mejorMatch) return;

  await db.update(notas).set({ estado: "trabajada", bloqueId }).where(eq(notas.id, mejorMatch.id));
  revalidatePath("/segundo-cerebro");
}

/** Actualiza título/formato/texto y, opcionalmente, `escenasJson` y los
 * toggles de "Qué incluir en esta pieza". `identidadCompilada` queda
 * congelado desde la creación — es evidencia de qué identidad se usó
 * entonces. Cada campo opcional solo se toca si vino explícitamente en el
 * formData (el formulario de texto plano, sin escenas, nunca los envía —
 * así no se borran por accidente). */
export async function updateBloque(proyectoId: string, bloqueId: string, formData: FormData) {
  const titulo = String(formData.get("titulo") ?? "").trim();
  const formato = String(formData.get("formato") ?? "manual").trim();
  const texto = String(formData.get("texto") ?? "").trim();
  if (!titulo || !texto) throw new Error("El bloque necesita título y texto.");

  const actualizacion: {
    titulo: string;
    formato: string;
    texto: string;
    escenasJson?: unknown;
    incluirMarca?: boolean;
    incluirLogo?: boolean;
    posicionLogo?: string | null;
    incluirContacto?: boolean;
  } = {
    titulo,
    formato,
    texto,
  };

  const escenasJsonRaw = formData.get("escenasJson");
  if (escenasJsonRaw !== null) {
    const valor = String(escenasJsonRaw);
    actualizacion.escenasJson = valor.trim() ? parsearJsonDeFormData(valor) : null;
  }

  const incluirMarcaRaw = formData.get("incluirMarca");
  if (incluirMarcaRaw !== null) actualizacion.incluirMarca = incluirMarcaRaw === "true";

  const incluirLogoRaw = formData.get("incluirLogo");
  if (incluirLogoRaw !== null) {
    const incluirLogo = incluirLogoRaw === "true";
    actualizacion.incluirLogo = incluirLogo;
    actualizacion.posicionLogo = incluirLogo
      ? String(formData.get("posicionLogo") ?? "").trim() || null
      : null;
  }

  const incluirContactoRaw = formData.get("incluirContacto");
  if (incluirContactoRaw !== null) actualizacion.incluirContacto = incluirContactoRaw === "true";

  await db
    .update(bloques)
    .set(actualizacion)
    .where(and(eq(bloques.id, bloqueId), eq(bloques.proyectoId, proyectoId)));

  revalidatePath(`/proyectos/${proyectoId}/biblioteca`);
  revalidatePath("/biblioteca");
}

/**
 * Pide el embed oEmbed de Instagram para un link de publicación (post,
 * carrusel o reel — no Stories, que son públicas por 24h y la API no las
 * cubre) y lo cachea junto al bloque, para no volver a pedirlo cada vez
 * que se abre (el límite es 200 llamadas/hora a nivel de app). Requiere
 * `INSTAGRAM_APP_ID`/`INSTAGRAM_APP_SECRET` configuradas en el entorno —
 * sin ellas, o si la llamada falla (link inválido, contenido no público),
 * retorna `null` y la UI cae al fallback: un botón "Ver publicación" con
 * el link crudo, sin romper nada.
 */
async function obtenerEmbedInstagram(link: string): Promise<string | null> {
  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  if (!appId || !appSecret) return null;

  try {
    const url =
      `https://graph.facebook.com/v25.0/instagram_oembed?url=${encodeURIComponent(link)}` +
      `&access_token=${appId}|${appSecret}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data: unknown = await res.json();
    const html = (data as { html?: unknown })?.html;
    return typeof html === "string" && html.trim() ? html : null;
  } catch {
    return null;
  }
}

/**
 * Guarda el link de evidencia de publicación de un bloque (Paso 5 de la
 * ronda de ajustes UX) e intenta obtener y cachear su embed de Instagram.
 * Se guarda el link igual aunque el embed falle — el fallback vive en la
 * UI, no acá.
 */
export async function guardarLinkPublicacion(proyectoId: string, bloqueId: string, formData: FormData) {
  const link = String(formData.get("link") ?? "").trim();
  if (!link) throw new Error("Pega el link de la publicación.");

  const instagramEmbedHtml = await obtenerEmbedInstagram(link);

  await db
    .update(bloques)
    .set({ linkPublicacion: link, instagramEmbedHtml })
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

  const promptVisual = (escenas[index].promptVisual ?? "").trim();
  if (!promptVisual) throw new Error("Esta escena no tiene un prompt de imagen para generar.");

  // Usa la foto de tipo "rostro" del Personaje asociado al bloque como
  // referencia (o la primera disponible si por algún motivo no tiene rostro
  // cargado) — múltiples referencias a la vez sería una mejora futura del
  // proveedor de imagen, no de esta ronda (ver comentario en imagen-provider.ts).
  const personaje = bloque.personajeId ? await getPersonaje(bloque.personajeId) : null;
  const fotoReferenciaUrl = fotoPrincipal(parseFotosPersonaje(personaje?.fotosUrlsJson)) ?? undefined;

  const imagenGeneradaUrl = await generarImagenIA(promptVisual, fotoReferenciaUrl, calidad);

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
  if (escenas.length === 0) {
    throw new Error("Esta pieza no tiene escenas para generar un plan de edición.");
  }

  const plan = await generarPlanEdicion({
    formato: bloque.formato,
    identidadCompilada: bloque.identidadCompilada,
    texto: bloque.texto,
    // Carrusel/Imagen de varias láminas (sin duración de video real): el
    // Director de Edición ofrece un plan de CONVERSIÓN a video, no
    // indicaciones sobre metraje ya filmado.
    esConversionAVideo: esConversionAVideo(escenas),
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
  const etiquetas = String(formData.get("etiquetas") ?? "").trim();
  if (!tipo || !nombre) throw new Error("El activo necesita tipo y nombre.");

  await db.insert(activos).values({ id: randomUUID(), proyectoId, tipo, nombre, valor, notas, etiquetas });
  revalidatePath(`/proyectos/${proyectoId}/activos`);
}

export async function createActivoArchivo(proyectoId: string, formData: FormData) {
  const tipo = String(formData.get("tipo") ?? "").trim();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const notas = String(formData.get("notas") ?? "").trim();
  const etiquetas = String(formData.get("etiquetas") ?? "").trim();
  const archivo = formData.get("archivo");
  if (!tipo || !nombre) throw new Error("El activo necesita tipo y nombre.");
  if (!(archivo instanceof File)) throw new Error("No se recibió ningún archivo.");

  const valor = await guardarArchivoSubido(archivo);

  await db.insert(activos).values({ id: randomUUID(), proyectoId, tipo, nombre, valor, notas, etiquetas });
  revalidatePath(`/proyectos/${proyectoId}/activos`);
}

/** Edita solo las etiquetas de un activo ya guardado — mismo patrón que
 * `renombrarActivo`, para no exigir re-subir el archivo por un cambio de
 * etiquetas. Etiquetas vacías son válidas (quitar todas). */
export async function editarEtiquetasActivo(proyectoId: string, activoId: string, formData: FormData) {
  const etiquetas = String(formData.get("etiquetas") ?? "").trim();

  await db
    .update(activos)
    .set({ etiquetas })
    .where(and(eq(activos.id, activoId), eq(activos.proyectoId, proyectoId)));

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

/** Renombra la etiqueta (`nombre`) de un Activo ya guardado — usado por la
 * galería de "Fotos de lugares" para corregir una etiqueta sin tener que
 * volver a subir la foto. No toca `valor`/`notas`/`tipo`. */
export async function renombrarActivo(proyectoId: string, activoId: string, formData: FormData) {
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) throw new Error("La etiqueta no puede quedar vacía.");

  await db
    .update(activos)
    .set({ nombre })
    .where(and(eq(activos.id, activoId), eq(activos.proyectoId, proyectoId)));

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

/** Cambia la prioridad manual de una idea (alta | media | baja). */
export async function cambiarPrioridadNota(notaId: string, prioridad: string) {
  await db.update(notas).set({ prioridad }).where(eq(notas.id, notaId));
  revalidatePath("/segundo-cerebro");
}

/** Borrado directo, sin papelera — son apuntes rápidos de bajo riesgo. */
export async function deleteNota(notaId: string) {
  await db.delete(notas).where(eq(notas.id, notaId));
  revalidatePath("/segundo-cerebro");
  revalidatePath("/");
}

// ---------------------------------------------------------------------
// Relaciones inteligentes (grafo de conocimiento, sin IA)
// ---------------------------------------------------------------------
//
// AUTO-VINCULACIÓN: cada pieza guardada YA registra automáticamente su
// proyecto (proyectoId), los Personajes usados (personajeId +
// personajeIdsJson), los Activos usados (activoReferenciado dentro de
// cada escena de escenasJson), la idea de origen (notas.bloqueId, que se
// setea solo al guardar una pieza que coincide con una nota pendiente),
// la fecha (createdAt) y el formato — sin depender del usuario. Los
// prompts/documentos "usados" no tienen registro directo (el usuario los
// copia a mano fuera de la app, no hay forma de saberlo) — se relacionan
// por texto, igual que el resto de las conexiones no-FK de esta capa.

export type RelacionItem = { id: string; titulo: string; proyectoId: string | null };

export type RelacionesEntidad = {
  bloques: RelacionItem[];
  prompts: RelacionItem[];
  documentos: RelacionItem[];
  ideas: RelacionItem[];
  activos: RelacionItem[];
};

/** True si `texto` contiene el nombre completo (sin distinguir mayúsculas)
 * — para entidades con nombre propio, contener el nombre es una señal más
 * precisa que compartir palabras clave sueltas. */
function contieneNombre(texto: string, nombre: string): boolean {
  const n = nombre.trim().toLowerCase();
  if (n.length < 3) return false;
  return texto.toLowerCase().includes(n);
}

/**
 * Todo lo relacionado con UN Personaje, entre todas las tablas: contenido
 * (FK directa: personajeId / personajeIdsJson), prompts y documentos
 * (FK directa `personajeId`, o su nombre mencionado en el texto), ideas y
 * Activos (nombre mencionado). 100% consultas + comparación de texto —
 * sin IA. La pantalla decide cómo mostrarlo (ver RelacionadoPanel).
 */
export async function getRelacionesPersonaje(personajeId: string): Promise<RelacionesEntidad> {
  const personaje = await getPersonaje(personajeId);
  if (!personaje) return { bloques: [], prompts: [], documentos: [], ideas: [], activos: [] };
  const nombre = personaje.nombre;

  const [todosBloques, todosPrompts, todosDocumentos, todasNotas, todosActivos] = await Promise.all([
    db.select().from(bloques).where(eq(bloques.estado, "activo")),
    db.select().from(promptsGuardados),
    db.select().from(documentos),
    db.select().from(notas),
    db.select().from(activos),
  ]);

  return {
    bloques: todosBloques
      .filter((b) => b.personajeId === personajeId || parsePersonajeIds(b.personajeIdsJson).includes(personajeId))
      .map((b) => ({ id: b.id, titulo: b.titulo, proyectoId: b.proyectoId })),
    prompts: todosPrompts
      .filter(
        (p) => p.personajeId === personajeId || contieneNombre(`${p.titulo} ${p.texto} ${p.etiquetas}`, nombre),
      )
      .map((p) => ({ id: p.id, titulo: p.titulo, proyectoId: p.proyectoId })),
    documentos: todosDocumentos
      .filter(
        (d) =>
          d.personajeId === personajeId || contieneNombre(`${d.titulo} ${d.contenido} ${d.etiquetas}`, nombre),
      )
      .map((d) => ({ id: d.id, titulo: d.titulo, proyectoId: d.proyectoId })),
    ideas: todasNotas
      .filter((n) => contieneNombre(n.texto, nombre))
      .map((n) => ({ id: n.id, titulo: extraerFragmento(n.texto, 60), proyectoId: n.proyectoId })),
    activos: todosActivos
      .filter((a) => contieneNombre(`${a.nombre} ${a.notas} ${a.etiquetas}`, nombre))
      .map((a) => ({ id: a.id, titulo: a.nombre, proyectoId: a.proyectoId })),
  };
}

/**
 * Todo lo relacionado con UN Activo: contenido cuyas escenas lo referencian
 * (`activoReferenciado` — el registro automático que la generación ya deja
 * por escena) o lo mencionan por nombre, más prompts/documentos/ideas que
 * mencionan su nombre o comparten etiquetas.
 */
export async function getRelacionesActivo(proyectoId: string, activoId: string): Promise<RelacionesEntidad> {
  const rows = await db
    .select()
    .from(activos)
    .where(and(eq(activos.id, activoId), eq(activos.proyectoId, proyectoId)));
  const activo = rows[0];
  if (!activo) return { bloques: [], prompts: [], documentos: [], ideas: [], activos: [] };
  const nombre = activo.nombre;
  const etiquetasActivo = activo.etiquetas
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length >= 3);

  const comparteEtiqueta = (texto: string) => {
    const t = texto.toLowerCase();
    return etiquetasActivo.some((e) => t.includes(e));
  };

  const [todosBloques, todosPrompts, todosDocumentos, todasNotas] = await Promise.all([
    db.select().from(bloques).where(and(eq(bloques.proyectoId, proyectoId), eq(bloques.estado, "activo"))),
    db.select().from(promptsGuardados),
    db.select().from(documentos),
    db.select().from(notas),
  ]);

  return {
    bloques: todosBloques
      .filter(
        (b) =>
          parseEscenas(b.escenasJson).some((e) => e.activoReferenciado?.trim() === nombre) ||
          contieneNombre(`${b.titulo} ${b.texto}`, nombre),
      )
      .map((b) => ({ id: b.id, titulo: b.titulo, proyectoId: b.proyectoId })),
    prompts: todosPrompts
      .filter((p) => {
        const texto = `${p.titulo} ${p.texto} ${p.etiquetas}`;
        return contieneNombre(texto, nombre) || comparteEtiqueta(texto);
      })
      .map((p) => ({ id: p.id, titulo: p.titulo, proyectoId: p.proyectoId })),
    documentos: todosDocumentos
      .filter((d) => {
        const texto = `${d.titulo} ${d.contenido} ${d.etiquetas}`;
        return contieneNombre(texto, nombre) || comparteEtiqueta(texto);
      })
      .map((d) => ({ id: d.id, titulo: d.titulo, proyectoId: d.proyectoId })),
    ideas: todasNotas
      .filter((n) => contieneNombre(n.texto, nombre) || comparteEtiqueta(n.texto))
      .map((n) => ({ id: n.id, titulo: extraerFragmento(n.texto, 60), proyectoId: n.proyectoId })),
    activos: [],
  };
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
    // Total real (no el largo de `proyectosRecientes`, que se recorta a 5) —
    // el botón "Crear contenido" del dashboard lo necesita para decidir si
    // puede saltar directo a un proyecto o si debe mandar al listado.
    totalProyectos: todosProyectos.length,
    bloquesRecientes,
    notasSinVincular,
  };
}

// ---------------------------------------------------------------------
// Calendario de contenido
// ---------------------------------------------------------------------

/** Todas las piezas activas (de cualquier proyecto) que tienen una fecha de
 * publicación planeada asignada — las sin fecha no aparecen acá, siguen
 * viviendo solo en Biblioteca. `proyectoNombre` ya resuelto, mismo criterio
 * que `getTodosLosBloquesActivos`. */
export async function getBloquesParaCalendario(): Promise<
  { id: string; proyectoId: string; proyectoNombre: string; titulo: string; formato: string; fechaPlanificada: string }[]
> {
  const [todosBloques, todosProyectos] = await Promise.all([
    db
      .select({
        id: bloques.id,
        proyectoId: bloques.proyectoId,
        titulo: bloques.titulo,
        formato: bloques.formato,
        fechaPlanificada: bloques.fechaPlanificada,
      })
      .from(bloques)
      .where(eq(bloques.estado, "activo")),
    db.select().from(proyectos),
  ]);
  const nombrePorProyecto = new Map(todosProyectos.map((p) => [p.id, p.nombre]));
  return todosBloques
    .filter((b): b is typeof b & { fechaPlanificada: string } => !!b.fechaPlanificada)
    .map((b) => ({ ...b, proyectoNombre: nombrePorProyecto.get(b.proyectoId) ?? "" }));
}

/** Asigna, reasigna o quita (`fecha` vacío) la fecha de publicación planeada
 * de una pieza — pura organización manual, no dispara nada automático. */
export async function asignarFechaPlanificada(proyectoId: string, bloqueId: string, formData: FormData) {
  const fecha = String(formData.get("fecha") ?? "").trim();

  await db
    .update(bloques)
    .set({ fechaPlanificada: fecha || null })
    .where(and(eq(bloques.id, bloqueId), eq(bloques.proyectoId, proyectoId)));

  revalidatePath("/calendario");
  revalidatePath("/biblioteca");
  revalidatePath(`/proyectos/${proyectoId}/biblioteca`);
}

// ---------------------------------------------------------------------
// Biblioteca de Prompts
// ---------------------------------------------------------------------

function revalidarRutasPrompt(proyectoId: string | null) {
  revalidatePath("/prompts");
  if (proyectoId) revalidatePath(`/proyectos/${proyectoId}/prompts`);
}

/** Prompts GLOBALES (`proyectoId` null) — visibles en /prompts y, con el
 * chip "Global", dentro de cualquier proyecto. Más reciente primero, mismo
 * criterio de orden que el resto de listas de esta app. */
export async function getPromptsGlobales(): Promise<PromptGuardado[]> {
  return db.select().from(promptsGuardados).where(isNull(promptsGuardados.proyectoId)).orderBy(desc(promptsGuardados.createdAt));
}

/** Prompts de UN proyecto (los suyos + los globales combinados) — usado por
 * la pestaña "Prompts" del proyecto. La pantalla distingue los globales
 * mirando `proyectoId === null` (mismo patrón que Personajes del estudio)
 * para mostrar el chip "Global". */
export async function getPromptsDeProyecto(proyectoId: string): Promise<PromptGuardado[]> {
  const [propios, globales] = await Promise.all([
    db.select().from(promptsGuardados).where(eq(promptsGuardados.proyectoId, proyectoId)),
    getPromptsGlobales(),
  ]);
  return [...propios, ...globales].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

const CAMPOS_PROMPT = ["titulo", "texto", "categoria", "etiquetas", "estado"] as const;

function leerCamposPrompt(formData: FormData) {
  const valores = Object.fromEntries(CAMPOS_PROMPT.map((c) => [c, String(formData.get(c) ?? "").trim()])) as Record<
    (typeof CAMPOS_PROMPT)[number],
    string
  >;
  if (!valores.titulo) throw new Error("El prompt necesita un título.");
  if (!valores.texto) throw new Error("El prompt necesita texto.");
  // Personaje asociado: "" (opción "Ninguno" del selector) -> null.
  const personajeId = String(formData.get("personajeId") ?? "").trim() || null;
  return { ...valores, estado: valores.estado || "activo", personajeId };
}

/** `proyectoId: null` desde /prompts (global) — desde la pestaña "Prompts"
 * de un proyecto viene pre-aplicado con `.bind()`, igual que `createPersonaje`. */
export async function createPromptGuardado(proyectoId: string | null, formData: FormData): Promise<{ id: string }> {
  const valores = leerCamposPrompt(formData);
  const id = randomUUID();

  await db.insert(promptsGuardados).values({ id, proyectoId, ...valores });

  revalidarRutasPrompt(proyectoId);
  return { id };
}

export async function updatePromptGuardado(promptId: string, formData: FormData) {
  const valores = leerCamposPrompt(formData);

  // La versión sube en cada edición — un contador simple de cuántas veces
  // se ha guardado este prompt, no un historial de contenidos.
  const [actualizado] = await db
    .update(promptsGuardados)
    .set({ ...valores, version: sql`${promptsGuardados.version} + 1` })
    .where(eq(promptsGuardados.id, promptId))
    .returning({ proyectoId: promptsGuardados.proyectoId });

  revalidarRutasPrompt(actualizado?.proyectoId ?? null);
}

export async function deletePromptGuardado(promptId: string) {
  const [eliminado] = await db
    .delete(promptsGuardados)
    .where(eq(promptsGuardados.id, promptId))
    .returning({ proyectoId: promptsGuardados.proyectoId });

  revalidarRutasPrompt(eliminado?.proyectoId ?? null);
}

// ---------------------------------------------------------------------
// Biblioteca de Conocimiento (documentos)
// ---------------------------------------------------------------------

function revalidarRutasDocumento(proyectoId: string | null, areaId: string | null = null) {
  revalidatePath("/conocimiento");
  if (proyectoId) revalidatePath(`/proyectos/${proyectoId}/conocimiento`);
  if (areaId) revalidatePath(`/areas/${areaId}`);
}

/** Documentos GLOBALES (`proyectoId` null Y `areaId` null) — visibles en
 * /conocimiento y, con el chip "Global", dentro de cualquier proyecto. Los
 * documentos de Área también tienen `proyectoId` null pero NO son
 * globales — se excluyen explícitamente para no duplicarlos. */
export async function getDocumentosGlobales(): Promise<Documento[]> {
  return db
    .select()
    .from(documentos)
    .where(and(isNull(documentos.proyectoId), isNull(documentos.areaId)))
    .orderBy(desc(documentos.createdAt));
}

/** Documentos propios de UN Área de Conocimiento (ej. normativa de
 * construcción en el Área "Construcción") — visibles en /areas/[id] y
 * heredados automáticamente por cada proyecto de esa Área. */
export async function getDocumentosDeArea(areaId: string): Promise<Documento[]> {
  return db.select().from(documentos).where(eq(documentos.areaId, areaId)).orderBy(desc(documentos.createdAt));
}

/** Documentos de UN proyecto: los suyos propios + los de su Área (si tiene
 * una asignada) + los globales, combinados. Un proyecto sin Área (areaId
 * null) se comporta exactamente igual que antes de que existieran las
 * Áreas — solo sus propios documentos + los globales. */
export async function getDocumentosDeProyecto(proyectoId: string): Promise<Documento[]> {
  const [proyectoRows, propios, globales] = await Promise.all([
    db.select({ areaId: proyectos.areaId }).from(proyectos).where(eq(proyectos.id, proyectoId)),
    db.select().from(documentos).where(eq(documentos.proyectoId, proyectoId)),
    getDocumentosGlobales(),
  ]);
  const areaId = proyectoRows[0]?.areaId ?? null;
  const deArea = areaId ? await getDocumentosDeArea(areaId) : [];
  return [...propios, ...deArea, ...globales].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

function leerCamposDocumento(formData: FormData) {
  const titulo = String(formData.get("titulo") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "texto").trim();
  const contenido = String(formData.get("contenido") ?? "").trim();
  const etiquetas = String(formData.get("etiquetas") ?? "").trim();
  const personajeId = String(formData.get("personajeId") ?? "").trim() || null;
  if (!titulo) throw new Error("El documento necesita un título.");
  return { titulo, tipo, contenido, etiquetas, personajeId };
}

async function crearDocumentoConDestino(
  destino: { proyectoId: string | null; areaId: string | null },
  formData: FormData,
): Promise<{ id: string }> {
  const campos = leerCamposDocumento(formData);

  let valor = "";
  if (campos.tipo === "archivo") {
    const archivo = formData.get("archivo");
    if (!(archivo instanceof File)) throw new Error("No se recibió ningún archivo.");
    valor = await guardarArchivoSubido(archivo);
  } else if (campos.tipo === "link") {
    valor = String(formData.get("link") ?? "").trim();
    if (!valor) throw new Error("El documento tipo link necesita la URL.");
  } else if (!campos.contenido) {
    throw new Error("El documento tipo texto necesita contenido.");
  }

  const id = randomUUID();
  await db.insert(documentos).values({ id, ...destino, valor, ...campos });

  revalidarRutasDocumento(destino.proyectoId, destino.areaId);
  return { id };
}

/** Crea un documento de proyecto o global. Para tipo "archivo" lee el
 * `<input name="archivo">` y lo sube a Blob; para "link" lee el campo de
 * texto `link`; para "texto" solo usa `contenido`. `proyectoId: null`
 * desde /conocimiento (global), pre-aplicado con `.bind()` desde la
 * pestaña del proyecto. */
export async function createDocumento(proyectoId: string | null, formData: FormData): Promise<{ id: string }> {
  return crearDocumentoConDestino({ proyectoId, areaId: null }, formData);
}

/** Crea un documento a nivel de Área de Conocimiento — mismas reglas de
 * tipo que createDocumento, pre-aplicado con `.bind()` desde /areas/[id]. */
export async function createDocumentoDeArea(areaId: string, formData: FormData): Promise<{ id: string }> {
  return crearDocumentoConDestino({ proyectoId: null, areaId }, formData);
}

/** Edita los metadatos de un documento (título/contenido/etiquetas/
 * personaje) — el archivo o link (`valor`) no cambia; para reemplazarlo se
 * crea un documento nuevo y se borra el viejo. */
export async function updateDocumento(documentoId: string, formData: FormData) {
  const campos = leerCamposDocumento(formData);
  const link = String(formData.get("link") ?? "").trim();

  const [actualizado] = await db
    .update(documentos)
    .set({
      titulo: campos.titulo,
      contenido: campos.contenido,
      etiquetas: campos.etiquetas,
      personajeId: campos.personajeId,
      // Solo el link es editable en sitio (es solo texto) — el archivo no.
      ...(link ? { valor: link } : {}),
    })
    .where(eq(documentos.id, documentoId))
    .returning({ proyectoId: documentos.proyectoId, areaId: documentos.areaId });

  revalidarRutasDocumento(actualizado?.proyectoId ?? null, actualizado?.areaId ?? null);
}

export async function deleteDocumento(documentoId: string) {
  const [eliminado] = await db
    .delete(documentos)
    .where(eq(documentos.id, documentoId))
    .returning({
      proyectoId: documentos.proyectoId,
      areaId: documentos.areaId,
      tipo: documentos.tipo,
      valor: documentos.valor,
    });

  if (eliminado?.tipo === "archivo" && eliminado.valor) {
    await eliminarArchivoSubido(eliminado.valor).catch(() => {});
  }

  revalidarRutasDocumento(eliminado?.proyectoId ?? null, eliminado?.areaId ?? null);
}

// ---------------------------------------------------------------------
// Producción (Fase 3.1) — Planos + Storyboard de Escenas
// ---------------------------------------------------------------------

/** Catálogo de referencia de tipos de plano de cámara — mismo para todos
 * los proyectos, sin administración todavía (ver seed en scripts/). */
export async function getPlanos(): Promise<Plano[]> {
  const rows = await db.select().from(planos);
  return rows.sort((a, b) => (a.nombre < b.nombre ? -1 : 1));
}

/** Todas las escenas del storyboard de un Proyecto, en orden, hidratadas
 * con sus Personajes relacionados (tabla puente). */
export async function getStoryboardEscenas(proyectoId: string): Promise<StoryboardEscenaConPersonajes[]> {
  const escenas = await db
    .select()
    .from(storyboardEscenas)
    .where(eq(storyboardEscenas.proyectoId, proyectoId));
  escenas.sort((a, b) => a.orden - b.orden);
  if (escenas.length === 0) return [];

  const relaciones = await db
    .select()
    .from(storyboardEscenasPersonajes)
    .where(
      inArray(
        storyboardEscenasPersonajes.escenaId,
        escenas.map((e) => e.id),
      ),
    );

  return escenas.map((escena) => ({
    ...escena,
    personajeIds: relaciones.filter((r) => r.escenaId === escena.id).map((r) => r.personajeId),
  }));
}

/** Crea una escena en blanco al final del storyboard — sin abrir el panel,
 * el usuario la completa después. `numero`/`orden` se autoasignan al
 * siguiente lugar disponible. */
export async function crearEscenaEnBlanco(proyectoId: string) {
  const existentes = await db
    .select({ orden: storyboardEscenas.orden })
    .from(storyboardEscenas)
    .where(eq(storyboardEscenas.proyectoId, proyectoId));
  const siguiente = existentes.reduce((max, e) => Math.max(max, e.orden), 0) + 1;

  await db.insert(storyboardEscenas).values({
    id: randomUUID(),
    proyectoId,
    numero: siguiente,
    orden: siguiente,
  });

  revalidatePath(`/proyectos/${proyectoId}/produccion`);
}

/** Guarda todos los campos editables del panel lateral de una escena,
 * incluyendo sus Personajes relacionados (reemplaza la relación completa
 * en la tabla puente — simple y suficiente a esta escala). */
export async function updateStoryboardEscena(proyectoId: string, escenaId: string, formData: FormData) {
  const duracionSegundos = Number.parseInt(String(formData.get("duracionSegundos") ?? "0"), 10) || 0;
  const locacionId = String(formData.get("locacionId") ?? "").trim() || null;
  const planoId = String(formData.get("planoId") ?? "").trim() || null;
  const personajeIds = formData.getAll("personajeIds").map(String).filter(Boolean);

  await db
    .update(storyboardEscenas)
    .set({
      tipoEscena: String(formData.get("tipoEscena") ?? "").trim(),
      objetivoNarrativo: String(formData.get("objetivoNarrativo") ?? "").trim(),
      emocion: String(formData.get("emocion") ?? "").trim(),
      valorEspectador: String(formData.get("valorEspectador") ?? "").trim(),
      textoHablado: String(formData.get("textoHablado") ?? "").trim(),
      textoPantalla: String(formData.get("textoPantalla") ?? "").trim(),
      locacionId,
      planoId,
      movimientoCamara: String(formData.get("movimientoCamara") ?? "").trim(),
      duracionSegundos,
      recursosNecesarios: String(formData.get("recursosNecesarios") ?? "").trim(),
      musica: String(formData.get("musica") ?? "").trim(),
      transicion: String(formData.get("transicion") ?? "").trim(),
      promptIa: String(formData.get("promptIa") ?? "").trim(),
      promptVideoIa: String(formData.get("promptVideoIa") ?? "").trim(),
      notas: String(formData.get("notas") ?? "").trim(),
      updatedAt: sql`now()`,
    })
    .where(and(eq(storyboardEscenas.id, escenaId), eq(storyboardEscenas.proyectoId, proyectoId)));

  await db.delete(storyboardEscenasPersonajes).where(eq(storyboardEscenasPersonajes.escenaId, escenaId));
  if (personajeIds.length > 0) {
    await db
      .insert(storyboardEscenasPersonajes)
      .values(personajeIds.map((personajeId) => ({ id: randomUUID(), escenaId, personajeId })));
  }

  revalidatePath(`/proyectos/${proyectoId}/produccion`);
}

/** Cambia solo el estado de producción — usado por el dropdown de estado
 * en la tarjeta y en el header del panel, con persistencia inmediata. */
export async function actualizarEstadoProduccionEscena(proyectoId: string, escenaId: string, estado: string) {
  await db
    .update(storyboardEscenas)
    .set({ estadoProduccion: estado, updatedAt: sql`now()` })
    .where(and(eq(storyboardEscenas.id, escenaId), eq(storyboardEscenas.proyectoId, proyectoId)));

  revalidatePath(`/proyectos/${proyectoId}/produccion`);
}

/** Recalcula `orden` y `numero` de todo el storyboard según el orden
 * actual — deja la secuencia sin huecos tras insertar (duplicar) o borrar
 * una escena. `mover` NO pasa por acá: ahí `numero` (posición narrativa
 * original) debe mantenerse fijo, solo se intercambia `orden`. */
async function renumerarStoryboard(proyectoId: string) {
  const escenas = await db
    .select({ id: storyboardEscenas.id, orden: storyboardEscenas.orden })
    .from(storyboardEscenas)
    .where(eq(storyboardEscenas.proyectoId, proyectoId));
  escenas.sort((a, b) => a.orden - b.orden);

  for (let i = 0; i < escenas.length; i++) {
    await db
      .update(storyboardEscenas)
      .set({ orden: i + 1, numero: i + 1 })
      .where(eq(storyboardEscenas.id, escenas[i].id));
  }
}

/** Intercambia el `orden` de una escena con su vecina inmediata — no toca
 * `numero`. No-op silencioso si no hay vecina hacia ese lado (la UI ya
 * deshabilita el botón en los bordes; esto es solo la red de seguridad). */
export async function moverEscenaStoryboard(
  proyectoId: string,
  escenaId: string,
  direccion: "arriba" | "abajo",
) {
  const escenas = await db
    .select({ id: storyboardEscenas.id, orden: storyboardEscenas.orden })
    .from(storyboardEscenas)
    .where(eq(storyboardEscenas.proyectoId, proyectoId));
  escenas.sort((a, b) => a.orden - b.orden);

  const index = escenas.findIndex((e) => e.id === escenaId);
  const destino = direccion === "arriba" ? index - 1 : index + 1;
  if (index === -1 || destino < 0 || destino >= escenas.length) return;

  const actual = escenas[index];
  const vecina = escenas[destino];
  await db.update(storyboardEscenas).set({ orden: vecina.orden }).where(eq(storyboardEscenas.id, actual.id));
  await db.update(storyboardEscenas).set({ orden: actual.orden }).where(eq(storyboardEscenas.id, vecina.id));

  revalidatePath(`/proyectos/${proyectoId}/produccion`);
}

/** Persiste el nuevo orden completo tras un arrastre (Fase 3.3) — recibe
 * los ids en el orden final exacto y reasigna `orden` por posición. Mismo
 * criterio que `moverEscenaStoryboard`: NO toca `numero` (sigue siendo la
 * posición narrativa original), solo la posición actual. */
export async function reordenarEscenasStoryboard(proyectoId: string, idsEnOrden: string[]) {
  for (let i = 0; i < idsEnOrden.length; i++) {
    await db
      .update(storyboardEscenas)
      .set({ orden: i + 1 })
      .where(and(eq(storyboardEscenas.id, idsEnOrden[i]), eq(storyboardEscenas.proyectoId, proyectoId)));
  }

  revalidatePath(`/proyectos/${proyectoId}/produccion`);
}

/** Duplica una escena completa (incluidos sus Personajes) justo después
 * del original, siempre en BORRADOR sin importar el estado original.
 * Renumera todo el storyboard al final para que `numero`/`orden` queden
 * contiguos con la copia insertada en su lugar. */
export async function duplicarEscenaStoryboard(proyectoId: string, escenaId: string) {
  const [original] = await db
    .select()
    .from(storyboardEscenas)
    .where(and(eq(storyboardEscenas.id, escenaId), eq(storyboardEscenas.proyectoId, proyectoId)));
  if (!original) throw new Error("La escena original ya no existe.");

  const relacionesOriginal = await db
    .select()
    .from(storyboardEscenasPersonajes)
    .where(eq(storyboardEscenasPersonajes.escenaId, escenaId));

  await db
    .update(storyboardEscenas)
    .set({ orden: sql`${storyboardEscenas.orden} + 1` })
    .where(and(eq(storyboardEscenas.proyectoId, proyectoId), sql`${storyboardEscenas.orden} > ${original.orden}`));

  const nuevaId = randomUUID();
  await db.insert(storyboardEscenas).values({
    id: nuevaId,
    proyectoId: original.proyectoId,
    numero: original.numero,
    orden: original.orden + 1,
    duracionSegundos: original.duracionSegundos,
    tipoEscena: original.tipoEscena,
    objetivoNarrativo: original.objetivoNarrativo,
    emocion: original.emocion,
    valorEspectador: original.valorEspectador,
    locacionId: original.locacionId,
    planoId: original.planoId,
    movimientoCamara: original.movimientoCamara,
    accion: original.accion,
    textoHablado: original.textoHablado,
    textoPantalla: original.textoPantalla,
    recursosNecesarios: original.recursosNecesarios,
    promptIa: original.promptIa,
    promptVideoIa: original.promptVideoIa,
    musica: original.musica,
    transicion: original.transicion,
    estadoProduccion: "BORRADOR",
    notas: original.notas,
  });

  if (relacionesOriginal.length > 0) {
    await db
      .insert(storyboardEscenasPersonajes)
      .values(relacionesOriginal.map((r) => ({ id: randomUUID(), escenaId: nuevaId, personajeId: r.personajeId })));
  }

  await renumerarStoryboard(proyectoId);
  revalidatePath(`/proyectos/${proyectoId}/produccion`);
}

/** Elimina una escena — la tabla puente se limpia sola por cascade. Deja
 * `orden`/`numero` del resto sin huecos. */
export async function eliminarEscenaStoryboard(proyectoId: string, escenaId: string) {
  await db
    .delete(storyboardEscenas)
    .where(and(eq(storyboardEscenas.id, escenaId), eq(storyboardEscenas.proyectoId, proyectoId)));

  await renumerarStoryboard(proyectoId);
  revalidatePath(`/proyectos/${proyectoId}/produccion`);
}
