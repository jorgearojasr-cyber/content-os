import { z } from "zod";

/**
 * CreatorOS Production Package (CPP) — contrato oficial de intercambio
 * entre ChatGPT (o cualquier IA) y Content OS (o cualquier cliente).
 * ------------------------------------------------------------------
 * Este archivo es la traducción a validación ejecutable del contrato
 * descrito en `CREATOROS_PACKAGE_V1_SPEC.md` — esa especificación es la
 * fuente de verdad; este archivo nunca la reinterpreta, solo la aplica.
 * Nivel B (sin IA): el paquete llega ya generado por una IA externa,
 * Content OS solo lo parsea y valida — nunca llama a ningún proveedor
 * acá.
 * ------------------------------------------------------------------
 */

/** MAJOR de `creatorOSPackage` que esta versión de Content OS entiende —
 * ver CREATOROS_PACKAGE_V1_SPEC.md sección 3 (versionado). */
export const CPP_MAJOR_SOPORTADO = 1;

const CreadoPorSchema = z.object({
  herramienta: z.string(),
  modelo: z.string().nullable().optional(),
  fecha: z.string(),
});

const RecursosGlobalesSchema = z
  .object({
    musicaPrincipal: z.string().optional(),
    intro: z.string().optional(),
    outro: z.string().optional(),
  })
  .optional();

const ProduccionCppSchema = z.object({
  titulo: z.string().min(1),
  formato: z.string().min(1),
  ideaCentral: z.string().min(1),
  objetivoGeneral: z.string().optional(),
  objetivoEspectador: z.string().optional(),
  publicoObjetivo: z.string().optional(),
  duracionEstimadaSegundos: z.number().optional(),
  contexto: z.string().optional(),
  notas: z.string().optional(),
  // Sprint 3, corrección 3: portada de la Producción en el Dashboard.
  // NUNCA la Miniatura (campo `miniatura` de la raíz, entidad aparte).
  coverImage: z.string().optional(),
  recursosGlobales: RecursosGlobalesSchema,
});

const EscenaCppSchema = z.object({
  numero: z.number().int().min(1),
  // Enum abierto (regla 6 del contrato) — cualquier string es válido acá;
  // la traducción a TIPOS_ESCENA_STORYBOARD (con fallback a "OTRA") ocurre
  // en la capa de importación, nunca acá — este archivo valida la FORMA
  // del paquete, no el vocabulario interno de Content OS.
  tipo: z.string().min(1),
  objetivoNarrativo: z.string().min(1),
  textoHablado: z.string().optional(),
  textoPantalla: z.string().optional(),
  duracionEstimadaSegundos: z.number().optional(),
  personajes: z.array(z.string()).optional(),
  locacion: z.string().optional(),
  plano: z.string().optional(),
  movimientoCamara: z.string().optional(),
  recursosNecesarios: z.array(z.string()).optional(),
  musica: z.string().optional(),
  transicion: z.string().optional(),
  notas: z.string().optional(),
});

const RecursoCppSchema = z.object({
  nombre: z.string().min(1),
  tipo: z.string().min(1),
  valor: z.string().optional(),
  notas: z.string().optional(),
  etiquetas: z.array(z.string()).optional(),
});

const MiniaturaCppSchema = z
  .object({
    descripcion: z.string().min(1),
    promptVisual: z.string().optional(),
    textoEnMiniatura: z.string().optional(),
    referenciaVisual: z.string().optional(),
    variantes: z
      .array(z.object({ descripcion: z.string(), promptVisual: z.string().optional() }))
      .optional(),
  })
  .nullable()
  .optional();

const PublicacionCppSchema = z
  .object({
    fechaPlanificada: z.string().optional(),
    plataformas: z.array(z.string()).optional(),
    copy: z.string().optional(),
    hashtags: z.array(z.string()).optional(),
    cta: z.string().optional(),
  })
  .nullable()
  .optional();

export const CreatorOSProductionPackageSchema = z.object({
  creatorOSPackage: z.string(),
  packageId: z.string().min(1),
  createdBy: CreadoPorSchema,
  // Objeto libre, sin campos predefinidos (contrato sección 1) — cualquier
  // clave se acepta y se conserva tal cual, nunca invalida el paquete.
  metadata: z.record(z.string(), z.unknown()).optional(),
  produccion: ProduccionCppSchema,
  escenas: z.array(EscenaCppSchema).min(1),
  recursos: z.array(RecursoCppSchema).optional(),
  miniatura: MiniaturaCppSchema,
  publicacion: PublicacionCppSchema,
});

export type CreatorOSProductionPackage = z.infer<typeof CreatorOSProductionPackageSchema>;
export type EscenaCPP = z.infer<typeof EscenaCppSchema>;
export type RecursoCPP = z.infer<typeof RecursoCppSchema>;

