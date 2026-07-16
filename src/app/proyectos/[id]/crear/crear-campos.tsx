"use client";

import { Input, Label, Textarea } from "@/components/ui";
import { ContenidoRelacionadoPanel } from "@/components/contenido-relacionado-panel";
import type { ContenidoRelacionado } from "@/lib/actions";
import {
  DURACIONES_VIDEO_CORTO,
  ESTILOS_IMAGEN,
  NUMEROS_ESCENAS,
  NUMEROS_PAGINAS_CARRUSEL,
  PLATAFORMAS_CONTENIDO,
  TIPOS_CONTENIDO,
  TIPOS_PRODUCCION,
  type TipoContenido,
} from "@/lib/types";

export type ConfigCreacion = {
  tipoContenido: TipoContenido | "";
  tipoProduccion: string;
  tema: string;
  plataforma: string;
  duracion: string;
  numeroEscenas: string;
  numeroPaginas: string;
  estiloImagen: string;
};

export const CONFIG_VACIA: ConfigCreacion = {
  tipoContenido: "",
  tipoProduccion: "",
  tema: "",
  plataforma: "",
  duracion: "",
  numeroEscenas: "",
  numeroPaginas: "",
  estiloImagen: "",
};

function TarjetaSeleccion({
  seleccionado,
  onClick,
  children,
}: {
  seleccionado: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3.5 py-3 text-left text-[13px] transition-colors ${
        seleccionado
          ? "border-accent bg-accent-soft text-text"
          : "border-border bg-surface-2 text-text-muted hover:border-accent/50 hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

function Select({
  value,
  onChange,
  opciones,
}: {
  value: string;
  onChange: (v: string) => void;
  opciones: readonly string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-3 text-[13.5px] text-text"
    >
      <option value="">Automático</option>
      {opciones.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

export function CamposCreacion({
  config,
  onChange,
  progresivo,
  proyectoId,
  onBuscarRelacionado,
}: {
  config: ConfigCreacion;
  onChange: (config: ConfigCreacion) => void;
  progresivo: boolean;
  proyectoId: string;
  onBuscarRelacionado: (proyectoId: string, tema: string) => Promise<ContenidoRelacionado>;
}) {
  function set<K extends keyof ConfigCreacion>(campo: K, valor: ConfigCreacion[K]) {
    onChange({ ...config, [campo]: valor });
  }

  const mostrarPaso2 = !progresivo || !!config.tipoContenido;
  const mostrarPaso3 = !progresivo || (!!config.tipoContenido && !!config.tipoProduccion);
  const mostrarPaso4 =
    !progresivo || (!!config.tipoContenido && !!config.tipoProduccion && config.tema.trim().length > 0);

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-1 text-[12.5px] text-text-muted">Paso 1</p>
        <p className="mb-3 font-display text-[16px]">¿Qué quieres crear?</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {TIPOS_CONTENIDO.map((t) => (
            <TarjetaSeleccion
              key={t.value}
              seleccionado={config.tipoContenido === t.value}
              onClick={() =>
                onChange({ ...CONFIG_VACIA, tipoContenido: t.value, tema: config.tema })
              }
            >
              <span className="mr-1.5">{t.icono}</span>
              <span className="font-medium">{t.value}</span>
              {t.descripcion ? (
                <span className="mt-0.5 block text-[11.5px] text-text-muted">{t.descripcion}</span>
              ) : null}
            </TarjetaSeleccion>
          ))}
        </div>
      </div>

      {mostrarPaso2 ? (
        <div className="border-t border-border pt-5">
          <p className="mb-1 text-[12.5px] text-text-muted">Paso 2</p>
          <p className="mb-3 font-display text-[16px]">¿Cómo quieres comunicarlo?</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {TIPOS_PRODUCCION.map((p) => (
              <TarjetaSeleccion
                key={p.value}
                seleccionado={config.tipoProduccion === p.value}
                onClick={() => set("tipoProduccion", p.value)}
              >
                <span className="mr-1.5">{p.icono}</span>
                {p.value}
              </TarjetaSeleccion>
            ))}
          </div>
        </div>
      ) : null}

      {mostrarPaso3 ? (
        <div className="border-t border-border pt-5">
          <p className="mb-1 text-[12.5px] text-text-muted">Paso 3</p>
          <p className="mb-2 font-display text-[16px]">¿Cuál es la idea?</p>
          <Textarea
            value={config.tema}
            onChange={(e) => set("tema", e.target.value)}
            placeholder={
              "Ej: Cinco errores comunes en construcción.\n" +
              "Ej: Cómo impermeabilizar correctamente un techo.\n" +
              "Ej: Diferencias entre porcelanato y cerámica.\n" +
              "Ej: Cómo elegir un buen maestro.\n" +
              "Ej: Cuánto cuesta construir una casa."
            }
            className="min-h-[100px]"
          />
          <ContenidoRelacionadoPanel
            proyectoId={proyectoId}
            tema={config.tema}
            onBuscar={onBuscarRelacionado}
          />
        </div>
      ) : null}

      {mostrarPaso4 && config.tipoContenido && config.tipoContenido !== "Historia" ? (
        <div className="border-t border-border pt-5">
          <p className="mb-1 text-[12.5px] text-text-muted">Paso 4</p>
          <p className="mb-3 font-display text-[16px]">Opciones inteligentes</p>

          {config.tipoContenido === "Video Corto" ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label>Duración</Label>
                <Select
                  value={config.duracion}
                  onChange={(v) => set("duracion", v)}
                  opciones={DURACIONES_VIDEO_CORTO}
                />
              </div>
              <div>
                <Label>Número de escenas</Label>
                <Select
                  value={config.numeroEscenas}
                  onChange={(v) => set("numeroEscenas", v)}
                  opciones={NUMEROS_ESCENAS}
                />
              </div>
              <div>
                <Label>Plataforma</Label>
                <Select
                  value={config.plataforma}
                  onChange={(v) => set("plataforma", v)}
                  opciones={PLATAFORMAS_CONTENIDO}
                />
              </div>
            </div>
          ) : null}

          {config.tipoContenido === "Carrusel" ? (
            <div>
              <Label>Número de páginas</Label>
              <Select
                value={config.numeroPaginas}
                onChange={(v) => set("numeroPaginas", v)}
                opciones={NUMEROS_PAGINAS_CARRUSEL}
              />
            </div>
          ) : null}

          {config.tipoContenido === "Imagen" ? (
            <div>
              <Label>Estilo</Label>
              <Select
                value={config.estiloImagen}
                onChange={(v) => set("estiloImagen", v)}
                opciones={ESTILOS_IMAGEN}
              />
            </div>
          ) : null}

          {config.tipoContenido === "Video Largo" ? (
            <div>
              <Label>Duración aproximada (opcional, sin límite estricto)</Label>
              <Input
                value={config.duracion}
                onChange={(e) => set("duracion", e.target.value)}
                placeholder="Ej: 8-10 minutos"
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
