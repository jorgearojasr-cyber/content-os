"use client";

import { useState } from "react";
import { compileIdentity, identidadPorSeccion } from "@/lib/identity-compiler";
import type { Avatar, Identidad, Personaje } from "@/lib/types";

/**
 * Checklist visual del Compilador de Identidad — mismo componente reutilizado
 * en Identidad, Crear y Editar de Biblioteca. No recalcula ni resume nada:
 * el texto completo (compileIdentity, o `textoDetalle` si se pasa uno
 * congelado) sigue siendo exactamente el mismo, solo colapsado por defecto.
 */
export function IdentidadChecklist({
  identidad,
  activosCount,
  tienePersonaje,
  tieneAvatar,
  personaje = null,
  avatar = null,
  textoDetalle,
}: {
  identidad: Identidad;
  activosCount: number;
  /** ¿Existe al menos un Personaje/Avatar en el proyecto? — para el ✔/✗. */
  tienePersonaje: boolean;
  tieneAvatar: boolean;
  /** Personaje/Avatar a usar para "Ver detalles" cuando no se pasa
   * `textoDetalle` (normalmente el más reciente). */
  personaje?: Personaje | null;
  avatar?: Avatar | null;
  /** Texto a mostrar en "Ver detalles". Por defecto, `compileIdentity(identidad)`
   * recién calculado. Se puede pasar un texto ya congelado (ej. el que se
   * guardó al crear una pieza en Biblioteca) para no reemplazarlo por el
   * estado actual de la identidad, que puede haber cambiado desde entonces. */
  textoDetalle?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const porSeccion = identidadPorSeccion(identidad, { tienePersonaje, tieneAvatar });

  const secciones = [
    { label: "Marca", ok: porSeccion.marca },
    { label: "Avatar", ok: porSeccion.avatar },
    { label: "Personaje", ok: porSeccion.personaje },
    { label: "Estilo", ok: porSeccion.estilo },
    { label: "Activos", ok: activosCount > 0 },
  ];
  const completo = secciones.every((s) => s.ok);

  return (
    <div>
      <ul className="space-y-1.5">
        {secciones.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-[13.5px] text-text">
            <span className={s.ok ? "text-accent" : "text-danger"}>{s.ok ? "✔" : "✗"}</span>
            {s.label}
          </li>
        ))}
      </ul>

      <p className="mt-3 text-[13px] font-medium text-text">
        Estado de entrenamiento: {completo ? "Completo" : "Incompleto"}
      </p>

      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="mt-2 text-[12.5px] text-accent hover:underline"
      >
        {abierto ? "Ocultar detalles" : "Ver detalles"}
      </button>

      {abierto ? (
        <pre className="mt-2 whitespace-pre-wrap rounded-xl border border-border bg-surface-2 p-3.5 font-mono text-[12.5px] text-text-muted">
          {textoDetalle ?? compileIdentity(identidad, { personajes: personaje ? [personaje] : [], avatar })}
        </pre>
      ) : null}
    </div>
  );
}
