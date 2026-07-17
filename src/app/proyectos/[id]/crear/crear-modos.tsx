"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, SectionTitle, Textarea } from "@/components/ui";
import { IdentidadChecklist } from "@/components/identidad-checklist";
import { explicarError } from "@/lib/errores";
import { formatearFechaChile } from "@/lib/fecha";
import { identidadPorSeccion, identidadTieneContacto } from "@/lib/identity-compiler";
import { urlImagenVisible } from "@/lib/imagen-url";
import { extraerFragmento } from "@/lib/reutilizacion";
import { CamposCreacion, CONFIG_VACIA, type ConfigCreacion } from "./crear-campos";
import { ResultadoTabs } from "./resultado-tabs";
import type { ConfiguracionInferida, ContenidoGenerado, ContenidoInput } from "@/lib/ai";
import type { ContenidoRelacionado } from "@/lib/actions";
import type { PosicionLogo } from "@/lib/identity-compiler";
import { iconoFormato, parseFotosPersonaje } from "@/lib/types";
import type { Avatar, Bloque, Identidad, Personaje } from "@/lib/types";

const OPCIONES_POSICION_LOGO: { value: PosicionLogo; etiqueta: string }[] = [
  { value: "superior-izquierda", etiqueta: "Esquina superior izquierda" },
  { value: "superior-derecha", etiqueta: "Esquina superior derecha" },
  { value: "inferior-izquierda", etiqueta: "Esquina inferior izquierda" },
  { value: "inferior-derecha", etiqueta: "Esquina inferior derecha" },
];

type Modo = "rapido" | "guiado" | "profesional";

const MODOS: { id: Modo; icono: string; etiqueta: string; descripcion: string }[] = [
  { id: "rapido", icono: "🚀", etiqueta: "Crear rápido", descripcion: "La IA decide por ti" },
  { id: "guiado", icono: "🎨", etiqueta: "Crear guiado", descripcion: "Tú decides el formato y estilo" },
  { id: "profesional", icono: "⚙️", etiqueta: "Modo profesional", descripcion: "Control total de cada detalle" },
];

/** Límite visual de referencia para el contador de caracteres de la idea —
 * no bloquea el envío, no existe un límite real en el backend. */
const LIMITE_IDEA_VISUAL = 600;

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

/** La única opción es de proyecto -> se auto-selecciona sin selector (cero
 * fricción). Cualquier otro caso con al menos 2 opciones (de proyecto y/o
 * de estudio), o con la única opción siendo del estudio, sí muestra
 * selector — un Personaje del estudio nunca se elige solo. */
function haySelectorDePersonaje(personajes: Personaje[], personajesEstudio: Personaje[]): boolean {
  const total = personajes.length + personajesEstudio.length;
  return total > 1 || (total === 1 && personajes.length === 0);
}

/** Fila de miniaturas de los Personajes DEL PROYECTO (no del estudio) en
 * "Identidad activa" — clic marca cuál queda "destacado para esta sesión".
 * Sin límite artificial: si hay más de 2, la fila hace scroll horizontal
 * con scroll-snap (2 miniaturas completas caben en el ancho normal). */
