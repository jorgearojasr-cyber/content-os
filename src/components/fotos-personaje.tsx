"use client";

import { useState } from "react";
import { FileUploader } from "./file-uploader";
import { urlImagenVisible } from "@/lib/imagen-url";
import {
  AYUDA_TIPO_FOTO_PERSONAJE,
  ETIQUETA_TIPO_FOTO_PERSONAJE,
  TIPO_FOTO_PERSONAJE_OBLIGATORIO,
  TIPOS_FOTO_PERSONAJE,
} from "@/lib/types";
import type { FotoPersonaje, TipoFotoPersonaje } from "@/lib/types";

/**
 * Editor de las fotos de referencia del Personaje — 4 slots FIJOS, uno por
 * `TipoFotoPersonaje` (rostro/perfil/medioCuerpo/cuerpoCompleto), no un
 * arreglo genérico de "hasta 4 fotos" como antes. Solo "rostro" es
 * obligatoria (es el mínimo para que el Personaje funcione como referencia
 * visual). Subir a un slot que ya tenía foto la REEMPLAZA. Cada foto viaja
 * además como `<input name="fotos">` oculto (JSON `{url, tipo}`) para que
 * "Guardar cambios"/"Crear personaje" la capture también si vino de un
 * enlace pegado a mano en el uploader, no solo de una subida de archivo.
 */
export function FotosPersonaje({
  fotosIniciales,
  onSubir,
  onEliminar,
}: {
  fotosIniciales: FotoPersonaje[];
  onSubir: (tipo: TipoFotoPersonaje, formData: FormData) => Promise<string>;
  onEliminar: (tipo: TipoFotoPersonaje, url: string) => Promise<void>;
}) {
  const [fotos, setFotos] = useState(fotosIniciales);
  const [eliminando, setEliminando] = useState<TipoFotoPersonaje | null>(null);
  const [error, setError] = useState("");

  async function eliminar(tipo: TipoFotoPersonaje, url: string) {
    setEliminando(tipo);
    setError("");
    try {
      await onEliminar(tipo, url);
      setFotos((prev) => prev.filter((f) => f.tipo !== tipo));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar la foto.");
    } finally {
      setEliminando(null);
    }
  }

  return (
    <div>
      {error ? <p className="mb-1.5 text-[12.5px] text-danger">{error}</p> : null}
      <div className="grid grid-cols-2 gap-3">
        {TIPOS_FOTO_PERSONAJE.map((tipo) => {
          const foto = fotos.find((f) => f.tipo === tipo);
          const obligatoria = tipo === TIPO_FOTO_PERSONAJE_OBLIGATORIO;
          return (
            <div key={tipo}>
              <p className="text-[12.5px] font-medium text-text">
                {ETIQUETA_TIPO_FOTO_PERSONAJE[tipo]}
                {obligatoria ? " *" : ""}
              </p>
              <p className="mb-1.5 text-[11px] leading-snug text-text-muted/80">
                {AYUDA_TIPO_FOTO_PERSONAJE[tipo]}
              </p>

              {foto ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={urlImagenVisible(foto.url)}
                    alt={`Foto de referencia (${ETIQUETA_TIPO_FOTO_PERSONAJE[tipo]})`}
                    className="h-24 w-full rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => eliminar(tipo, foto.url)}
                    disabled={eliminando === tipo}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[11px] leading-none text-white hover:bg-black/80"
                    aria-label={`Eliminar la foto de ${ETIQUETA_TIPO_FOTO_PERSONAJE[tipo]}`}
                  >
                    {eliminando === tipo ? "…" : "✕"}
                  </button>
                  <input type="hidden" name="fotos" value={JSON.stringify(foto)} />
                </div>
              ) : (
                <FileUploader
                  key={tipo}
                  name={`foto-${tipo}`}
                  onUpload={async (fd) => {
                    const url = await onSubir(tipo, fd);
                    setFotos((prev) => [...prev.filter((f) => f.tipo !== tipo), { url, tipo }]);
                    return url;
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
