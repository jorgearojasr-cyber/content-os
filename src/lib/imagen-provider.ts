import { readFile } from "node:fs/promises";
import path from "node:path";
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

// GPT Image solo acepta jpeg/png/webp como imagen de referencia. `toFile`
// no adivina el tipo MIME a partir de un Buffer + nombre de archivo — hay
// que indicarlo explícitamente o OpenAI la recibe como
// application/octet-stream y la rechaza.
const MIME_POR_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function mimeDeRuta(rutaLocal: string): string {
  const extension = path.extname(rutaLocal).replace(".", "").toLowerCase();
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
 * `fotoReferenciaUrl` (ruta local `/uploads/xxx.jpg`, típicamente la foto
 * del Personaje en Identidad), usa el endpoint de EDICIÓN con esa imagen
 * como referencia; si no, genera de texto a imagen normal. Guarda el
 * resultado con el mismo `guardarArchivoSubido` que ya usan Activos y la
 * foto de Personaje (no duplica lógica de guardado), y devuelve la ruta
 * pública final (`/uploads/xxx.png`).
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
      const rutaLocal = path.join(process.cwd(), "public", fotoReferenciaUrl);
      const buffer = await readFile(rutaLocal);
      imagenReferencia = await toFile(buffer, path.basename(rutaLocal), { type: mimeDeRuta(rutaLocal) });
    } catch (err) {
      console.error(err);
      throw new Error(
        "No se encontró la foto de referencia del Personaje en el servidor. Vuelve a subirla en Identidad.",
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
