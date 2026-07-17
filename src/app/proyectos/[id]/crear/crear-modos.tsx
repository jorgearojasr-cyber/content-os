"use client";

import { useEffect, useState } from "react";
import { Button, Card, Textarea } from "@/components/ui";
import { explicarError } from "@/lib/errores";
import { identidadPorSeccion, identidadTieneContacto } from "@/lib/identity-compiler";
import { CamposCreacion, CONFIG_VACIA, type ConfigCreacion } from "./crear-campos";
import { ResultadoTabs } from "./resultado-tabs";
import type { ConfiguracionInferida, ContenidoGenerado, ContenidoInput } from "@/lib/ai";
import type { ContenidoRelacionado } from "@/lib/actions";
import type { Identidad } from "@/lib/types";

type Modo = "rapido" | "guiado" | "profesional";

const MODOS: { id: Modo; icono: string; etiqueta: string }[] = [
  { id: "rapido", icono: "🚀", etiqueta: "Crear rápido" },
  { id: "guiado", icono: "🎨", etiqueta: "Crear guiado" },
  { id: "profesional", icono: "⚙️", etiqueta: "Modo profesional" },
];

/** Se monta desde cero cada vez que empieza a cargar, así el contador
 * arranca en 0 sin necesitar resetear estado dentro de un efecto. */
function Cronometro() {
  const [segundos, setSegundos] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return <p className="mt-3 font-mono text-[12px] text-text-muted">{segundos}s</p>;
}

function segundosDesdeDuracion(duracion: string): number | undefined {
  const match = duracion.match(/^(\d+)s$/);
  return match ? Number(match[1]) : undefined;
}

/**
 * "Qué incluir en esta pieza" — mismas 3 casillas antes del botón de
 * generar en los 3 modos (un solo componente, no una copia por modo).
 * Controlan qué secciones del Compilador se pasan a esta generación en
 * particular (ver `OpcionesCompilado` en identity-compiler.ts); no cambian
 * nada guardado en Identidad.
 */
function QueIncluir({
  mostrarPersonaje,
  incluirPersonaje,
  setIncluirPersonaje,
  incluirMarca,
  setIncluirMarca,
  mostrarContacto,
  incluirContacto,
  setIncluirContacto,
}: {
  mostrarPersonaje: boolean;
  incluirPersonaje: boolean;
  setIncluirPersonaje: (v: boolean) => void;
  incluirMarca: boolean;
  setIncluirMarca: (v: boolean) => void;
  mostrarContacto: boolean;
  incluirContacto: boolean;
  setIncluirContacto: (v: boolean) => void;
}) {
  return (
    <div className="mb-4 rounded-xl border border-border bg-surface-2 p-3.5">
      <p className="mb-2 text-[12.5px] font-medium text-text-muted">Qué incluir en esta pieza</p>
      <div className="flex flex-col gap-1.5">
        {mostrarPersonaje ? (
          <label className="flex items-center gap-2 text-[13px] text-text">
            <input
              type="checkbox"
              checked={incluirPersonaje}
              onChange={(e) => setIncluirPersonaje(e.target.checked)}
            />
            Usar Personaje
          </label>
        ) : null}
        <label className="flex items-center gap-2 text-[13px] text-text">
          <input
            type="checkbox"
            checked={incluirMarca}
            onChange={(e) => setIncluirMarca(e.target.checked)}
          />
          Usar voz y tono de la marca
        </label>
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
      </div>
    </div>
  );
}

