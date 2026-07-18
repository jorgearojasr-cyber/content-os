"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Card, Label, SectionTitle, Textarea } from "@/components/ui";
import { IdentidadChecklist } from "@/components/identidad-checklist";
import { formatearFechaChile } from "@/lib/fecha";
import { compileIdentity, identidadPorSeccion, identidadTieneContacto } from "@/lib/identity-compiler";
import { urlImagenVisible } from "@/lib/imagen-url";
import { extraerFragmento } from "@/lib/reutilizacion";
import { construirPlantillaExportacion, parsearRespuestaIA } from "@/lib/exportar-contexto";
import { CamposCreacion, CONFIG_VACIA, type ConfigCreacion } from "./crear-campos";
import { ResultadoTabs } from "./resultado-tabs";
import type { ContenidoGenerado, EscenaRevisada } from "@/lib/ai";
import type { ContenidoRelacionado } from "@/lib/actions";
import type { ActivoVisual, PosicionLogo } from "@/lib/identity-compiler";
import { fotoPrincipal, iconoFormato, parseFotosPersonaje, TIPOS_PUBLICACION_POR_PLATAFORMA } from "@/lib/types";
import type { Avatar, Bloque, Identidad, Personaje } from "@/lib/types";

const OPCIONES_POSICION_LOGO: { value: PosicionLogo; etiqueta: string }[] = [
  { value: "superior-izquierda", etiqueta: "Esquina superior izquierda" },
  { value: "superior-derecha", etiqueta: "Esquina superior derecha" },
  { value: "inferior-izquierda", etiqueta: "Esquina inferior izquierda" },
  { value: "inferior-derecha", etiqueta: "Esquina inferior derecha" },
];

type Modo = "rapido" | "guiado" | "profesional";

const MODOS: { id: Modo; icono: string; etiqueta: string; descripcion: string }[] = [
  { id: "rapido", icono: "🚀", etiqueta: "Crear rápido", descripcion: "Solo la idea, el resto queda automático" },
  { id: "guiado", icono: "🎨", etiqueta: "Crear guiado", descripcion: "Tú decides el formato y estilo" },
  { id: "profesional", icono: "⚙️", etiqueta: "Modo profesional", descripcion: "Control total de cada detalle" },
];

/** La única opción es de proyecto -> se auto-selecciona sin selector (cero
 * fricción). Cualquier otro caso con al menos 2 opciones (de proyecto y/o
 * de estudio), o con la única opción siendo del estudio, sí muestra
 * selector — un Personaje del estudio nunca se elige solo. */
function haySelectorDePersonaje(personajes: Personaje[], personajesEstudio: Personaje[]): boolean {
  const total = personajes.length + personajesEstudio.length;
  return total > 1 || (total === 1 && personajes.length === 0);
}

/** Tile de una miniatura (Personaje real o "Ninguno") — mismo tamaño y
 * forma visual para ambos, aunque el ancho se calcula distinto según en
 * qué contenedor vive cada uno (ver `widthClass`). */
function TilePersonaje({
  activo,
  onClick,
  avatar,
  etiqueta,
  widthClass,
  scrollSnap,
}: {
  activo: boolean;
  onClick: () => void;
  avatar: React.ReactNode;
  etiqueta: string;
  widthClass: string;
  /** Solo los tiles dentro del contenedor con scroll necesitan alinearse al
   * soltar — el tile fijo "Ninguno" no scrollea, no lo necesita. */
  scrollSnap?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={scrollSnap ? { scrollSnapAlign: "start" } : undefined}
      className={`flex ${widthClass} shrink-0 flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 text-center transition-colors ${
        activo ? "border-accent bg-accent-soft" : "border-border bg-surface-2 hover:border-accent/50"
      }`}
    >
      {avatar}
      <span className={`w-full truncate text-[12px] ${activo ? "font-semibold text-accent" : "text-text"}`}>
        {etiqueta}
      </span>
    </button>
  );
}

/** Fila de miniaturas de los Personajes DEL PROYECTO (no del estudio) en la
 * tarjeta "Personajes" — clic en un Personaje ALTERNA su selección (se puede
 * resaltar más de uno a la vez); clic en "Ninguno" deselecciona cualquier
 * Personaje resaltado (mutuamente excluyente con tener 1+ seleccionados,
 * incluido implícitamente: en cuanto la selección queda vacía, "Ninguno"
 * vuelve a quedar resaltado solo). "Ninguno" es un tile fijo a la izquierda,
 * fuera del área de scroll, separado por un divisor sutil; a la derecha, los
 * Personajes reales hacen scroll horizontal con scroll-snap si no caben (2
 * caben completos junto con "Ninguno" en el ancho normal de la tarjeta — 3 en
 * total — sin necesidad de deslizar). */
