import path from "node:path";
import { get } from "@vercel/blob";
import OpenAI, {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
  AuthenticationError,
  RateLimitError,
  toFile,
} from "openai";
import { guardarArchivoSubido } from "./storage";
import type { CalidadImagen } from "./types";

/**
 * PROVEEDOR DE IMAGEN (OpenAI — GPT Image)
 * ------------------------------------------------------------------
 * Archivo aditivo e independiente: no toca ai.ts ni ai-provider.ts, que son
 * de generación de TEXTO (Anthropic/Claude). Este es un proveedor distinto,
 * para un tipo de generación distinto (imagen), con su propia clave de API
 * y su propio manejo de errores — mismo espíritu que ai-provider.ts, sin
 * compartir código con él porque las formas de la llamada son diferentes
 * (texto→JSON validado por schema vs. texto→imagen).
 * ------------------------------------------------------------------
 */

const MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";

// GPT Image solo acepta jpeg/png/webp como imagen de referencia. Blob
// guarda el content-type real del archivo subido, pero por si acaso llega
// vacío o genérico, hay un respaldo por extensión del pathname.
const MIME_ACEPTADOS_GPT_IMAGE = new Set(["image/jpeg", "image/png", "image/webp"]);
const MIME_POR_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function mimeDePathname(pathname: string): string {
  const extension = path.extname(pathname).replace(".", "").toLowerCase();
  return MIME_POR_EXTENSION[extension] ?? "image/png";
}

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Falta configurar OPENAI_API_KEY. Crea una cuenta en platform.openai.com, genera una " +
        "API key y agrégala como variable de entorno (archivo .env.local en content-os/) " +
        "antes de generar imágenes.",
    );
  }
  return new OpenAI({ apiKey });
}

/**
 * Genera una imagen real con la API de imágenes de OpenAI. Si se pasa
 * `fotoReferenciaUrl` (URL de Vercel Blob, típicamente la primera de las
 * fotos del Personaje en Identidad — el llamador decide cuál manda), la
 * descarga desde Blob y usa el endpoint de EDICIÓN con esa imagen como
 * referencia; si no, genera de texto a imagen normal. Guarda el resultado
 * con el mismo `guardarArchivoSubido` que ya usan Activos y las fotos de
 * Personaje (no duplica lógica de guardado), y devuelve la URL de Blob
 * final.
 *
 * Identidad ahora permite hasta 4 fotos de referencia del Personaje, pero
 * este proveedor sigue aceptando una sola — usar varias referencias a la
 * vez en el mismo llamado a la API de imágenes es una mejora futura del
 * proveedor, no de esta ronda.
 */
export async function generarImagenIA(
  prompt: string,
  fotoReferenciaUrl: string | undefined,
  calidad: CalidadImagen,
): Promise<string> {
  const client = getClient();

  let imagenReferencia: File | undefined;
  if (fotoReferenciaUrl) {
    try {
      const resultado = await get(fotoReferenciaUrl, {
        access: "private",
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      if (!resultado?.stream) {
        throw new Error("Blob no devolvió contenido para la foto de referencia.");
      }
      const buffer = Buffer.from(await new Response(resultado.stream).arrayBuffer());
      const contentType = MIME_ACEPTADOS_GPT_IMAGE.has(resultado.blob.contentType ?? "")
        ? (resultado.blob.contentType as string)
        : mimeDePathname(resultado.blob.pathname);
      imagenReferencia = await toFile(buffer, resultado.blob.pathname, { type: contentType });
    } catch (err) {
      console.error(err);
      throw new Error(
        "No se encontró la foto de referencia del Personaje en Blob. Vuelve a subirla en Identidad.",
      );
    }
  }

  let response;
  try {
    response = imagenReferencia
      ? await client.images.edit({ image: imagenReferencia, prompt, model: MODEL, quality: calidad })
      : await client.images.generate({ prompt, model: MODEL, quality: calidad });
  } catch (err) {
    console.error(err);
    if (err instanceof AuthenticationError) {
      throw new Error("La API key de OpenAI no es válida. Revisa OPENAI_API_KEY.");
    }
    if (err instanceof RateLimitError) {
      throw new Error("Límite de uso de la API de OpenAI alcanzado. Intenta de nuevo en unos minutos.");
    }
    if (err instanceof APIConnectionTimeoutError) {
      throw new Error("Tiempo de espera agotado al contactar a OpenAI. Intenta de nuevo.");
    }
    if (err instanceof APIConnectionError) {
      throw new Error("No se pudo conectar con la API de OpenAI. Revisa tu conexión a internet.");
    }
    if (err instanceof APIError) {
      throw new Error(`Error de la API de OpenAI: ${err.message}`);
    }
    throw err;
  }

  const base64 = response.data?.[0]?.b64_json;
  if (!base64) {
    throw new Error("OpenAI no devolvió ninguna imagen. Intenta de nuevo.");
  }

  const buffer = Buffer.from(base64, "base64");
  const archivo = new File([buffer], "imagen-generada.png", { type: "image/png" });
  return guardarArchivoSubido(archivo);
}
