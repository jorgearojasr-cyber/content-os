"use client";

import { ESTADOS_PRODUCCION_ESCENA } from "@/lib/types";
import { infoEstadoProduccion as info } from "@/lib/estado-produccion";

/** Badge de solo lectura para la tarjeta cuando no se quiere el dropdown
 * (ej. mientras se guarda). */
export function EstadoProduccionBadge({ estado }: { estado: string }) {
  const { icono, etiqueta, clase } = info(estado);
  return (
    <span className={`inline-flex items-center gap-1 text-[12px] ${clase}`}>
      {icono} {etiqueta}
    </span>
  );
}

/** Dropdown de estado con persistencia inmediata — mismo componente para la
 * tarjeta y el header del panel lateral. */
export function EstadoProduccionSelect({
  escenaId,
  estado,
  onChange,
}: {
  escenaId: string;
  estado: string;
  onChange: (escenaId: string, estado: string) => Promise<void>;
}) {
  const { icono, clase } = info(estado);
  return (
    <span className={`inline-flex items-center gap-1 text-[12px] ${clase}`}>
      {icono}
      <select
        value={estado}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          e.stopPropagation();
          onChange(escenaId, e.target.value);
        }}
        className={`cursor-pointer border-none bg-transparent text-[12px] font-medium ${clase}`}
      >
        {ESTADOS_PRODUCCION_ESCENA.map((valor) => (
          <option key={valor} value={valor}>
            {info(valor).etiqueta}
          </option>
        ))}
      </select>
    </span>
  );
}
