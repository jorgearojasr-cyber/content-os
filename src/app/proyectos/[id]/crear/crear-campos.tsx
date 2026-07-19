"use client";

import { Input, Label, Textarea } from "@/components/ui";
import { ContenidoRelacionadoPanel } from "@/components/contenido-relacionado-panel";
import { SelectorMotor } from "@/components/selector-motor";
import type { ContenidoRelacionado } from "@/lib/actions";
import {
  DURACIONES_VIDEO_CORTO,
  DURACIONES_VIDEO_LARGO_YOUTUBE,
  ESTILOS_IMAGEN,
  FORMATOS_IMAGEN_FIJA,
  NUMEROS_ESCENAS,
  NUMEROS_PAGINAS_CARRUSEL,
  PLATAFORMAS_CONTENIDO,
  TIPOS_CONTENIDO,
  TIPOS_PRODUCCION,
  TIPOS_PRODUCCION_IMAGEN,
  TIPOS_PUBLICACION_POR_PLATAFORMA,
  type MotorIA,
  type TipoContenido,
} from "@/lib/types";

export type ConfigCreacion = {
  tipoContenido: TipoContenido | "";
  tipoProduccion: string;
  tema: string;
  plataforma: string;
  tipoPublicacion: string;
  duracion: string;
  numeroEscenas: string;
  numeroPaginas: string;
  estiloImagen: string;
  /** "" = sin Motor IA (o "Automático") — ver SelectorMotor. */
  motorId: string;
};

export const CONFIG_VACIA: ConfigCreacion = {
  tipoContenido: "",
  tipoProduccion: "",
  tema: "",
  plataforma: "",
  tipoPublicacion: "",
  duracion: "",
  numeroEscenas: "",
  numeroPaginas: "",
  estiloImagen: "",
  motorId: "",
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
  motores,
}: {
  config: ConfigCreacion;
  onChange: (config: ConfigCreacion) => void;
  progresivo: boolean;
  proyectoId: string;
  onBuscarRelacionado: (proyectoId: string, tema: string) => Promise<ContenidoRelacionado>;
  /** Motores IA disponibles (del proyecto + globales) — detección por
   * palabras clave sobre la idea del Paso 3, sin IA. */
  motores: MotorIA[];
}) {
  function set<K extends keyof ConfigCreacion>(campo: K, valor: ConfigCreacion[K]) {
    onChange({ ...config, [campo]: valor });
  }

  const mostrarPaso2 = !progresivo || !!config.tipoContenido;
  const mostrarPaso3 = !progresivo || (!!config.tipoContenido && !!config.tipoProduccion);
  const mostrarPaso4 =
    !progresivo || (!!config.tipoContenido && !!config.tipoProduccion && config.tema.trim().length > 0);

  // YouTube + "Video" es horizontal y de hasta 3 min — el rango de
  // Duración corto (15-60s, pensado para Reel/Short/Story) no alcanza
  // para este formato, así que usa un rango propio (60-180s) en su lugar.
  const esYoutubeVideo = config.plataforma === "YouTube" && config.tipoPublicacion === "Video";
  const opcionesDuracion = esYoutubeVideo ? DURACIONES_VIDEO_LARGO_YOUTUBE : DURACIONES_VIDEO_CORTO;

  // Imagen/Carrusel son piezas ESTÁTICAS — el Paso 2 usa su propio set de
  // opciones (nunca "escenas" ni B-Roll). El reset al cambiar de Formato ya
  // lo hace el onClick del Paso 1 (vuelve a CONFIG_VACIA), así que nunca
  // queda una opción de video seleccionada al llegar acá.
  const esFormatoImagenFija = (FORMATOS_IMAGEN_FIJA as readonly string[]).includes(config.tipoContenido);
  const opcionesTipoProduccion = esFormatoImagenFija ? TIPOS_PRODUCCION_IMAGEN : TIPOS_PRODUCCION;

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
            {opcionesTipoProduccion.map((p) => (
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
          <SelectorMotor
            idea={config.tema}
            motores={motores}
            motorId={config.motorId}
            onChange={(v) => set("motorId", v)}
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
                  opciones={opcionesDuracion}
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
                  onChange={(v) => onChange({ ...config, plataforma: v, tipoPublicacion: "", duracion: "" })}
                  opciones={PLATAFORMAS_CONTENIDO}
                />
              </div>
            </div>
          ) : null}

          {config.tipoContenido === "Video Corto" && config.plataforma ? (
            <div className="mt-3">
              <Label>Tipo de publicación</Label>
              <Select
                value={config.tipoPublicacion}
                onChange={(v) => onChange({ ...config, tipoPublicacion: v, duracion: "" })}
                opciones={(TIPOS_PUBLICACION_POR_PLATAFORMA[config.plataforma] ?? []).map((t) => t.value)}
              />
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