export type ResultadoParseoCPP = { ok: true; paquete: CreatorOSProductionPackage } | { ok: false; error: string };

function mayorDeVersion(version: string): number | null {
  const coincidencia = /^(\d+)\.(\d+)$/.exec(version.trim());
  if (!coincidencia) return null;
  return Number(coincidencia[1]);
}

/** Valida un CreatorOS Production Package pegado/subido por el usuario —
 * en el orden que exige el contrato (versión primero, luego forma, luego
 * las reglas que no expresa el propio schema de Zod). Nunca corrige ni
 * completa datos faltantes: si no valida, el usuario debe conseguir un
 * paquete corregido. Ver RFC-002 sección 2 para el orden de validación
 * aplicado por el importador completo (esta función es el paso 3-4-5 de
 * ese flujo). */
export function parsearCreatorOSPackage(textoCrudo: string): ResultadoParseoCPP {
  const texto = textoCrudo.trim();
  if (!texto) {
    return { ok: false, error: "El archivo está vacío." };
  }

  let json: unknown;
  try {
    json = JSON.parse(texto);
  } catch {
    return { ok: false, error: "El archivo no es un JSON válido — asegurate de que sea el .cpp.json exportado, sin editar a mano." };
  }

  // Regla 1-2 del contrato: versión y packageId se validan ANTES que
  // cualquier otra cosa, incluso antes de correr el schema completo.
  if (json === null || typeof json !== "object") {
    return { ok: false, error: "El paquete no es un objeto JSON válido." };
  }
  const raiz = json as Record<string, unknown>;

  if (typeof raiz.creatorOSPackage !== "string") {
    return { ok: false, error: 'Falta el campo "creatorOSPackage" (versión del paquete).' };
  }
  const mayor = mayorDeVersion(raiz.creatorOSPackage);
  if (mayor === null) {
    return { ok: false, error: `Versión de paquete con formato inválido: "${raiz.creatorOSPackage}".` };
  }
  if (mayor !== CPP_MAJOR_SOPORTADO) {
    return {
      ok: false,
      error: `Esta versión de Content OS entiende paquetes CreatorOS v${CPP_MAJOR_SOPORTADO}.x. Recibiste un paquete v${raiz.creatorOSPackage} — actualizá la aplicación o pedí un paquete compatible.`,
    };
  }

  if (typeof raiz.packageId !== "string" || !raiz.packageId.trim()) {
    return { ok: false, error: 'Falta el campo "packageId" (identidad única del paquete).' };
  }

  const resultado = CreatorOSProductionPackageSchema.safeParse(json);
  if (!resultado.success) {
    const detalle = resultado.error.issues
      .map((i) => `${i.path.join(".") || "(raíz)"}: ${i.message}`)
      .join(" · ");
    return { ok: false, error: `El paquete no cumple el contrato — ${detalle}` };
  }

  // Regla 4 del contrato: números de escena sin duplicados.
  const numeros = resultado.data.escenas.map((e) => e.numero);
  if (new Set(numeros).size !== numeros.length) {
    return { ok: false, error: "Hay escenas con el mismo número — cada escena debe tener un número único." };
  }

  return { ok: true, paquete: resultado.data };
}

/** SPRINT_EXECUTION_2: busca, dentro de un CreatorOS Production Package
 * ya guardado (`producciones.cppOriginal`), la escena que tenía este
 * número ORIGINAL del paquete — el mismo valor que se guarda en
 * `numeroEnAnalisisDirector` al importar, nunca el `numero` visible
 * actual (ese cambia con cada reordenamiento/duplicación/eliminación).
 * Es un respaldo de solo lectura para cuando una escena no tiene
 * Personaje/Locación/Plano vinculado en la Biblioteca: nunca lanza — si
 * el texto no es un CPP válido o la escena ya no está, devuelve `null` en
 * vez de romper la pantalla que lo llama. */
export function buscarEscenaOriginalCpp(
  cppOriginal: string | null,
  numeroOriginal: number | null,
): EscenaCPP | null {
  if (!cppOriginal || numeroOriginal === null) return null;
  try {
    const json: unknown = JSON.parse(cppOriginal);
    if (json === null || typeof json !== "object" || !("escenas" in json)) return null;
    const escenas = (json as { escenas: unknown }).escenas;
    if (!Array.isArray(escenas)) return null;
    const encontrada = escenas.find(
      (e): e is EscenaCPP => typeof e === "object" && e !== null && (e as EscenaCPP).numero === numeroOriginal,
    );
    return encontrada ?? null;
  } catch {
    return null;
  }
}
