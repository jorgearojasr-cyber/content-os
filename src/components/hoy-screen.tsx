"use client";

import { useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { Button, Textarea } from "@/components/ui";
import { ResolucionMarca } from "@/components/resolucion-marca";
import { ContextoParaChatGPT } from "@/components/contexto-para-chatgpt";
import { RevisionBlueprint } from "@/components/revision-blueprint";
import { RevisionCpp } from "@/components/revision-cpp";
import { tieneEstructuraDeBlueprint } from "@/lib/blueprint-parser";
import { explicarError } from "@/lib/errores";
import { useReconocimientoVoz } from "@/lib/reconocimiento-voz";
import type {
  AnalisisBlueprint,
  AnalisisCPP,
  AnalisisProyectoBlueprint,
  DatosImportacionBlueprint,
  DatosImportacionCPP,
  EntidadBiblioteca,
  ItemAgendaHoy,
} from "@/lib/actions";

const ICONO_TIPO_AGENDA: Record<ItemAgendaHoy["tipo"], string> = {
  grabar: "🎬",
  editar: "✂️",
  publicar: "🚀",
};

const ETIQUETA_TIPO_AGENDA: Record<ItemAgendaHoy["tipo"], string> = {
  grabar: "Grabar",
  editar: "Editar",
  publicar: "Publicar",
};

type Modo = "campo" | "resolucion-marca" | "contexto-chatgpt" | "pegar-resultado";

/**
 * Pantalla "Hoy" (UX Migration 1, rediseñada en CONTENT OS V2 — SPRINT 8
 * "Dashboard Hoy") — entrada única a Content OS. Ahora responde primero
 * "¿qué hago ahora?" (agenda de Grabar/Editar/Publicar + "Reanudar
 * Producción", ver `agendaHoy`) y el campo de idea/importar Producción
 * queda debajo, siempre disponible pero ya no protagonista — sigue siendo
 * el único punto de entrada de creación, solo se movió. Si no hay nada
 * pendiente, la agenda no se renderiza y la pantalla es exactamente el
 * campo de idea de siempre. Al confirmar el campo, `tieneEstructuraDeBlueprint()` decide el camino:
 * con estructura de CBD → Mecanismo B (el importador ya existente, en su
 * modo controlado); sin estructura → "Contexto para ChatGPT", construido
 * sobre la Marca activa. Si no hay Marca resuelta todavía (cero o
 * ambigüedad), se resuelve en el lugar con `ResolucionMarca` antes de
 * seguir — nunca una sustitución automática.
 *
 * Paso 3 (UX Migration 1.2): el resultado que ChatGPT devuelve se pega
 * DENTRO de este mismo componente (`modo === "pegar-resultado"`), no
 * navegando de vuelta a `modo === "campo"` — la Marca ya elegida en Paso 1
 * viaja como `proyectoPreResuelto` para que el importador no la vuelva a
 * preguntar.
 */
export function HoyScreen({
  proyectos,
  agendaHoy,
  ideaInicial = "",
  marcaInicialId = null,
  onAnalizarProyecto,
  onCrearProyecto,
  onAnalizarBiblioteca,
  onConfirmar,
  onCrearPersonaje,
  onCrearLocacion,
  onGenerarContexto,
  onGenerarBiblioteca,
  onAnalizarCPP,
  onConfirmarCPP,
  onReemplazarCPP,
}: {
  proyectos: EntidadBiblioteca[];
  /** Dashboard Hoy (Sprint 8): la agenda de "¿qué hago ahora?" — una
   * lista de acciones concretas de cualquier Marca, y la más urgente por
   * recencia para el botón "Reanudar Producción". */
  agendaHoy: { items: ItemAgendaHoy[]; reanudar: ItemAgendaHoy | null };
  /** Precompleta el campo de idea al entrar desde un puente externo — ej.
   * "Convertir en contenido" desde Ideas, o `/proyectos/[id]/crear`
   * (MIGRATION-4C.1). Vacío = comportamiento normal, campo en blanco. */
  ideaInicial?: string;
  /** Preselecciona la Marca activa cuando viene de ese mismo puente — se
   * ignora si no coincide con ninguna Marca real, y el selector cae al
   * comportamiento por defecto (la última creada). */
  marcaInicialId?: string | null;
  onAnalizarProyecto: (textoCrudo: string) => Promise<AnalisisProyectoBlueprint>;
  onCrearProyecto: (nombre: string) => Promise<{ proyectoId: string }>;
  onAnalizarBiblioteca: (proyectoId: string, textoCrudo: string) => Promise<AnalisisBlueprint>;
  onConfirmar: (
    proyectoId: string,
    textoCrudo: string,
    datos: DatosImportacionBlueprint,
  ) => Promise<{ produccionId: string }>;
  onCrearPersonaje: (nombre: string) => Promise<{ id: string }>;
  onCrearLocacion: (proyectoId: string, nombre: string) => Promise<{ id: string }>;
  onGenerarContexto: (proyectoId: string) => Promise<string>;
  /** Locaciones/Planos reales de la Marca activa, para la sección
   * "Biblioteca disponible" del prompt (UX Migration 2.5). */
  onGenerarBiblioteca: (proyectoId: string) => Promise<{ locaciones: string[]; planos: string[] }>;
  /** CONTENT OS V2 — SPRINT 3: importador de CreatorOS Production Package
   * (archivo `.cpp.json`, nunca texto pegado). */
  onAnalizarCPP: (proyectoId: string, textoCrudo: string) => Promise<AnalisisCPP>;
  onConfirmarCPP: (
    proyectoId: string,
    textoCrudo: string,
    datos: DatosImportacionCPP,
  ) => Promise<{ produccionId: string }>;
  onReemplazarCPP: (
    proyectoId: string,
    produccionId: string,
    textoCrudo: string,
    datos: DatosImportacionCPP,
  ) => Promise<{ produccionId: string }>;
}) {
  const [texto, setTexto] = useState(ideaInicial);
  const [marcaActivaId, setMarcaActivaId] = useState<string | null>(
    marcaInicialId && proyectos.some((p) => p.id === marcaInicialId)
      ? marcaInicialId
      : proyectos.length > 0
        ? proyectos[proyectos.length - 1].id
        : null,
  );
  const [modo, setModo] = useState<Modo>("campo");
  const [textoParaImportar, setTextoParaImportar] = useState<string | null>(null);
  // Solo se completa viniendo de Paso 3 (`analizarResultadoPegado`) — ese
  // texto lo generó nuestro propio prompt reducido, que nunca declara un
  // "Proyecto:" propio, así que no hay nada que ignorar. Si el usuario
  // pega un CBD completo directo en Paso 1 (`handleContinuar`), puede
  // traer su propio "Proyecto:" explícito y merece que se respete —
  // `marcaActivaId` ahí es solo la Marca resaltada en el selector, no una
  // decisión tomada sobre ESE documento en particular.
  const [proyectoParaImportar, setProyectoParaImportar] = useState<EntidadBiblioteca | null>(null);
  const [contextoGenerado, setContextoGenerado] = useState("");
  const [biblioteca, setBiblioteca] = useState<{ locaciones: string[]; planos: string[] }>({
    locaciones: [],
    planos: [],
  });
  const [textoPegado, setTextoPegado] = useState("");
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState("");

  // Importación de CreatorOS Production Package (CPP) — Sprint 3,
  // corrección 1: solo desde archivo `.cpp.json`, nunca texto pegado. Se
  // guarda aparte de `textoParaImportar`/`proyectoParaImportar` (esos son
  // del flujo de Blueprint/CBD) porque acá la Marca es siempre la ya
  // elegida en el selector de arriba — no hay paso de resolución propio.
  const [textoCpp, setTextoCpp] = useState<string | null>(null);
  const inputArchivoCppRef = useRef<HTMLInputElement>(null);

  async function handleArchivoCpp(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setError("");
    try {
      const texto = await archivo.text();
      setTextoCpp(texto);
    } catch {
      setError("No se pudo leer el archivo — probá exportarlo de nuevo.");
    }
  }

  // Captura el texto ya escrito al arrancar CADA sesión de dictado, para
  // que "volver a activar el micrófono" agregue en vez de pisar lo que ya
  // había (a mano o de una grabación anterior) — ver `useReconocimientoVoz`.
  const textoAlIniciarRef = useRef("");
  const { soportado: microfonoSoportado, escuchando, iniciar, detener } = useReconocimientoVoz({
    onTranscripcion: (textoSesion) => {
      const base = textoAlIniciarRef.current;
      setTexto(base + (base && textoSesion ? " " : "") + textoSesion);
    },
  });

  function alternarMicrofono() {
    if (escuchando) {
      detener();
    } else {
      textoAlIniciarRef.current = texto;
      iniciar();
    }
  }

  const marcaActiva = proyectos.find((p) => p.id === marcaActivaId) ?? null;

  async function generarContexto(proyectoId: string) {
    setGenerando(true);
    setError("");
    try {
      const [contexto, bibliotecaProyecto] = await Promise.all([
        onGenerarContexto(proyectoId),
        onGenerarBiblioteca(proyectoId),
      ]);
      setContextoGenerado(contexto);
      setBiblioteca(bibliotecaProyecto);
      setModo("contexto-chatgpt");
    } catch (e) {
      setError(explicarError(e));
    } finally {
      setGenerando(false);
    }
  }

  async function handleContinuar() {
    if (!texto.trim()) return;
    detener();
    setError("");
    if (tieneEstructuraDeBlueprint(texto)) {
      setProyectoParaImportar(null);
      setTextoParaImportar(texto);
      return;
    }
    if (!marcaActivaId) {
      setModo("resolucion-marca");
      return;
    }
    await generarContexto(marcaActivaId);
  }

  async function handleMarcaResuelta(proyectoId: string, _nombre: string) {
    setMarcaActivaId(proyectoId);
    await generarContexto(proyectoId);
  }

  function volverAlCampo() {
    setModo("campo");
    setTexto("");
    setContextoGenerado("");
    setBiblioteca({ locaciones: [], planos: [] });
    setTextoPegado("");
    setError("");
  }

  function irAPegarResultado() {
    setModo("pegar-resultado");
  }

  function analizarResultadoPegado() {
    if (!textoPegado.trim()) return;
    setProyectoParaImportar(marcaActiva);
    setTextoParaImportar(textoPegado);
  }

  return (
    <main
      className={`mx-auto flex min-h-full max-w-[640px] flex-col px-4 py-10 sm:px-8 ${
        modo === "campo" && agendaHoy.items.length === 0 ? "justify-center" : ""
      }`}
    >
      {modo === "campo" && agendaHoy.items.length > 0 ? (
        <div className="mb-10 space-y-4">
          <h1 className="text-center font-display text-[26px] font-normal tracking-wide text-text sm:text-[30px]">
            ¿Qué hago ahora?
          </h1>

          {agendaHoy.reanudar ? (
            <Link
              href={agendaHoy.reanudar.href}
              className="hover-lift block rounded-2xl bg-accent p-4 text-text shadow-[var(--shadow-card)]"
            >
              <p className="font-mono text-[10px] uppercase tracking-[1.5px] opacity-70">▶ Reanudar Producción</p>
              <p className="mt-1 font-display text-lg">{agendaHoy.reanudar.titulo}</p>
              <p className="mt-0.5 text-[13px] opacity-85">
                {ICONO_TIPO_AGENDA[agendaHoy.reanudar.tipo]} {ETIQUETA_TIPO_AGENDA[agendaHoy.reanudar.tipo]}
                {agendaHoy.reanudar.accion ? ` · ${agendaHoy.reanudar.accion}` : ""}
              </p>
            </Link>
          ) : null}

          <div className="space-y-1.5">
            {agendaHoy.items.map((item) => (
              <Link
                key={item.produccionId}
                href={item.href}
                className="hover-lift flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-2.5"
              >
                <span aria-hidden>{ICONO_TIPO_AGENDA[item.tipo]}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] text-text">{item.titulo}</span>
                  <span className="block text-[12px] text-text-muted">
                    {ETIQUETA_TIPO_AGENDA[item.tipo]}
                    {item.accion ? ` · ${item.accion}` : ""}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {proyectos.length > 1 && modo === "campo" ? (
        <div className="mb-6 flex justify-center">
          <select
            value={marcaActivaId ?? ""}
            onChange={(e) => setMarcaActivaId(e.target.value || null)}
            className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-[12.5px] text-text"
          >
            {proyectos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {modo === "campo" ? (
        <div className="space-y-3">
          <div className="text-center">
            <h1 className="font-display text-[26px] font-normal tracking-wide text-text sm:text-[30px]">
              ¿Qué video querés hacer hoy?
            </h1>
            <p className="mt-2 text-[14px] text-text-muted">
              Contame la idea, o pegá el guion si ya lo armaste con ChatGPT.
            </p>
          </div>
          <Textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escribí tu idea, o pegá acá tu guion..."
            className="min-h-[160px] text-[14.5px]"
          />
          <div className="flex justify-center">
            <Button
              type="button"
              variant={escuchando ? "primary" : "secondary"}
              onClick={alternarMicrofono}
              disabled={!microfonoSoportado}
              title={
                microfonoSoportado
                  ? undefined
                  : "Tu navegador no soporta dictado por voz — podés escribir tu idea igual."
              }
              className="gap-2"
            >
              <span className={escuchando ? "inline-block animate-pulse" : "inline-block"} aria-hidden>
                🎤
              </span>
              {escuchando ? "Escuchando…" : "Hablar mi idea"}
            </Button>
          </div>
          {error ? <p className="text-[12.5px] text-danger">{error}</p> : null}
          <div className="flex justify-center">
            <Button type="button" onClick={handleContinuar} disabled={generando || !texto.trim()}>
              {generando ? "Un momento…" : "Continuar"}
            </Button>
          </div>
          <div className="flex justify-center">
            <input
              ref={inputArchivoCppRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleArchivoCpp}
            />
            <button
              type="button"
              onClick={() => inputArchivoCppRef.current?.click()}
              disabled={!marcaActivaId}
              title={marcaActivaId ? undefined : "Elegí primero una Marca para importar una Producción."}
              className="text-[12px] text-text-muted underline hover:text-text disabled:opacity-50 disabled:no-underline"
            >
              Importar Producción
            </button>
          </div>
        </div>
      ) : modo === "resolucion-marca" ? (
        <div className="space-y-4">
          <ResolucionMarca
            nombreDeclarado=""
            proyectosDisponibles={proyectos}
            onCrearProyecto={onCrearProyecto}
            onResuelto={handleMarcaResuelta}
          />
          {error ? <p className="text-[12.5px] text-danger">{error}</p> : null}
          <div className="flex justify-center">
            <Button type="button" variant="secondary" onClick={volverAlCampo}>
              Volver a pegar
            </Button>
          </div>
        </div>
      ) : modo === "pegar-resultado" ? (
        <div className="space-y-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[1.5px] text-accent">Paso 3 de 3</p>
            <p className="mt-1 font-display text-lg font-normal tracking-wide text-text">
              Pegá aquí la respuesta completa de ChatGPT
            </p>
          </div>
          <Textarea
            value={textoPegado}
            onChange={(e) => setTextoPegado(e.target.value)}
            placeholder="# Creative Blueprint v1..."
            className="min-h-[220px] font-mono text-[12.5px]"
          />
          <div className="flex justify-center gap-2">
            <Button type="button" variant="secondary" onClick={() => setModo("contexto-chatgpt")}>
              Volver
            </Button>
            <Button type="button" onClick={analizarResultadoPegado} disabled={!textoPegado.trim()}>
              Analizar guion
            </Button>
          </div>
        </div>
      ) : (
        <ContextoParaChatGPT
          idea={texto.trim()}
          contexto={contextoGenerado}
          locaciones={biblioteca.locaciones}
          planos={biblioteca.planos}
          onVolver={volverAlCampo}
          onContinuar={irAPegarResultado}
        />
      )}

      {textoParaImportar ? (
        <RevisionBlueprint
          textoInicial={textoParaImportar}
          proyectoPreResuelto={proyectoParaImportar ?? undefined}
          onCerrar={() => {
            setTextoParaImportar(null);
            setProyectoParaImportar(null);
          }}
          onAnalizarProyecto={onAnalizarProyecto}
          onCrearProyecto={onCrearProyecto}
          onAnalizarBiblioteca={onAnalizarBiblioteca}
          onConfirmar={onConfirmar}
          onCrearPersonaje={onCrearPersonaje}
          onCrearLocacion={onCrearLocacion}
        />
      ) : null}

      {textoCpp && marcaActiva ? (
        <RevisionCpp
          textoInicial={textoCpp}
          proyecto={marcaActiva}
          onCerrar={() => setTextoCpp(null)}
          onAnalizar={onAnalizarCPP}
          onConfirmar={onConfirmarCPP}
          onReemplazar={onReemplazarCPP}
          onCrearPersonaje={onCrearPersonaje}
          onCrearLocacion={onCrearLocacion}
        />
      ) : null}
    </main>
  );
}