export function CrearModos({
  proyectoId,
  identidad,
  onInferir,
  onGenerar,
  onGuardar,
  onBuscarRelacionado,
}: {
  proyectoId: string;
  identidad: Identidad;
  onInferir: (idea: string) => Promise<ConfiguracionInferida>;
  onGenerar: (
    input: Omit<ContenidoInput, "identidadCompilada"> & {
      incluirPersonaje?: boolean;
      incluirMarca?: boolean;
      incluirContacto?: boolean;
    },
  ) => Promise<ContenidoGenerado>;
  onGuardar: (formData: FormData) => Promise<void>;
  onBuscarRelacionado: (proyectoId: string, tema: string) => Promise<ContenidoRelacionado>;
}) {
  const seccionesInfo = identidadPorSeccion(identidad);
  const tieneContacto = identidadTieneContacto(identidad);

  const [modo, setModo] = useState<Modo>("rapido");
  const [config, setConfig] = useState<ConfigCreacion>(CONFIG_VACIA);
  const [idea, setIdea] = useState("");
  const [inferencia, setInferencia] = useState<ConfiguracionInferida | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState<ContenidoGenerado | null>(null);
  const [incluirPersonaje, setIncluirPersonaje] = useState(seccionesInfo.personaje);
  const [incluirMarca, setIncluirMarca] = useState(seccionesInfo.marca);
  const [incluirContacto, setIncluirContacto] = useState(false);

  function empezarDeNuevo() {
    setResultado(null);
    setInferencia(null);
    setIdea("");
    setConfig(CONFIG_VACIA);
    setError("");
  }

  async function analizarIdea() {
    if (!idea.trim()) return;
    setCargando(true);
    setError("");
    try {
      const inferida = await onInferir(idea);
      setInferencia(inferida);
      setConfig({
        tipoContenido: inferida.formato,
        tipoProduccion: inferida.tipoProduccion,
        tema: idea,
        plataforma: inferida.plataforma ?? "",
        duracion: inferida.duracionSegundos ? `${inferida.duracionSegundos}s` : "",
        numeroEscenas: inferida.numeroEscenas ? String(inferida.numeroEscenas) : "",
        numeroPaginas: inferida.numeroPaginas ? String(inferida.numeroPaginas) : "",
        estiloImagen: inferida.estiloImagen ?? "",
      });
    } catch (e) {
      setError(explicarError(e));
    } finally {
      setCargando(false);
    }
  }

  async function generar() {
    if (!config.tipoContenido || !config.tema.trim()) return;
    setCargando(true);
    setError("");
    try {
      const temaFinal =
        config.tipoContenido === "Video Largo" && config.duracion.trim()
          ? `${config.tema} (duración aproximada: ${config.duracion.trim()})`
          : config.tema;

      const resultadoGenerado = await onGenerar({
        tipoContenido: config.tipoContenido,
        tipoProduccion: config.tipoProduccion || "IA decide automáticamente",
        tema: temaFinal,
        plataforma: config.plataforma || undefined,
        duracionSegundos: segundosDesdeDuracion(config.duracion),
        numeroEscenas:
          config.numeroEscenas && config.numeroEscenas !== "Automático"
            ? Number(config.numeroEscenas)
            : undefined,
        numeroPaginas:
          config.numeroPaginas && config.numeroPaginas !== "Automático"
            ? Number(config.numeroPaginas)
            : undefined,
        estiloImagen: config.estiloImagen || undefined,
        incluirPersonaje,
        incluirMarca,
        incluirContacto,
      });
      setResultado(resultadoGenerado);
    } catch (e) {
      setError(explicarError(e));
    } finally {
      setCargando(false);
    }
  }

  if (resultado) {
    return (
      <ResultadoTabs
        proyectoId={proyectoId}
        resultado={resultado}
        formato={config.tipoContenido}
        onGuardar={onGuardar}
        onEmpezarDeNuevo={empezarDeNuevo}
      />
    );
  }

  if (cargando) {
    return (
      <Card className="text-center">
        <p className="font-display text-[16px]">✨ Creando tu contenido…</p>
        <p className="mt-2 text-[13px] text-text-muted">
          Esto puede tardar 20-40 segundos — Claude está trabajando, no se colgó la app.
        </p>
        <Cronometro />
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-5 flex flex-wrap gap-2 border-b border-border pb-4">
        {MODOS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setModo(m.id)}
            className={`rounded-xl px-3.5 py-2.5 text-[13.5px] transition-colors ${
              modo === m.id
                ? "bg-accent-soft font-semibold text-accent"
                : "text-text-muted hover:bg-surface-2 hover:text-text"
            }`}
          >
            {m.icono} {m.etiqueta}
          </button>
        ))}
      </div>

      {modo === "rapido" ? (
        inferencia ? (
          <div>
            <p className="mb-4 rounded-xl border border-accent/30 bg-accent-soft p-3.5 text-[13.5px] text-text">
              Vamos a crear un <strong>{config.tipoContenido}</strong>
              {config.duracion ? ` de ${config.duracion}` : ""}
              {config.numeroEscenas ? ` en ${config.numeroEscenas} escenas` : ""}
              {config.numeroPaginas ? ` en ${config.numeroPaginas} páginas` : ""} — {inferencia.razonamiento}
              {" "}¿Confirmas o ajustas?
            </p>
            <CamposCreacion
              config={config}
              onChange={setConfig}
              progresivo={false}
              proyectoId={proyectoId}
              onBuscarRelacionado={onBuscarRelacionado}
            />
            {error ? <p className="mt-3 text-[12.5px] text-danger">{error}</p> : null}
            <div className="mt-4">
              <QueIncluir
                mostrarPersonaje={seccionesInfo.personaje}
                incluirPersonaje={incluirPersonaje}
                setIncluirPersonaje={setIncluirPersonaje}
                incluirMarca={incluirMarca}
                setIncluirMarca={setIncluirMarca}
                mostrarContacto={tieneContacto}
                incluirContacto={incluirContacto}
                setIncluirContacto={setIncluirContacto}
              />
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={() => setInferencia(null)}>
                  Volver a escribir la idea
                </Button>
                <Button type="button" onClick={generar}>
                  🚀 Crear contenido
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <p className="mb-2 font-display text-[16px]">¿Qué quieres crear?</p>
            <p className="mb-2 text-[13px] text-text-muted">
              Describe la idea y la IA infiere el formato, la producción, la plataforma y la
              estructura — vas a poder confirmar o ajustar antes de generar el contenido final.
            </p>
            <Textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="Ej: Un reel mostrando 5 errores comunes al construir un radier"
              className="min-h-[110px]"
            />
            {error ? <p className="mt-2 text-[12.5px] text-danger">{error}</p> : null}
            <Button type="button" className="mt-3" disabled={!idea.trim()} onClick={analizarIdea}>
              Analizar idea
            </Button>
          </div>
        )
      ) : null}

      {modo === "guiado" ? (
        <div>
          <CamposCreacion
            config={config}
            onChange={setConfig}
            progresivo
            proyectoId={proyectoId}
            onBuscarRelacionado={onBuscarRelacionado}
          />
          {config.tipoContenido && config.tema.trim() ? (
            <div className="mt-5 border-t border-border pt-4">
              <p className="mb-1 text-[12.5px] text-text-muted">Paso 5</p>
              {error ? <p className="mb-2 text-[12.5px] text-danger">{error}</p> : null}
              <QueIncluir
                mostrarPersonaje={seccionesInfo.personaje}
                incluirPersonaje={incluirPersonaje}
                setIncluirPersonaje={setIncluirPersonaje}
                incluirMarca={incluirMarca}
                setIncluirMarca={setIncluirMarca}
                mostrarContacto={tieneContacto}
                incluirContacto={incluirContacto}
                setIncluirContacto={setIncluirContacto}
              />
              <Button type="button" onClick={generar}>
                🚀 Crear contenido
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {modo === "profesional" ? (
        <div>
          <CamposCreacion
            config={config}
            onChange={setConfig}
            progresivo={false}
            proyectoId={proyectoId}
            onBuscarRelacionado={onBuscarRelacionado}
          />
          <div className="mt-5 border-t border-border pt-4">
            {error ? <p className="mb-2 text-[12.5px] text-danger">{error}</p> : null}
            <QueIncluir
              mostrarPersonaje={seccionesInfo.personaje}
              incluirPersonaje={incluirPersonaje}
              setIncluirPersonaje={setIncluirPersonaje}
              incluirMarca={incluirMarca}
              setIncluirMarca={setIncluirMarca}
              mostrarContacto={tieneContacto}
              incluirContacto={incluirContacto}
              setIncluirContacto={setIncluirContacto}
            />
            <Button
              type="button"
              disabled={!config.tipoContenido || !config.tema.trim()}
              onClick={generar}
            >
              🚀 Crear contenido
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