function PersonajeThumbnails({
  personajes,
  destacadoId,
  onSelect,
}: {
  personajes: Personaje[];
  destacadoId: string;
  onSelect: (id: string) => void;
}) {
  if (personajes.length === 0) return null;

  return (
    <div
      className="flex gap-3 overflow-x-auto pb-1"
      style={{ scrollSnapType: "x mandatory" }}
    >
      {personajes.map((p) => {
        const foto = parseFotosPersonaje(p.fotosUrlsJson)[0] ?? null;
        const activo = p.id === destacadoId;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.id)}
            style={{ scrollSnapAlign: "start" }}
            className={`flex w-[calc(50%-0.375rem)] shrink-0 flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 text-center transition-colors ${
              activo ? "border-accent bg-accent-soft" : "border-border bg-surface-2 hover:border-accent/50"
            }`}
          >
            {foto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={urlImagenVisible(foto)}
                alt={p.nombre || "Personaje"}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface font-display text-[16px] text-text-muted">
                {(p.nombre || "?").trim().charAt(0).toUpperCase()}
              </span>
            )}
            <span
              className={`w-full truncate text-[12px] ${activo ? "font-semibold text-accent" : "text-text"}`}
            >
              {p.nombre || "Sin nombre"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * "Qué incluir en esta pieza" — mismas casillas antes del botón de generar
 * en los 3 modos (un solo componente, no una copia por modo). Controlan
 * qué secciones del Compilador se pasan a esta generación en particular
 * (ver `OpcionesCompilado` en identity-compiler.ts); no cambian nada
 * guardado en Identidad. Cuando hay más de un Personaje disponible (de
 * este proyecto y/o del estudio) o más de un Avatar, aparece un selector
 * de cuál usar — con uno solo DE PROYECTO, no hay selector, cero fricción
 * agregada; un Personaje del estudio, en cambio, siempre requiere elección
 * explícita del usuario, incluso si es la única opción disponible.
 */
function QueIncluir({
  mostrarPersonaje,
  incluirPersonaje,
  setIncluirPersonaje,
  personajes,
  personajesEstudio,
  personajeId,
  setPersonajeId,
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
  personajeId: string;
  setPersonajeId: (v: string) => void;
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
              <select
                value={personajeId}
                onChange={(e) => setPersonajeId(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[12.5px] text-text"
              >
                <option value="">✨ Automático (que la IA elija según el contexto)</option>
                {personajes.length > 0 ? (
                  <optgroup label="De este proyecto">
                    {personajes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre || "Personaje sin nombre"}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
                {personajesEstudio.length > 0 ? (
                  <optgroup label="Del estudio">
                    {personajesEstudio.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre || "Personaje sin nombre"}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
              </select>
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

export function CrearModos({
  proyectoId,
  identidad,
  personajes,
  personajesEstudio,
  avatares,
  activosCount,
  bloquesRecientes,
  onInferir,
  onGenerar,
  onGuardar,
  onBuscarRelacionado,
}: {
  proyectoId: string;
  identidad: Identidad;
  personajes: Personaje[];
  personajesEstudio: Personaje[];
  avatares: Avatar[];
  activosCount: number;
  bloquesRecientes: Bloque[];
  onInferir: (idea: string) => Promise<ConfiguracionInferida>;
  onGenerar: (
    input: Omit<ContenidoInput, "identidadCompilada"> & {
      incluirPersonaje?: boolean;
      incluirMarca?: boolean;
      incluirContacto?: boolean;
      personajeId?: string;
      avatarId?: string;
      posicionLogo?: PosicionLogo;
    },
  ) => Promise<ContenidoGenerado & { personajeIdUsado: string | null }>;
  onGuardar: (formData: FormData) => Promise<void>;
  onBuscarRelacionado: (proyectoId: string, tema: string) => Promise<ContenidoRelacionado>;
}) {
  const seccionesInfo = identidadPorSeccion(identidad, {
    tienePersonaje: personajes.length > 0,
    tieneAvatar: avatares.length > 0,
  });
  const tieneContacto = identidadTieneContacto(identidad);
  // A diferencia del checklist de Identidad (que solo cuenta Personajes
  // PROPIOS del proyecto), acá la casilla "Usar Personaje" debe aparecer
  // apenas haya CUALQUIER Personaje disponible — de este proyecto o del
  // estudio — porque ambos funcionan igual al generar.
  const hayPersonajeDisponible = personajes.length > 0 || personajesEstudio.length > 0;

  const [modo, setModo] = useState<Modo>("rapido");
  const [config, setConfig] = useState<ConfigCreacion>(CONFIG_VACIA);
  const [idea, setIdea] = useState("");
  const [inferencia, setInferencia] = useState<ConfiguracionInferida | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState<ContenidoGenerado | null>(null);
  const [incluirPersonaje, setIncluirPersonaje] = useState(seccionesInfo.personaje);
  // No existe un campo "predeterminado" real en el modelo de Personajes —
  // el criterio de "predeterminado" en toda la app es el más reciente
  // (personajes[0], ya vienen ordenados así). Arranca como el destacado de
  // la sesión Y como el valor inicial del selector de Paso 4; un clic en
  // una miniatura de "Identidad activa" cambia ambos, pero solo en memoria
  // — se pierde al recargar la página, aposta.
  const [personajeDestacadoId, setPersonajeDestacadoId] = useState(personajes[0]?.id ?? "");
  const [personajeId, setPersonajeId] = useState(personajes[0]?.id ?? "");
  // El Personaje realmente usado en la última generación (el elegido a
  // mano, o el que decidió el sistema en "Automático") — es lo que se
  // guarda con el bloque, no el valor crudo del selector.
  const [personajeIdUsado, setPersonajeIdUsado] = useState<string | null>(null);

  function seleccionarDestacado(id: string) {
    setPersonajeDestacadoId(id);
    setPersonajeId(id);
  }

  const personajeDestacado = personajes.find((p) => p.id === personajeDestacadoId) ?? personajes[0] ?? null;
  const [incluirMarca, setIncluirMarca] = useState(seccionesInfo.marca);
  const [avatarId, setAvatarId] = useState(avatares[0]?.id ?? "");
  const [incluirContacto, setIncluirContacto] = useState(false);
  const [incluirLogo, setIncluirLogo] = useState(false);
  const [posicionLogo, setPosicionLogo] = useState<PosicionLogo>("inferior-derecha");

  function empezarDeNuevo() {
    setResultado(null);
    setPersonajeIdUsado(null);
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
        personajeId: incluirPersonaje ? personajeId || undefined : undefined,
        avatarId: incluirMarca ? avatarId || undefined : undefined,
        posicionLogo: incluirLogo ? posicionLogo : undefined,
      });
      const { personajeIdUsado: idUsado, ...contenido } = resultadoGenerado;
      setPersonajeIdUsado(idUsado);
      setResultado(contenido);
    } catch (e) {
      setError(explicarError(e));
    } finally {
      setCargando(false);
    }
  }

  // Se repite en las 3 ramas de abajo (resultado / cargando / formulario) —
  // Identidad activa y Contenido reciente siempre se muestran, sin importar
  // en qué paso del flujo esté el usuario. Una sola definición para no
  // triplicar el JSX.
  const identidadActivaYReciente = (
    <>
      <Card>
        <SectionTitle subtitle="Lo que el Compilador de Identidad tiene guardado para este proyecto ahora mismo — esto es lo que la IA usa automáticamente, sin que tengas que volver a seleccionarlo.">
          Identidad activa
        </SectionTitle>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {personajes.length > 0 ? (
            <div className="sm:w-[45%]">
              <PersonajeThumbnails
                personajes={personajes}
                destacadoId={personajeDestacadoId}
                onSelect={seleccionarDestacado}
              />
              {personajeDestacado ? (
                <div className="mt-2.5">
                  <p className="font-display text-[15px]">
                    {personajeDestacado.nombre || "Personaje sin nombre"}
                  </p>
                  {personajeDestacado.personalidad ? (
                    <p className="mt-0.5 text-[12.5px] text-text-muted">
                      {extraerFragmento(personajeDestacado.personalidad, 90)}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="flex-1">
            <IdentidadChecklist
              identidad={identidad}
              activosCount={activosCount}
              tienePersonaje={personajes.length > 0}
              tieneAvatar={avatares.length > 0}
              personaje={personajeDestacado}
              avatar={avatares[0] ?? null}
            />
          </div>
        </div>
      </Card>

      {bloquesRecientes.length > 0 ? (
        <Card>
          <SectionTitle>Contenido reciente de este proyecto</SectionTitle>
          <div className="space-y-1.5">
            {bloquesRecientes.map((bloque) => (
              <Link
                key={bloque.id}
                href={`/proyectos/${proyectoId}/biblioteca/${bloque.id}/editar`}
                className="flex items-center gap-2.5 rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 transition-colors hover:border-accent/50"
              >
                <span className="text-[18px] leading-none">{iconoFormato(bloque.formato)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] text-text">{bloque.titulo}</p>
                  <p className="mt-0.5 text-[11.5px] text-text-muted">
                    {formatearFechaChile(bloque.createdAt)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      ) : null}
    </>
  );

  if (resultado) {
    return (
      <>
        <ResultadoTabs
          proyectoId={proyectoId}
          resultado={resultado}
          formato={config.tipoContenido}
          personajeId={personajeIdUsado ?? ""}
          tema={config.tema}
          onGuardar={onGuardar}
          onEmpezarDeNuevo={empezarDeNuevo}
        />
        {identidadActivaYReciente}
      </>
    );
  }

  if (cargando) {
    return (
      <>
        <Card className="text-center">
          <p className="font-display text-[16px]">✨ Creando tu contenido…</p>
          <p className="mt-2 text-[13px] text-text-muted">
            Esto puede tardar 20-40 segundos — Claude está trabajando, no se colgó la app.
          </p>
          <Cronometro />
        </Card>
        {identidadActivaYReciente}
      </>
    );
  }

  return (
    <>
    <Card>
      <div className="mb-5 grid grid-cols-1 gap-2 border-b border-border pb-5 sm:grid-cols-3">
        {MODOS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setModo(m.id)}
            className={`rounded-xl border px-3.5 py-3 text-left transition-colors ${
              modo === m.id
                ? "border-accent bg-accent-soft"
                : "border-border bg-surface-2 hover:border-accent/50"
            }`}
          >
            <span className={`text-[13.5px] font-semibold ${modo === m.id ? "text-accent" : "text-text"}`}>
              {m.icono} {m.etiqueta}
            </span>
            <p className="mt-0.5 text-[12px] text-text-muted">{m.descripcion}</p>
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
                mostrarPersonaje={hayPersonajeDisponible}
                incluirPersonaje={incluirPersonaje}
                setIncluirPersonaje={setIncluirPersonaje}
                personajes={personajes}
                personajesEstudio={personajesEstudio}
                personajeId={personajeId}
                setPersonajeId={setPersonajeId}
                incluirMarca={incluirMarca}
                setIncluirMarca={setIncluirMarca}
                avatares={avatares}
                avatarId={avatarId}
                setAvatarId={setAvatarId}
                mostrarContacto={tieneContacto}
                incluirContacto={incluirContacto}
                setIncluirContacto={setIncluirContacto}
                logoUrl={identidad.logoUrl}
                incluirLogo={incluirLogo}
                setIncluirLogo={setIncluirLogo}
                posicionLogo={posicionLogo}
                setPosicionLogo={setPosicionLogo}
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
            <div className="relative">
              <Textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="Ej: Un reel mostrando 5 errores comunes al construir un radier"
                className="min-h-[110px] pb-6"
              />
              <span className="pointer-events-none absolute bottom-2.5 right-3.5 text-[11px] text-text-muted">
                {idea.length} / {LIMITE_IDEA_VISUAL}
              </span>
            </div>
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
                mostrarPersonaje={hayPersonajeDisponible}
                incluirPersonaje={incluirPersonaje}
                setIncluirPersonaje={setIncluirPersonaje}
                personajes={personajes}
                personajesEstudio={personajesEstudio}
                personajeId={personajeId}
                setPersonajeId={setPersonajeId}
                incluirMarca={incluirMarca}
                setIncluirMarca={setIncluirMarca}
                avatares={avatares}
                avatarId={avatarId}
                setAvatarId={setAvatarId}
                mostrarContacto={tieneContacto}
                incluirContacto={incluirContacto}
                setIncluirContacto={setIncluirContacto}
                logoUrl={identidad.logoUrl}
                incluirLogo={incluirLogo}
                setIncluirLogo={setIncluirLogo}
                posicionLogo={posicionLogo}
                setPosicionLogo={setPosicionLogo}
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
              mostrarPersonaje={hayPersonajeDisponible}
              incluirPersonaje={incluirPersonaje}
              setIncluirPersonaje={setIncluirPersonaje}
              personajes={personajes}
              personajesEstudio={personajesEstudio}
              personajeId={personajeId}
              setPersonajeId={setPersonajeId}
              incluirMarca={incluirMarca}
              setIncluirMarca={setIncluirMarca}
              avatares={avatares}
              avatarId={avatarId}
              setAvatarId={setAvatarId}
              mostrarContacto={tieneContacto}
              incluirContacto={incluirContacto}
              setIncluirContacto={setIncluirContacto}
              logoUrl={identidad.logoUrl}
              incluirLogo={incluirLogo}
              setIncluirLogo={setIncluirLogo}
              posicionLogo={posicionLogo}
              setPosicionLogo={setPosicionLogo}
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
    {identidadActivaYReciente}
    </>
  );
}
