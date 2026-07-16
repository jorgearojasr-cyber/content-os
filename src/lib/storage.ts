import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

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

const TAMANO_MAXIMO_BYTES = 15 * 1024 * 1024;

/**
 * Guarda un archivo subido en `public/uploads/` con un nombre único y
 * devuelve su ruta pública (ej: "/uploads/<uuid>.png"). Compartido por
 * la foto de referencia del personaje y por los Activos de tipo archivo.
 */
export async function guardarArchivoSubido(file: File): Promise<string> {
  if (!file || file.size === 0) throw new Error("El archivo está vacío.");
  if (file.size > TAMANO_MAXIMO_BYTES) {
    throw new Error("El archivo supera los 15 MB permitidos.");
  }

  await mkdir(UPLOADS_DIR, { recursive: true });

  const extensionOriginal = path.extname(file.name).replace(".", "").toLowerCase();
  const extension = EXTENSIONES_PERMITIDAS[file.type] ?? (extensionOriginal || "bin");
  const nombreArchivo = `${randomUUID()}.${extension}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOADS_DIR, nombreArchivo), buffer);

  return `/uploads/${nombreArchivo}`;
}
