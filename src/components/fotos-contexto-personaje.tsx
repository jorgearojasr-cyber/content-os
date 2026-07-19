"use client";

import { useState } from "react";
import { FileUploader } from "./file-uploader";
import { urlImagenVisible } from "@/lib/imagen-url";
import type { FotoContextoPersonaje } from "@/lib/types";

/**
 * Galería ADICIONAL de fotos de contexto de un Personaje — etiqueta libre,
 * sin límite (mismo patrón que las etiquetas de Activos). Distinta de las
 * 4 fotos de referencia fijas (`FotosPersonaje`): estas son solo
 * referencia visual para el usuario, la guía de producción NO las
 * descarga. Solo disponible con el Personaje ya guardado.
 */
export function FotosContextoPersonaje({
  fotosIniciales,
  onSubir,
  onEditarEtiqueta,
  onEliminar,
}: {
  fotosIniciales: FotoContextoPersonaje[];
  onSubir: (formData: FormData) => Promise<FotoContextoPersonaje[]>;
  onEditarEtiqueta: (url: string, etiqueta: string) => Promise<FotoContextoPersonaje[]>;
  onEliminar: (url: string) => Promise<FotoContextoPersonaje[]>;
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

  async function guardarEtiqueta(url: string, etiqueta: string) {
    setFotos((prev) => prev.map((f) => (f.url === url ? { ...f, etiqueta } : f)));
    try {
      await onEditarEtiqueta(url, etiqueta);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la etiqueta.");
    }
  }

  return (
    <div>
      <p className="mb-2 text-[12px] leading-snug text-text-muted/80">
        Fotos de contexto (sentado, trabajando, sonriendo…) — solo referencia visual, la guía de
        producción no las usa.
      </p>
      {error ? <p className="mb-1.5 text-[12.5px] text-danger">{error}</p> : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {fotos.map((foto) => (
          <div key={foto.url}>
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={urlImagenVisible(foto.url)}
                alt={foto.etiqueta || "Foto de contexto"}
                className="h-24 w-full rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={() => eliminar(foto.url)}
                disabled={eliminando === foto.url}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[11px] leading-none text-white hover:bg-black/80"
                aria-label="Eliminar esta foto de contexto"
              >
                {eliminando === foto.url ? "…" : "✕"}
              </button>
            </div>
            <input
              defaultValue={foto.etiqueta}
              placeholder="Etiqueta (ej: sentado)"
              onBlur={(e) => guardarEtiqueta(foto.url, e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-2 py-1 text-[11.5px] text-text placeholder:text-text-muted/60"
            />
          </div>
        ))}
      </div>

      <div className="mt-2 max-w-[200px]">
        <FileUploader
          name="foto-contexto-nueva"
          label="+ Agregar foto de contexto"
          onUpload={async (fd) => {
            const nuevas = await onSubir(fd);
            setFotos(nuevas);
            return nuevas[nuevas.length - 1]?.url ?? "";
          }}
        />
      </div>
    </div>
  );
}
