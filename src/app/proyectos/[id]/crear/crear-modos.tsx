"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Card, SectionTitle, Textarea } from "@/components/ui";
import { AnimacionAnalisis } from "@/components/animacion-analisis";
import { IdentidadChecklist } from "@/components/identidad-checklist";
import { formatearFechaChile } from "@/lib/fecha";
import { compileIdentity, identidadPorSeccion, identidadTieneContacto } from "@/lib/identity-compiler";
import { urlImagenVisible } from "@/lib/imagen-url";
import { bloqueEstrategiaNarrativa, construirVariablesMotor, detectarMotoresSugeridos } from "@/lib/motor-ia";
import { contarCoincidencias, extraerFragmento, extraerPalabrasClave } from "@/lib/reutilizacion";
import {
  construirPlantillaExportacion,
  pareceSerLaPlantillaSinCompletar,
  parsearRespuestaIA,
} from "@/lib/exportar-contexto";
import {
  defaultsPorFormato,
  generarEsqueletoPlan,
  PASOS_ANIMACION,
  personajeSugeridoPorIdea,
} from "@/lib/asistente-crear";
import { QueIncluir } from "@/components/que-incluir";
import { CamposCreacion, CONFIG_VACIA, TarjetaSeleccion, type ConfigCreacion } from "./crear-campos";
import { ResultadoTabs } from "./resultado-tabs";
import type { ContenidoGenerado, EscenaRevisada } from "@/lib/ai";
import type { ContenidoRelacionado } from "@/lib/actions";
import type { ActivoVisual, PosicionLogo } from "@/lib/identity-compiler";
import {
  fotoPrincipal,
  iconoFormato,
  parseFotosPersonaje,
  TIPOS_CONTENIDO,
  TIPOS_PUBLICACION_POR_PLATAFORMA,
} from "@/lib/types";
import type { Avatar, Bloque, Documento, Identidad, MotorIA, Personaje } from "@/lib/types";

/** Máximo de documentos de Conocimiento que se incluyen en el contexto
 * exportado, y largo máximo del contenido citado por documento — para que
 * el contexto siga siendo pegable sin volverse un libro. */
const MAX_DOCUMENTOS_EXPORTADOS = 3;
const LARGO_MAX_CONTENIDO_DOCUMENTO = 800;

/** Los documentos de la Biblioteca de Conocimiento que coinciden con la
 * idea por palabras clave (sin IA — reutilizacion.ts), formateados como
 * bloque de texto para "## Conocimiento relevante" del contexto
 * exportado. "" si nada coincide o la idea no tiene palabras clave. */
function formatearConocimientoRelevante(documentos: Documento[], tema: string): string {
  const palabrasClave = extraerPalabrasClave(tema);
  if (palabrasClave.length === 0 || documentos.length === 0) return "";

  const relevantes = documentos
    .map((d) => ({
      d,
      score: contarCoincidencias(`${d.titulo} ${d.contenido} ${d.etiquetas}`, palabrasClave),
    }))
    .filter(({ score }) => score >= 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_DOCUMENTOS_EXPORTADOS);

  return relevantes
    .map(({ d }) => {
      const partes = [`### ${d.titulo}`];
      if (d.contenido) partes.push(extraerFragmento(d.contenido, LARGO_MAX_CONTENIDO_DOCUMENTO));
      if (d.tipo === "link" && d.valor) partes.push(`Fuente: ${d.valor}`);
      return partes.join("\n");
    })
    .join("\n\n");
}

/** Los 5 pasos del asistente — reemplaza los antiguos "Modo Guiado" /
 * "Modo profesional": ahora es un único flujo, y "Modificar" (dentro de
 * "confirmacion") le da acceso a los mismos controles que antes vivían en
 * el Modo profesional, sin reconstruirlos. */
type PasoAsistente = "inicio" | "analizando" | "confirmacion" | "plan" | "resultado";

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

/** Fila "etiqueta / valor" de la pantalla de confirmación (Paso 3) — solo
 * presentación, sin lógica. */