function PersonajeThumbnails({
  personajes,
  seleccionadosIds,
  onToggle,
  onNinguno,
}: {
  personajes: Personaje[];
  seleccionadosIds: string[];
  onToggle: (id: string) => void;
  onNinguno: () => void;
}) {
  if (personajes.length === 0) return null;

  return (
    <div className="flex gap-3">
      <TilePersonaje
        activo={seleccionadosIds.length === 0}
        onClick={onNinguno}
        etiqueta="Ninguno"
        widthClass="w-[calc(33.333%-0.5rem)]"
        avatar={
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-[20px]">
            🚫
          </span>
        }
      />

      <div
        aria-hidden
        className="shrink-0 self-stretch"
        style={{ width: "0.5px", backgroundColor: "var(--border)" }}
      />

      <div
        className="flex min-w-0 flex-1 gap-3 overflow-x-auto pb-1"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {personajes.map((p) => {
          const foto = fotoPrincipal(parseFotosPersonaje(p.fotosUrlsJson));
          return (
            <TilePersonaje
              key={p.id}
              activo={seleccionadosIds.includes(p.id)}
              onClick={() => onToggle(p.id)}
              etiqueta={p.nombre || "Sin nombre"}
              widthClass="w-[calc(50%-0.375rem)]"
              scrollSnap
              avatar={
                foto ? (
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
                )
              }
            />
          );
        })}
      </div>
    </div>
  );
}

/**
 * "Qué incluir en esta pieza" — mismas casillas antes de exportar el
 * contexto en los 3 modos (un solo componente, no una copia por modo).
 * Controlan qué secciones del Compilador se incluyen en el contexto
 * exportado (ver `OpcionesCompilado` en identity-compiler.ts); no cambian
 * nada guardado en Identidad. Cuando hay más de un Personaje disponible
 * (de este proyecto y/o del estudio) o más de un Avatar, aparece un
 * selector de cuál usar — con uno solo DE PROYECTO, no hay selector, cero
 * fricción agregada; un Personaje del estudio, en cambio, siempre requiere
 * elección explícita del usuario, incluso si es la única opción disponible.
 */
