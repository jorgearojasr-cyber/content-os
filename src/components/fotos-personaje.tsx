"use client";

import { useState } from "react";
import { FileUploader } from "./file-uploader";
import { urlImagenVisible } from "@/lib/imagen-url";
import { MAX_FOTOS_PERSONAJE } from "@/lib/types";

const ETIQUETAS_SUGERIDAS = ["frente", "perfil", "cuerpo completo", "otra"];

/**
 * Editor de las fotos de referencia del Personaje (hasta `MAX_FOTOS_PERSONAJE`)
 * — miniaturas con botón de eliminar individual, y el mismo `FileUploader` ya
 * usado para Logo/foto única para agregar la siguiente (reutilizado tal
 * cual, sin duplicarlo). Cada subida y cada eliminación persiste de
 * inmediato (mismo patrón que `subirLogo`); además, cada foto también se
 * manda como `<input name="fotosUrls">` oculto para que "Guardar identidad"
 * capture también una URL pegada a mano en el uploader, no solo las
 * subidas por archivo.
 */
export function FotosPersonaje({
  fotosIniciales,
  onSubir,
  onEliminar,
}: {
  fotosIniciales: string[];
  onSubir: (formData: FormData) => Promise<string[]>;
  onEliminar: (url: string) => Promise<string[]>;
}) {
  const [fotos, setFotos] = useState(fotosIniciales);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function eliminar(url: string) {
    setEliminando(url);
    setError("");
    try {
      setFotos(await onEliminar(url));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar la foto.");
    } finally {
      setEliminando(null);
    }
  }

  return (
    <div>
      {fotos.length > 0 ? (
        <div className="mb-2 grid grid-cols-4 gap-2">
          {fotos.map((url) => (
            <div key={url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={urlImagenVisible(url)}
                alt="Foto de referencia del Personaje"
                className="h-20 w-full rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={() => eliminar(url)}
                disabled={eliminando === url}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[11px] leading-none text-white hover:bg-black/80"
                aria-label="Eliminar esta foto"
              >
                {eliminando === url ? "…" : "✕"}
              </button>
              <input type="hidden" name="fotosUrls" value={url} />
            </div>
          ))}
        </div>
      ) : null}

      {error ? <p className="mb-1.5 text-[12.5px] text-danger">{error}</p> : null}

      {fotos.length < MAX_FOTOS_PERSONAJE ? (
        <>
          <p className="mb-1.5 text-[12px] leading-snug text-text-muted/80">
            Sube una imagen desde tu computador, arrástrala, pégala con Ctrl+V, o usa un enlace
            público. Sugerencia para esta foto: {ETIQUETAS_SUGERIDAS[fotos.length]} (no
            obligatorio).
          </p>
          <FileUploader
            key={fotos.length}
            name="fotosUrls"
            onUpload={async (fd) => {
              const nuevas = await onSubir(fd);
              setFotos(nuevas);
              return nuevas.at(-1) ?? "";
            }}
          />
        </>
      ) : (
        <p className="text-[12px] text-text-muted">
          Ya tienes las {MAX_FOTOS_PERSONAJE} fotos permitidas — elimina una para subir otra.
        </p>
      )}
    </div>
  );
}