function FilaResumen({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-1.5">
      <span className="text-text-muted">{etiqueta}</span>
      <span className="text-right font-medium text-text">{valor}</span>
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
  onExportar,
  etiquetaBoton = "📋 Exportar contexto",
}: {
  contextoExportable: string;
  respuestaPegada: string;
  setRespuestaPegada: (v: string) => void;
  onEstructurar: () => void;
  avisoParseo: string;
  /** Se dispara al copiar el contexto — registra el uso del Motor IA
   * seleccionado, si hay uno (estadísticas puras, no bloquea el copiado). */
  onExportar?: () => void;
  /** Texto del botón de copiar — "🚀 Generar Kit IA" en el Plan de
   * Producción (mismo botón, mismo copiado al portapapeles, solo el rótulo
   * cambia según en qué paso del asistente vive). */
  etiquetaBoton?: string;
}) {
  const [copiado, setCopiado] = useState(false);

  return (
    <div>
      <Button
        type="button"
        variant="secondary"
        onClick={() => {
          navigator.clipboard.writeText(contextoExportable);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2000);
          onExportar?.();
        }}
      >
        {copiado ? "Copiado ✓" : etiquetaBoton}
      </Button>
      <p className="mt-2 text-[12px] text-text-muted">
        Copia esto y pégalo en Claude.ai, ChatGPT o Gemini (con tu cuenta normal, sin costo
        adicional). Cuando tengas la respuesta, pégala abajo.
      </p>

      <p className="mb-1.5 mt-3.5 text-[12.5px] text-text-muted">Pegar resultado</p>
      <Textarea
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
  proyectoNombre,
  identidad,
  personajes,
  personajesEstudio,
  avatares,
  activosCount,
  activosVisuales,
  documentos,
  motores,
  bloquesRecientes,
  temaInicial = "",
  onGuardar,
  onBuscarRelacionado,
  onRevisarEscena,
  onRegistrarUsoMotor,
}: {
  proyectoId: string;
  /** Nombre del proyecto — resuelve la variable {{MARCA}} de un Motor IA. */
  proyectoNombre: string;
  /** Idea pre-escrita en el Paso 3 (llega desde "Convertir en contenido"
   * del Banco de Ideas, vía query param) — "" = flujo normal en blanco. */
  temaInicial?: string;
  /** Documentos de la Biblioteca de Conocimiento disponibles (del proyecto
   * + globales) — los que coinciden con la idea por palabras clave se
   * incluyen en "## Conocimiento relevante" del contexto exportado. */
  documentos: Documento[];
  /** Motores IA disponibles (del proyecto + globales) — estrategia
   * narrativa opcional, sugerida por palabras clave sin IA. */
  motores: MotorIA[];
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
  onRegistrarUsoMotor: (motorId: string, proyectoId: string) => Promise<void>;
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

  const [paso, setPaso] = useState<PasoAsistente>("inicio");
  const [modificando, setModificando] = useState(false);
  const [config, setConfig] = useState<ConfigCreacion>({ ...CONFIG_VACIA, tema: temaInicial });
  const [resultado, setResultado] = useState<ContenidoGenerado | null>(null);
  const [respuestaPegada, setRespuestaPegada] = useState("");
  const [avisoParseo, setAvisoParseo] = useState("");
  // "Ninguno" es la selección por defecto al cargar la pantalla — el
  // asistente (Paso 2, "Buscando personaje") puede resaltar uno solo si
  // encuentra coincidencia real por rol/etiqueta (ver
  // `personajeSugeridoPorIdea`); "Modificar" o las miniaturas de la
  // tarjeta "Personajes" la cambian después, solo en memoria (se pierde
  // al recargar, aposta). `ids: []` = "Ninguno". Selección múltiple: 2+
  // ids seleccionados juntos se listan juntos en el contexto exportado
  // para que la IA externa arme escenas de interacción conjunta.
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
    setPersonajeSeleccion({ ids: [], incluir: false });
    setRespuestaPegada("");
    setAvisoParseo("");
    setModificando(false);
    setPaso("inicio");
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
  const identidadCompiladaTexto = compileIdentity(identidad, {
    incluirMarca,
    incluirPersonaje,
    incluirContacto,
    personajes: personajesParaExportar,
    activosVisuales,
    avatar: incluirMarca ? (avatares.find((a) => a.id === avatarId) ?? avatares[0] ?? null) : null,
    posicionLogo: incluirLogo ? posicionLogo : null,
  });
  const conocimientoRelevanteTexto = formatearConocimientoRelevante(documentos, config.tema);
  // El Motor IA aporta SOLO el ángulo narrativo (educativo, comparativo,
  // storytelling…) — el Formato ya elegido sigue determinando la
  // estructura de salida, ver bloqueEstrategiaNarrativa().
  const motorSeleccionado = motores.find((m) => m.id === config.motorId) ?? null;
  const estrategiaNarrativaTexto = bloqueEstrategiaNarrativa(
    motorSeleccionado,
    construirVariablesMotor({
      idea: config.tema,
      identidad,
      identidadCompilada: identidadCompiladaTexto,
      personaje: personajesParaExportar[0] ?? null,
      formato: config.tipoContenido,
      plataforma: config.plataforma || undefined,
      conocimientoRelevante: conocimientoRelevanteTexto,
      proyectoNombre,
    }),
  );
  const contextoExportable = puedeExportar
    ? construirPlantillaExportacion({
        identidadCompilada: identidadCompiladaTexto,
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
        aspectRatio: TIPOS_PUBLICACION_POR_PLATAFORMA[config.plataforma]?.find(
          (t) => t.value === config.tipoPublicacion,
        )?.aspectRatio,
        conocimientoRelevante: conocimientoRelevanteTexto,
        estrategiaNarrativa: estrategiaNarrativaTexto,
      })
    : "";
  const esqueletoPlan = generarEsqueletoPlan(config.tipoContenido, config, motorSeleccionado);

  function registrarUsoMotorSiCorresponde() {
    if (motorSeleccionado) onRegistrarUsoMotor(motorSeleccionado.id, proyectoId).catch(() => {});
  }

  // Paso 1 → Paso 2: resuelve TODO de forma síncrona y determinista (nada
  // de IA — ver asistente-crear.ts) ANTES de que la animación empiece, así
  // que la animación (Paso 2) solo tiene que revelar checkmarks sobre
  // valores que ya existen, nunca esperar a nada.
  function iniciarAnalisis() {
    const defaults = defaultsPorFormato(config.tipoContenido);
    const motoresActivos = motores.filter((m) => m.estado === "activo");
    const motorSugerido = detectarMotoresSugeridos(config.tema, motoresActivos)[0];
    setConfig((prev) => ({
      ...prev,
      ...defaults,
      motorId: motorSugerido ? motorSugerido.motor.id : prev.motorId,
    }));

    const personajeSugerido = personajeSugeridoPorIdea(personajes, personajesEstudio, config.tema);
    setPersonajeSeleccion(
      personajeSugerido ? { ids: [personajeSugerido.personaje.id], incluir: true } : { ids: [], incluir: false },
    );

    setPaso("analizando");
  }

  function estructurarRespuesta() {
    if (!respuestaPegada.trim()) return;
    // Caso real: pegar de vuelta el contexto EXPORTADO (o su plantilla de
    // salida) en vez de la respuesta real de la IA — los mismos
    // encabezados ("## Copy"/"## Escenas") hacen que se "reconozca" igual,
    // y sin este chequeo se guardaba el placeholder literal como si fuera
    // contenido real. Bloquea acá, sin avanzar a la pantalla de revisión.
    if (pareceSerLaPlantillaSinCompletar(respuestaPegada)) {
      setAvisoParseo(
        "Esto parece ser la plantilla exportada (sin completar), no la respuesta de la IA — pega la " +
          "respuesta que te dio Claude/ChatGPT/Gemini, no el texto que copiaste para pegarle a la IA.",
      );
      return;
    }
    const { contenido, reconocido } = parsearRespuestaIA(respuestaPegada);
    setPersonajeIdsUsados(personajesParaExportar.map((p) => p.id));
    setResultado(contenido);
    setAvisoParseo(
      reconocido
        ? ""
        : "No reconocí el formato esperado en el texto pegado — lo dejé completo, editable, en la " +
            "pestaña \"Copy\" de la revisión, para que lo estructures a mano.",
    );
    setPaso("resultado");
  }

  // Se repite en varios pasos de abajo — Identidad activa y Contenido
  // reciente siempre se muestran, sin importar en qué paso del asistente
  // esté el usuario (excepto durante la animación, ver el render final).
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

  if (paso === "analizando") {
    return <AnimacionAnalisis pasos={PASOS_ANIMACION} onCompletar={() => setPaso("confirmacion")} />;
  }

  if (paso === "resultado" && resultado) {
    // Resumen de una línea arriba del Kit — mismos datos ya elegidos en
    // los pasos anteriores + personajeIdsUsados (los REALMENTE incluidos
    // en el contexto exportado, no el estado crudo y aún editable del
    // carrusel). "Duración" se generaliza a "N láminas" para Carrusel, que
    // no tiene duración pero sí un tamaño equivalente.
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
          incluirMarca={incluirMarca}
          incluirLogo={incluirLogo}
          posicionLogo={posicionLogo}
          incluirContacto={incluirContacto}
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
      {paso === "inicio" ? (
        <Card>
          <p className="mb-1 text-[12.5px] text-text-muted">Paso 1 de 5</p>
          <p className="mb-3 font-display text-[17px]">¿Qué quieres crear?</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {TIPOS_CONTENIDO.map((t) => (
              <TarjetaSeleccion
                key={t.value}
                seleccionado={config.tipoContenido === t.value}
                onClick={() => setConfig({ ...CONFIG_VACIA, tipoContenido: t.value, tema: config.tema })}
              >
                <span className="mr-1.5">{t.icono}</span>
                <span className="font-medium">{t.value}</span>
                {t.descripcion ? (
                  <span className="mt-0.5 block text-[11.5px] text-text-muted">{t.descripcion}</span>
                ) : null}
              </TarjetaSeleccion>
            ))}
          </div>

          <div className="mt-5 border-t border-border pt-5">
            <p className="mb-2 font-display text-[16px]">¿De qué quieres hablar?</p>
            <Textarea
              value={config.tema}
              onChange={(e) => setConfig({ ...config, tema: e.target.value })}
              placeholder={
                "Ej: Cinco errores comunes en construcción.\n" +
                "Ej: Cómo impermeabilizar correctamente un techo.\n" +
                "Ej: Diferencias entre porcelanato y cerámica.\n" +
                "Ej: Cómo elegir un buen maestro.\n" +
                "Ej: Cuánto cuesta construir una casa."
              }
              className="min-h-[100px]"
            />
            <p className="mt-1 text-right text-[11.5px] text-text-muted">{config.tema.length} caracteres</p>
          </div>

          <Button
            type="button"
            className="mt-5"
            disabled={!config.tipoContenido || !config.tema.trim()}
            onClick={iniciarAnalisis}
          >
            Continuar →
          </Button>
        </Card>
      ) : null}

      {paso === "confirmacion" ? (
        <Card>
          <SectionTitle subtitle="Revisa lo que preparamos — puedes seguir así o ajustar cualquier detalle.">
            La plataforma preparó este contexto para tu contenido
          </SectionTitle>
          <div className="space-y-2 text-[13.5px]">
            <FilaResumen etiqueta="Proyecto" valor={proyectoNombre || "—"} />
            <FilaResumen etiqueta="Formato" valor={config.tipoContenido || "—"} />
            <FilaResumen
              etiqueta="Personaje"
              valor={
                personajesParaExportar.length > 0
                  ? personajesParaExportar.map((p) => p.nombre || "Sin nombre").join(" + ")
                  : "Ninguno"
              }
            />
            <FilaResumen etiqueta="Motor / Narrativa" valor={motorSeleccionado?.nombre ?? "Automático (sin Motor)"} />
            {config.duracion ? <FilaResumen etiqueta="Duración sugerida" valor={config.duracion} /> : null}
            {config.numeroEscenas ? <FilaResumen etiqueta="Escenas sugeridas" valor={config.numeroEscenas} /> : null}
            {config.numeroPaginas ? <FilaResumen etiqueta="Páginas sugeridas" valor={config.numeroPaginas} /> : null}
            {config.tipoPublicacion ? (
              <FilaResumen etiqueta="Tipo de publicación" valor={config.tipoPublicacion} />
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={() => setPaso("plan")}>
              Continuar →
            </Button>
            <Button type="button" variant="secondary" onClick={() => setModificando((v) => !v)}>
              {modificando ? "Ocultar ajustes" : "Modificar"}
            </Button>
          </div>

          {modificando ? (
            <div className="mt-5 border-t border-border pt-5">
              <CamposCreacion
                config={config}
                onChange={setConfig}
                progresivo={false}
                proyectoId={proyectoId}
                onBuscarRelacionado={onBuscarRelacionado}
                motores={motores}
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
              </div>
            </div>
          ) : null}
        </Card>
      ) : null}

      {paso === "plan" ? (
        <Card>
          <SectionTitle subtitle="La estructura de tu pieza antes de generar los prompts — así sabes qué esperar.">
            Plan de Producción
          </SectionTitle>
          <div className="space-y-2">
            {esqueletoPlan.escenas.map((e) => (
              <div key={e.numero} className="rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-[13.5px]">
                <span className="font-semibold text-text">Escena {e.numero}</span>
                <span className="text-text-muted"> — {e.rol}</span>
              </div>
            ))}
            {esqueletoPlan.extras.map((ex) => (
              <div
                key={ex}
                className="rounded-xl border border-dashed border-border px-3.5 py-2.5 text-[13px] text-text-muted"
              >
                {ex}
              </div>
            ))}
          </div>

          <div className="mt-5 border-t border-border pt-4">
            <ExportarYPegar
              contextoExportable={contextoExportable}
              respuestaPegada={respuestaPegada}
              setRespuestaPegada={setRespuestaPegada}
              onEstructurar={estructurarRespuesta}
              avisoParseo={avisoParseo}
              onExportar={registrarUsoMotorSiCorresponde}
              etiquetaBoton="🚀 Generar Kit IA"
            />
          </div>

          <button
            type="button"
            onClick={() => setPaso("confirmacion")}
            className="mt-3 text-[12.5px] text-text-muted underline hover:text-accent"
          >
            ← Volver a ajustar
          </button>
        </Card>
      ) : null}

      {identidadActivaYReciente}
    </>
  );
}