function QueIncluir({
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
   * tarjeta "Personajes" (ver `personajeSeleccion.ids` en `CrearModos`),
   * nunca un estado separado. */
  personajeIds: string[];
  onTogglePersonaje: (id: string) => void;
  /** "✨ Automático": vacía la selección sin desmarcar "Usar Personaje" —
   * a diferencia de "Ninguno" en el carrusel, que sí la desmarca. */
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

/**
 * "Exportar contexto" / "Pegar resultado" — reemplaza el botón que antes
 * llamaba a la API para generar la pieza completa. `contextoExportable` ya
 * viene armado (Identidad + idea + configuración + plantilla de formato,
 * ver `construirPlantillaExportacion`); acá solo se copia y se recibe la
 * respuesta pegada de vuelta. `onEstructurar` la parsea con texto plano
 * (sin IA, ver `parsearRespuestaIA`) y entrega el resultado a la pantalla
 * de revisión de siempre (`ResultadoTabs`), que no sabe ni le importa si
 * el contenido vino de una IA interna o de un pegado manual.
 */
function ExportarYPegar({
  contextoExportable,
  respuestaPegada,
  setRespuestaPegada,
  onEstructurar,
  avisoParseo,
}: {
  contextoExportable: string;
  respuestaPegada: string;
  setRespuestaPegada: (v: string) => void;
  onEstructurar: () => void;
  avisoParseo: string;
}) {
  const [copiado, setCopiado] = useState(false);

  return (
    <div className="mt-4 border-t border-border pt-4">
      <p className="mb-2 font-display text-[15px]">Exportar y pegar</p>
      <Button
        type="button"
        variant="secondary"
        onClick={() => {
          navigator.clipboard.writeText(contextoExportable);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2000);
        }}
      >
        📋 {copiado ? "Copiado ✓" : "Exportar contexto"}
      </Button>
      <p className="mt-2 text-[12px] text-text-muted">
        Copia esto y pégalo en Claude.ai, ChatGPT o Gemini (con tu cuenta normal, sin costo
        adicional). Cuando tengas la respuesta, pégala abajo.
      </p>

      <Label htmlFor="respuestaPegada">Pegar resultado</Label>
      <Textarea
        id="respuestaPegada"
        value={respuestaPegada}
        onChange={(e) => setRespuestaPegada(e.target.value)}
        placeholder="Pega acá la respuesta completa que te dio la IA externa"
        className="min-h-[160px]"
      />
      {avisoParseo ? <p className="mt-1.5 text-[12px] text-danger">{avisoParseo}</p> : null}
      <Button type="button" className="mt-2" disabled={!respuestaPegada.trim()} onClick={onEstructurar}>
        Estructurar
      </Button>
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
  activosVisuales,
  bloquesRecientes,
  onGuardar,
  onBuscarRelacionado,
  onRevisarEscena,
}: {
  proyectoId: string;
  identidad: Identidad;
  personajes: Personaje[];
  personajesEstudio: Personaje[];
  avatares: Avatar[];
  activosCount: number;
  /** Fotos de lugar (Activos tipo "foto") del proyecto — se incluyen
   * siempre en el contexto exportado si existen, igual que ya hacía la
   * generación automática (no hay casilla de "usar Activos", son
   * contexto disponible, igual que Marca/Estilo). */
  activosVisuales: ActivoVisual[];
  bloquesRecientes: Bloque[];
  onGuardar: (formData: FormData) => Promise<void>;
  onBuscarRelacionado: (proyectoId: string, tema: string) => Promise<ContenidoRelacionado>;
  onRevisarEscena: (
    contexto: {
      tema: string;
      tipoContenido: string;
      tipoProduccion: string;
      personajeIds?: string[];
    },
    input: {
      escena: { numero: number; descripcion: string; textoEnPantalla: string };
      otrasEscenas: { numero: number; descripcion: string; textoEnPantalla: string }[];
    },
  ) => Promise<EscenaRevisada>;
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
  const [resultado, setResultado] = useState<ContenidoGenerado | null>(null);
  const [respuestaPegada, setRespuestaPegada] = useState("");
  const [avisoParseo, setAvisoParseo] = useState("");
  // "Ninguno" es la selección por defecto al cargar la pantalla — clics en
  // las miniaturas de la tarjeta "Personajes" (o en las casillas de "Qué
  // incluir en esta pieza", misma fuente de verdad) durante la sesión la
  // cambian, pero solo en memoria (se pierde al recargar, aposta). `ids:
  // []` = "Ninguno". Selección múltiple: 2+ ids seleccionados juntos se
  // listan juntos en el contexto exportado para que la IA externa arme
  // escenas de interacción conjunta entre ellos.
  const [personajeSeleccion, setPersonajeSeleccion] = useState<{ ids: string[]; incluir: boolean }>({
    ids: [],
    incluir: false,
  });
  const incluirPersonaje = personajeSeleccion.incluir;
  function setIncluirPersonaje(v: boolean) {
    setPersonajeSeleccion((prev) => ({ ...prev, incluir: v }));
  }
  // Los Personajes realmente incluidos en el contexto exportado — se
  // guardan con el bloque al confirmar, igual que antes.
  const [personajeIdsUsados, setPersonajeIdsUsados] = useState<string[]>([]);

  // Única función que modifica la selección de Personajes por clic directo
  // (carrusel o casillas de "Qué incluir", ambos la llaman igual) — alterna
  // la membresía en el arreglo y sincroniza "Usar Personaje" según si queda
  // algo seleccionado, en una sola actualización atómica. Al llegar a 0,
  // "Ninguno" vuelve a quedar resaltado solo (deriva de `ids.length === 0`),
  // sin lógica aparte — así el carrusel y "Qué incluir" SIEMPRE reflejan lo
  // mismo.
  function alternarPersonajeSeleccionado(id: string) {
    setPersonajeSeleccion((prev) => {
      const nuevo = prev.ids.includes(id) ? prev.ids.filter((x) => x !== id) : [...prev.ids, id];
      return { ids: nuevo, incluir: nuevo.length > 0 };
    });
  }

  // Tile "Ninguno" del carrusel: vacía la selección Y desmarca "Usar
  // Personaje" — mutuamente excluyente con tener cualquier Personaje
  // seleccionado.
  function seleccionarNinguno() {
    setPersonajeSeleccion({ ids: [], incluir: false });
  }

  // "✨ Automático" de "Qué incluir": vacía la selección SIN desmarcar
  // "Usar Personaje" — a diferencia de "Ninguno", sigue queriendo un
  // Personaje; el contexto exportado usa el primero disponible (ver
  // `personajesParaExportar` más abajo) en vez de que un modelo decida.
  function elegirPersonajeAutomatico() {
    setPersonajeSeleccion((prev) => ({ ids: [], incluir: prev.incluir }));
  }

  const personajesDestacados = personajes.filter((p) => personajeSeleccion.ids.includes(p.id));
  const [incluirMarca, setIncluirMarca] = useState(seccionesInfo.marca);
  const [avatarId, setAvatarId] = useState(avatares[0]?.id ?? "");
  const [incluirContacto, setIncluirContacto] = useState(false);
  const [incluirLogo, setIncluirLogo] = useState(false);
  const [posicionLogo, setPosicionLogo] = useState<PosicionLogo>("inferior-derecha");

  function empezarDeNuevo() {
    setResultado(null);
    setPersonajeIdsUsados([]);
    setConfig(CONFIG_VACIA);
    setRespuestaPegada("");
    setAvisoParseo("");
  }

  // Los Personajes que van en el contexto exportado: la selección manual
  // del usuario, o (con "✨ Automático" y "Usar Personaje" marcado) el
  // primero disponible del proyecto/estudio — sin IA que decida cuál es
  // más relevante, es solo una elección por defecto simple.
  const todosLosPersonajes = [...personajes, ...personajesEstudio];
  const personajesParaExportar = !incluirPersonaje
    ? []
    : personajeSeleccion.ids.length > 0
      ? todosLosPersonajes.filter((p) => personajeSeleccion.ids.includes(p.id))
      : todosLosPersonajes.slice(0, 1);

  const puedeExportar = !!config.tipoContenido && config.tema.trim().length > 0;
  const contextoExportable = puedeExportar
    ? construirPlantillaExportacion({
        identidadCompilada: compileIdentity(identidad, {
          incluirMarca,
          incluirPersonaje,
          incluirContacto,
          personajes: personajesParaExportar,
          activosVisuales,
          avatar: incluirMarca ? (avatares.find((a) => a.id === avatarId) ?? avatares[0] ?? null) : null,
          posicionLogo: incluirLogo ? posicionLogo : null,
        }),
        tipoContenido: config.tipoContenido,
        tipoProduccion: config.tipoProduccion || "IA decide automáticamente",
        tema:
          config.tipoContenido === "Video Largo" && config.duracion.trim()
            ? `${config.tema} (duración aproximada: ${config.duracion.trim()})`
            : config.tema,
        plataforma: config.plataforma || undefined,
        duracion: config.tipoContenido !== "Video Largo" ? config.duracion || undefined : undefined,
        numeroEscenas: config.numeroEscenas || undefined,
        numeroPaginas: config.numeroPaginas || undefined,
        estiloImagen: config.estiloImagen || undefined,
      })
    : "";

  function estructurarRespuesta() {
    if (!respuestaPegada.trim()) return;
    const { contenido, reconocido } = parsearRespuestaIA(respuestaPegada);
    setPersonajeIdsUsados(personajesParaExportar.map((p) => p.id));
    setResultado(contenido);
    setAvisoParseo(
      reconocido
        ? ""
        : "No reconocí el formato esperado en el texto pegado — lo dejé completo, editable, en la " +
            "pestaña \"Copy\" de la revisión, para que lo estructures a mano.",
    );
  }

  // Se repite en las 2 ramas de abajo (resultado / formulario) — Identidad
  // activa y Contenido reciente siempre se muestran, sin importar en qué
  // paso del flujo esté el usuario. Una sola definición para no triplicar
  // el JSX.
  const identidadActivaYReciente = (
    <>
      {personajes.length > 0 ? (
        <Card>
          <SectionTitle>Personajes</SectionTitle>
          <PersonajeThumbnails
            personajes={personajes}
            seleccionadosIds={personajeSeleccion.ids}
            onToggle={alternarPersonajeSeleccionado}
            onNinguno={seleccionarNinguno}
          />
          {personajesDestacados.length > 0 ? (
            <div className="mt-2.5 space-y-2">
              {personajesDestacados.map((p) => (
                <div key={p.id}>
                  <p className="font-display text-[15px]">{p.nombre || "Personaje sin nombre"}</p>
                  {p.personalidad ? (
                    <p className="mt-0.5 text-[12.5px] text-text-muted">
                      {extraerFragmento(p.personalidad, 90)}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2.5 text-[12.5px] text-text-muted">
              Esta pieza no usará ningún Personaje.
            </p>
          )}
        </Card>
      ) : null}

      <Card>
        <SectionTitle subtitle="Lo que el Compilador de Identidad tiene guardado para este proyecto ahora mismo — esto es lo que se incluye en el contexto exportado, sin que tengas que volver a seleccionarlo.">
          Identidad activa
        </SectionTitle>
        <IdentidadChecklist
          identidad={identidad}
          activosCount={activosCount}
          tienePersonaje={personajes.length > 0}
          tieneAvatar={avatares.length > 0}
          personaje={personajesDestacados[0] ?? null}
          avatar={avatares[0] ?? null}
        />
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
    // Resumen de una línea arriba de los tabs — mismos datos ya elegidos en
    // los Pasos de configuración + personajeIdsUsados (los REALMENTE
    // incluidos en el contexto exportado, no el estado crudo y aún
    // editable del carrusel). "Duración" se generaliza a "N láminas" para
    // Carrusel, que no tiene duración pero sí un tamaño equivalente.
    const specPublicacionUsada = TIPOS_PUBLICACION_POR_PLATAFORMA[config.plataforma]?.find(
      (t) => t.value === config.tipoPublicacion,
    );
    const nombresPersonajesUsados = personajeIdsUsados
      .map((id) => [...personajes, ...personajesEstudio].find((p) => p.id === id)?.nombre)
      .filter((nombre): nombre is string => !!nombre?.trim());

    const resumenFormato = [
      config.tipoContenido || null,
      config.plataforma || null,
      config.tipoPublicacion
        ? specPublicacionUsada?.aspectRatio
          ? `${config.tipoPublicacion} (${specPublicacionUsada.aspectRatio})`
          : config.tipoPublicacion
        : null,
      config.tipoContenido === "Carrusel" && config.numeroPaginas && config.numeroPaginas !== "Automático"
        ? `${config.numeroPaginas} láminas`
        : config.duracion || null,
      nombresPersonajesUsados.length > 0 ? nombresPersonajesUsados.join(" + ") : null,
    ]
      .filter((parte): parte is string => !!parte)
      .join(" · ");

    return (
      <>
        {avisoParseo ? (
          <p className="rounded-xl border border-accent/30 bg-accent-soft px-3.5 py-3 text-[13px] text-text">
            {avisoParseo}
          </p>
        ) : null}
        <ResultadoTabs
          proyectoId={proyectoId}
          resultado={resultado}
          formato={config.tipoContenido}
          tipoProduccion={config.tipoProduccion}
          personajeIds={personajeIdsUsados}
          tema={config.tema}
          resumenFormato={resumenFormato}
          onGuardar={onGuardar}
          onEmpezarDeNuevo={empezarDeNuevo}
          onRevisarEscena={onRevisarEscena}
        />
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

      {modo === "rapido" || modo === "guiado" ? (
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
              <QueIncluir
                mostrarPersonaje={hayPersonajeDisponible}
                incluirPersonaje={incluirPersonaje}
                setIncluirPersonaje={setIncluirPersonaje}
                personajes={personajes}
                personajesEstudio={personajesEstudio}
                personajeIds={personajeSeleccion.ids}
                onTogglePersonaje={alternarPersonajeSeleccionado}
                onElegirAutomatico={elegirPersonajeAutomatico}
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
              <ExportarYPegar
                contextoExportable={contextoExportable}
                respuestaPegada={respuestaPegada}
                setRespuestaPegada={setRespuestaPegada}
                onEstructurar={estructurarRespuesta}
                avisoParseo={avisoParseo}
              />
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
            <QueIncluir
              mostrarPersonaje={hayPersonajeDisponible}
              incluirPersonaje={incluirPersonaje}
              setIncluirPersonaje={setIncluirPersonaje}
              personajes={personajes}
              personajesEstudio={personajesEstudio}
              personajeIds={personajeSeleccion.ids}
              onTogglePersonaje={alternarPersonajeSeleccionado}
              onElegirAutomatico={elegirPersonajeAutomatico}
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
            {puedeExportar ? (
              <ExportarYPegar
                contextoExportable={contextoExportable}
                respuestaPegada={respuestaPegada}
                setRespuestaPegada={setRespuestaPegada}
                onEstructurar={estructurarRespuesta}
                avisoParseo={avisoParseo}
              />
            ) : (
              <p className="text-[12.5px] text-text-muted">
                Completa al menos el tipo de contenido y la idea (Paso 3) para poder exportar el
                contexto.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </Card>
    {identidadActivaYReciente}
    </>
  );
}
