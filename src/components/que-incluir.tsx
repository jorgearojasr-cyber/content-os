"use client";

import type { Avatar, Personaje } from "@/lib/types";
import type { PosicionLogo } from "@/lib/identity-compiler";

export const OPCIONES_POSICION_LOGO: { value: PosicionLogo; etiqueta: string }[] = [
  { value: "superior-izquierda", etiqueta: "Esquina superior izquierda" },
  { value: "superior-derecha", etiqueta: "Esquina superior derecha" },
  { value: "inferior-izquierda", etiqueta: "Esquina inferior izquierda" },
  { value: "inferior-derecha", etiqueta: "Esquina inferior derecha" },
];

/** La única opción es de proyecto -> se auto-selecciona sin selector (cero
 * fricción). Cualquier otro caso con al menos 2 opciones (de proyecto y/o
 * de estudio), o con la única opción siendo del estudio, sí muestra
 * selector — un Personaje del estudio nunca se elige solo. */
export function haySelectorDePersonaje(personajes: Personaje[], personajesEstudio: Personaje[]): boolean {
  const total = personajes.length + personajesEstudio.length;
  return total > 1 || (total === 1 && personajes.length === 0);
}

/**
 * "Qué incluir en esta pieza" — Personaje / voz de marca (con Avatar) /
 * datos de contacto / logo. Mismo componente usado en Crear Paso 4 y en la
 * pantalla de editar una pieza ya guardada (Biblioteca), para que ambos
 * lugares se comporten idénticos y no haya dos copias de esta lógica.
 */
export function QueIncluir({
  mostrarPersonaje,
  incluirPersonaje,
  setIncluirPersonaje,
  personajes,
  personajesEstudio,
  personajeIds,
  onTogglePersonaje,
  onElegirAutomatico,
  incluirMarca,
  setIncluirMarca,
  avatares,
  avatarId,
  setAvatarId,
  mostrarContacto,
  incluirContacto,
  setIncluirContacto,
  logoUrl,
  incluirLogo,
  setIncluirLogo,
  posicionLogo,
  setPosicionLogo,
}: {
  mostrarPersonaje: boolean;
  incluirPersonaje: boolean;
  setIncluirPersonaje: (v: boolean) => void;
  personajes: Personaje[];
  personajesEstudio: Personaje[];
  /** Selección múltiple — misma fuente de verdad que el carrusel de la
   * tarjeta "Personajes" en Crear (`personajeSeleccion.ids`), nunca un
   * estado separado. */
  personajeIds: string[];
  onTogglePersonaje: (id: string) => void;
  /** "✨ Automático": vacía la selección sin desmarcar "Usar Personaje" —
   * a diferencia de "Ninguno", que sí la desmarca. */
  onElegirAutomatico: () => void;
  incluirMarca: boolean;
  setIncluirMarca: (v: boolean) => void;
  avatares: Avatar[];
  avatarId: string;
  setAvatarId: (v: string) => void;
  mostrarContacto: boolean;
  incluirContacto: boolean;
  setIncluirContacto: (v: boolean) => void;
  /** `identidad.logoUrl` tal cual — vacío = sin logo cargado en Identidad,
   * la casilla "Incluir logo" queda deshabilitada. */
  logoUrl: string;
  incluirLogo: boolean;
  setIncluirLogo: (v: boolean) => void;
  posicionLogo: PosicionLogo;
  setPosicionLogo: (v: PosicionLogo) => void;
}) {
  const mostrarSelectorPersonaje = haySelectorDePersonaje(personajes, personajesEstudio);

  return (
    <div className="mb-4 rounded-xl border border-border bg-surface-2 p-3.5">
      <p className="mb-2 text-[12.5px] font-medium text-text-muted">Qué incluir en esta pieza</p>
      <div className="flex flex-col gap-1.5">
        {mostrarPersonaje ? (
          <div>
            <label className="flex items-center gap-2 text-[13px] text-text">
              <input
                type="checkbox"
                checked={incluirPersonaje}
                onChange={(e) => setIncluirPersonaje(e.target.checked)}
              />
              Usar Personaje
            </label>
            {incluirPersonaje && mostrarSelectorPersonaje ? (
              <div className="mt-1.5 space-y-1 rounded-lg border border-border bg-surface px-3 py-2">
                <label className="flex items-center gap-2 text-[12.5px] text-text">
                  <input
                    type="checkbox"
                    checked={personajeIds.length === 0}
                    onChange={onElegirAutomatico}
                  />
                  ✨ Automático (usa el primero disponible)
                </label>
                {personajes.length > 0 ? (
                  <div className="mt-1.5">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                      De este proyecto
                    </p>
                    {personajes.map((p) => (
                      <label key={p.id} className="flex items-center gap-2 text-[12.5px] text-text">
                        <input
                          type="checkbox"
                          checked={personajeIds.includes(p.id)}
                          onChange={() => onTogglePersonaje(p.id)}
                        />
                        {p.nombre || "Personaje sin nombre"}
                      </label>
                    ))}
                  </div>
                ) : null}
                {personajesEstudio.length > 0 ? (
                  <div className="mt-1.5">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                      Del estudio
                    </p>
                    {personajesEstudio.map((p) => (
                      <label key={p.id} className="flex items-center gap-2 text-[12.5px] text-text">
                        <input
                          type="checkbox"
                          checked={personajeIds.includes(p.id)}
                          onChange={() => onTogglePersonaje(p.id)}
                        />
                        {p.nombre || "Personaje sin nombre"}
                      </label>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
        <div>
          <label className="flex items-center gap-2 text-[13px] text-text">
            <input
              type="checkbox"
              checked={incluirMarca}
              onChange={(e) => setIncluirMarca(e.target.checked)}
            />
            Usar voz y tono de la marca
          </label>
          {incluirMarca && avatares.length > 1 ? (
            <select
              value={avatarId}
              onChange={(e) => setAvatarId(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[12.5px] text-text"
            >
              {avatares.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombreFicticio || "Avatar sin nombre"}
                </option>
              ))}
            </select>
          ) : null}
        </div>
        {mostrarContacto ? (
          <label className="flex items-center gap-2 text-[13px] text-text">
            <input
              type="checkbox"
              checked={incluirContacto}
              onChange={(e) => setIncluirContacto(e.target.checked)}
            />
            Incluir datos de contacto
          </label>
        ) : null}
        <div>
          <label
            className={`flex items-center gap-2 text-[13px] ${logoUrl.trim() ? "text-text" : "text-text-muted"}`}
          >
            <input
              type="checkbox"
              checked={incluirLogo}
              disabled={!logoUrl.trim()}
              onChange={(e) => setIncluirLogo(e.target.checked)}
            />
            Incluir logo
          </label>
          {!logoUrl.trim() ? (
            <p className="mt-1 text-[11.5px] text-text-muted">
              Carga un logo en Identidad para poder incluirlo.
            </p>
          ) : null}
          {incluirLogo && logoUrl.trim() ? (
            <select
              value={posicionLogo}
              onChange={(e) => setPosicionLogo(e.target.value as PosicionLogo)}
              className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[12.5px] text-text"
            >
              {OPCIONES_POSICION_LOGO.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.etiqueta}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      </div>
    </div>
  );
}
