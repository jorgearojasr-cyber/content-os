import { randomUUID } from "node:crypto";
import path from "node:path";
import { del, put } from "@vercel/blob";

const EXTENSIONES_PERMITIDAS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "application/pdf": "pdf",
};

// La subida simple del servidor a Vercel Blob (put() desde una Server
// Action) tiene un límite de 4.5MB por archivo — no es un límite de Blob
// en sí, sino del cuerpo de la función serverless que la recibe. Archivos
// más grandes necesitarían subida por partes directo desde el cliente,
// fuera de alcance por ahora.
const TAMANO_MAXIMO_BYTES = 4.5 * 1024 * 1024;

/**
 * Sube un archivo a Vercel Blob (acceso PRIVADO — requiere el token de la
 * app para leerlo, ver `imagenes/route.ts`) con un nombre único, y
 * devuelve su URL de Blob. Compartido por la foto de referencia del
 * Personaje, los Activos de tipo archivo, y las imágenes generadas por IA.
 */
export async function guardarArchivoSubido(file: File): Promise<string> {
  if (!file || file.size === 0) throw new Error("El archivo está vacío.");
  if (file.size > TAMANO_MAXIMO_BYTES) {
    throw new Error("El archivo supera los 4.5 MB permitidos por subida.");
  }

  const extensionOriginal = path.extname(file.name).replace(".", "").toLowerCase();
  const extension = EXTENSIONES_PERMITIDAS[file.type] ?? (extensionOriginal || "bin");
  const nombreArchivo = `${randomUUID()}.${extension}`;

  const blob = await put(nombreArchivo, file, {
    access: "private",
    addRandomSuffix: false,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  return blob.url;
}

/** Borra un archivo previamente subido a Vercel Blob, dada su URL. */
export async function eliminarArchivoSubido(url: string): Promise<void> {
  await del(url, { token: process.env.BLOB_READ_WRITE_TOKEN });
}
