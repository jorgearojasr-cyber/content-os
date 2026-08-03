"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Textarea } from "@/components/ui";
import { SeccionColapsable } from "@/components/seccion-colapsable";
import { ResolucionMarca } from "@/components/resolucion-marca";
import { explicarError } from "@/lib/errores";
import { normalizarTexto } from "@/lib/similitud";
import { FORMATOS_CONTENIDO } from "@/lib/types";
import {
  construirPromptDirectorCreativo,
  parsearAnalisisDirectorCreativo,
  type AnalisisDirectorCreativo,
} from "@/lib/director-creativo";
import type {
  AnalisisBlueprint,
  AnalisisProyectoBlueprint,
  DatosImportacionBlueprint,
  EscenaResuelta,
} from "@/lib/actions";
import {
  ETIQUETAS_TIPO_ESCENA,
  SIN_VINCULAR,
  SelectorResolucion,
  agruparPendientes,
  construirRevision,
  faltanDecisiones,
  type EscenaEnRevision,
  type TipoCampoPendiente,
} from "@/lib/blueprint-import-shared";

const ETIQUETA_TIPO_PENDIENTE: Record<TipoCampoPendiente, string> = {
  plano: "Plano",
  locacion: "Locación",
  personaje: "Personaje",
};

function contarUnicos(valores: string[]): number {
  return new Set(valores.map((v) => v.trim().toLowerCase()).filter(Boolean)).size;
}

function plural(n: number, singular: string, pluralForm: string): string {
  return n === 1 ? singular : pluralForm;
}

/**
 * Pantalla de revisión de un Creative Blueprint — página completa, no un
 * panel lateral (UX Migration 2). Único componente para los dos flujos
 * que antes eran `ImportarBlueprintModal` (proyecto ya elegido) e
 * `ImportarBlueprintGlobalModal` (proyecto por resolver): esa diferencia
 * pasa a ser solo el estado inicial (`proyectoPreResuelto` presente o
 * no), no dos árboles de componentes separados. Toda la lógica
 * compartida (`Campo`, `resolverCampo`, `SelectorResolucion`,
 * `construirRevision`, `faltanDecisiones`) y las tres server actions
 * (`onAnalizarProyecto`/`onAnalizarBiblioteca`/`onConfirmar`) quedan
 * intactas — esta migración solo cambia cómo se presenta.
 *
 * Recorrido: paste (solo si hay errores bloqueantes que corregir) →
 * resolución de Marca (si no hay `proyectoPreResuelto` ni coincidencia
 * exacta) → resumen ("Encontré...") → revisión completa del guion, con
 * cada Personaje/Locación/Plano resuelto en el lugar donde aparece,
 * nunca en un panel de advertencias separado → confirmar.
 */
export function RevisionBlueprint({
  textoInicial,
  proyectoPreResuelto,
  onAnalizarProyecto,
  onCrearProyecto,
  onAnalizarBiblioteca,
  onConfirmar,
  onCrearPersonaje,
  onCrearLocacion,
  onCerrar,
}: {
  textoInicial: string;
  proyectoPreResuelto?: { id: string; nombre: string };
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
  onCerrar: () => void;
}) {
  const router = useRouter();
  const [texto, setTexto] = useState(textoInicial);
  const [analizando, setAnalizando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState("");

  const [analisisProyecto, setAnalisisProyecto] = useState<AnalisisProyectoBlueprint | null>(null);

  const [proyectoElegidoId, setProyectoElegidoId] = useState<string | null>(null);
  const [proyectoElegidoNombre, setProyectoElegidoNombre] = useState("");
  const [analisisBiblioteca, setAnalisisBiblioteca] = useState<AnalisisBlueprint | null>(null);
  const [escenasRevision, setEscenasRevision] = useState<EscenaEnRevision[]>([]);
  const [aceptarDuplicado, setAceptarDuplicado] = useState(false);
  const [formatoElegido, setFormatoElegido] = useState("");
  const [resumenVisto, setResumenVisto] = useState(false);

  // PHASE-2-IMPLEMENTACION-2 — Director Creativo IA (Nivel A, Patrón 2: se
  // copia un prompt, se pega el resultado, nunca una llamada directa desde
  // acá — ver `director-creativo.ts`). `analisisDirector` y su snapshot
  // viven en memoria hasta "Crear video": la Producción todavía no existe
  // mientras se está en Revisión, así que no hay fila donde persistirlos
  // todavía (mismo criterio que `cbdOriginal`, ver `handleConfirmar`).
  const [analisisDirector, setAnalisisDirector] = useState<AnalisisDirectorCreativo | null>(null);
  const [snapshotAnalisisDirector, setSnapshotAnalisisDirector] = useState("");
  const [formularioDirectorAbierto, setFormularioDirectorAbierto] = useState(false);
  const [pasoFormularioDirector, setPasoFormularioDirector] = useState<"copiar" | "pegar">("copiar");
  const [textoRespuestaDirector, setTextoRespuestaDirector] = useState("");
  const [errorDirector, setErrorDirector] = useState("");
  const [promptDirectorCopiado, setPromptDirectorCopiado] = useState(false);

  function volverAPegar() {
    setAnalisisProyecto(null);
    setProyectoElegidoId(null);
    setProyectoElegidoNombre("");
    setAnalisisBiblioteca(null);
    setEscenasRevision([]);
    setAceptarDuplicado(false);
    setFormatoElegido("");
    setResumenVisto(false);
  }

  async function resolverProyecto(proyectoId: string, nombre: string) {
    setError("");
    setResumenVisto(false);
    try {
      const analisis = await onAnalizarBiblioteca(proyectoId, texto);
      setAnalisisBiblioteca(analisis);
      setEscenasRevision(construirRevision(analisis.resultado.escenas, analisis));
      setProyectoElegidoId(proyectoId);
      setProyectoElegidoNombre(nombre);
      setFormatoElegido(analisis.resultado.produccion?.formato ?? "");
    } catch (e) {
      setError(explicarError(e));
    }
  }

  async function crearPersonajeYResolver(nombre: string): Promise<{ id: string }> {
    const { id } = await onCrearPersonaje(nombre);
    setAnalisisBiblioteca((prev) =>
      prev ? { ...prev, personajesDisponibles: [...prev.personajesDisponibles, { id, nombre }] } : prev,
    );
    return { id };
  }

  async function crearLocacionYResolver(nombre: string): Promise<{ id: string }> {
    if (!proyectoElegidoId) throw new Error("Todavía no se eligió un Proyecto.");
    const { id } = await onCrearLocacion(proyectoElegidoId, nombre);
    setAnalisisBiblioteca((prev) =>
      prev ? { ...prev, locacionesDisponibles: [...prev.locacionesDisponibles, { id, nombre }] } : prev,
    );
    return { id };
  }

  async function handleAnalizar(textoAAnalizar: string) {
    setAnalizando(true);
    setError("");
    setProyectoElegidoId(null);
    setAnalisisBiblioteca(null);
    setEscenasRevision([]);
    setAceptarDuplicado(false);
    try {
      const resultado = await onAnalizarProyecto(textoAAnalizar);
      setAnalisisProyecto(resultado);
      if (resultado.resultado.errores.length === 0) {
        if (proyectoPreResuelto) {
          await resolverProyecto(proyectoPreResuelto.id, proyectoPreResuelto.nombre);
        } else if (resultado.proyectoResuelto) {
          await resolverProyecto(resultado.proyectoResuelto.id, resultado.proyectoResuelto.nombre);
        }
      }
    } catch (e) {
      setError(explicarError(e));
    } finally {
      setAnalizando(false);
    }
  }

  // Analiza automáticamente al montar, una sola vez — el usuario ya
  // "confirmó" al pegar/escribir en Hoy, no debería tener que tocar
  // "Analizar" de nuevo. Diferido a un microtask para no disparar
  // setState de forma síncrona dentro del cuerpo del efecto
  // (react-hooks/set-state-in-effect).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    queueMicrotask(() => handleAnalizar(textoInicial));
  }, []);

  // UX-MIGRATION-5: una decisión se aplica a TODAS las apariciones del
  // mismo nombre (normalizado) dentro del guion, no solo a la escena
  // donde se tocó el radio — es lo que hace posible resolver un
  // Personaje/Locación/Plano repetido en una sola tarjeta consolidada
  // (ver `agruparPendientes`) en vez de una por escena. Reemplaza a los
  // antiguos `decidirPersonaje`/`decidirCampo`, que solo tocaban un
  // índice puntual.
  function decidirPorNombre(tipo: "plano" | "locacion" | "personaje", nombre: string, valor: string) {
    const clave = normalizarTexto(nombre);
    const decision = valor === "" ? undefined : valor === SIN_VINCULAR ? null : valor;
    setEscenasRevision((prev) =>
      prev.map((e) => {
        if (tipo === "personaje") {
          return {
            ...e,
            personajes: e.personajes.map((c) =>
              !c.resuelto && normalizarTexto(c.nombre) === clave ? { ...c, decision } : c,
            ),
          };
        }
        const actual = e[tipo];
        if (!actual || actual.resuelto || normalizarTexto(actual.nombre) !== clave) return e;
        return { ...e, [tipo]: { ...actual, decision } };
      }),
    );
  }

  // PREPARACION-FIX-1, FIX 3: "Crear video" deshabilitado por decisiones
  // pendientes debe llevar directo a resolverlas — todas viven en el
  // bloque consolidado "Antes de continuar" (ver `agruparPendientes`), así
  // que alcanza con desplazarse ahí y enfocar el primer control.
  function irAPrimeraPendiente() {
    const bloque = document.getElementById("antes-de-continuar");
    if (!bloque) return;
    bloque.scrollIntoView({ behavior: "smooth", block: "start" });
    bloque.querySelector<HTMLElement>("input, button")?.focus();
  }

  // Serializa lo único que realmente se puede editar en esta pantalla
  // (Formato + las decisiones de Personaje/Locación/Plano) — es lo que
  // determina si un análisis ya generado sigue representando el guion
  // actual. Título/idea/objetivo/contexto/texto de cada escena no son
  // editables acá todavía, así que no hace falta incluirlos.
  function snapshotCbdActual(): string {
    return JSON.stringify({
      formato: formatoElegido,
      escenas: escenasRevision.map((e) => ({
        plano: e.plano ? (e.plano.resuelto ? e.plano.id : (e.plano.decision ?? null)) : null,
        locacion: e.locacion ? (e.locacion.resuelto ? e.locacion.id : (e.locacion.decision ?? null)) : null,
        personajes: e.personajes.map((c) => (c.resuelto ? c.id : (c.decision ?? null))),
      })),
    });
  }

  // Derivado, no un estado propio — "vigente"/"desactualizado" se calcula
  // comparando contra el snapshot tomado en el momento del último análisis
  // exitoso, nunca se marca a mano. `null` = todavía no se pidió opinión.
  const estadoAnalisisDirectorActual: "vigente" | "desactualizado" | null = !analisisDirector
    ? null
    : snapshotCbdActual() === snapshotAnalisisDirector
      ? "vigente"
      : "desactualizado";

  function construirPromptDirector(): string {
    if (!resultado?.produccion) return "";
    return construirPromptDirectorCreativo(
      {
        titulo: resultado.produccion.titulo,
        formato: formatoElegido || resultado.produccion.formato,
        ideaCentral: resultado.produccion.ideaCentral,
        objetivoGeneral: resultado.produccion.objetivoGeneral,
        publicoObjetivo: resultado.produccion.publicoObjetivo,
        duracionEstimada: resultado.produccion.duracionEstimada,
      },
      escenasRevision.map((e, i) => ({
        numero: i + 1,
        tipo: e.cbd.tipo,
        objetivoNarrativo: e.cbd.objetivoNarrativo,
        textoHablado: e.cbd.textoHablado,
        textoPantalla: e.cbd.textoPantalla,
        duracionEstimada: e.cbd.duracionEstimada,
        personajes: e.personajes.map((c) => c.nombre),
        locacion: e.locacion?.nombre ?? "",
        plano: e.plano?.nombre ?? "",
      })),
      analisisBiblioteca?.personajesDisponibles.map((p) => p.nombre) ?? [],
      analisisBiblioteca?.locacionesDisponibles.map((l) => l.nombre) ?? [],
    );
  }

  function abrirFormularioDirector() {
    setErrorDirector("");
    setTextoRespuestaDirector("");
    setPasoFormularioDirector("copiar");
    setFormularioDirectorAbierto(true);
  }

  function cerrarFormularioDirector() {
    setFormularioDirectorAbierto(false);
    setErrorDirector("");
  }

  async function copiarPromptDirector() {
    try {
      await navigator.clipboard.writeText(construirPromptDirector());
      setPromptDirectorCopiado(true);
      setTimeout(() => setPromptDirectorCopiado(false), 2000);
    } catch {
      setErrorDirector("No se pudo copiar al portapapeles — copiá el texto manualmente.");
    }
  }

  // Sin proveedor de IA de por medio (Nivel A, Patrón 2) — parsear y
  // validar el JSON pegado es instantáneo, no hay espera de red que
  // mostrar acá.
  function analizarRespuestaDirector() {
    const resultadoParseo = parsearAnalisisDirectorCreativo(textoRespuestaDirector);
    if (!resultadoParseo.ok) {
      setErrorDirector(resultadoParseo.error);
      return;
    }
    // "Volver a analizar" reemplaza por completo — nunca mezcla ni
    // acumula con el análisis anterior (contrato congelado).
    setAnalisisDirector(resultadoParseo.analisis);
    setSnapshotAnalisisDirector(snapshotCbdActual());
    setFormularioDirectorAbierto(false);
    setErrorDirector("");
    setTextoRespuestaDirector("");
  }

  async function handleConfirmar() {
    if (!analisisBiblioteca?.resultado.produccion || !proyectoElegidoId) return;
    setConfirmando(true);
    setError("");
    try {
      const escenasResueltas: EscenaResuelta[] = escenasRevision.map((e) => ({
        tipo: e.cbd.tipo,
        objetivoNarrativo: e.cbd.objetivoNarrativo,
        duracionEstimada: e.cbd.duracionEstimada,
        emocion: e.cbd.emocion,
        resultadoEsperado: e.cbd.resultadoEsperado,
        personajeIds: e.personajes
          .map((c) => (c.resuelto ? c.id : c.decision))
          .filter((id): id is string => Boolean(id)),
        locacionId: e.locacion ? (e.locacion.resuelto ? e.locacion.id : e.locacion.decision ?? null) : null,
        planoId: e.plano ? (e.plano.resuelto ? e.plano.id : e.plano.decision ?? null) : null,
        movimientoCamara: e.cbd.movimientoCamara,
        textoHablado: e.cbd.textoHablado,
        textoPantalla: e.cbd.textoPantalla,
        recursosNecesarios: e.cbd.recursosNecesarios,
        promptImagen: e.cbd.promptImagen,
        promptVideo: e.cbd.promptVideo,
        musica: e.cbd.musica,
        transicion: e.cbd.transicion,
        notas: e.cbd.notas,
      }));

      const { produccionId } = await onConfirmar(proyectoElegidoId, texto, {
        produccion: { ...analisisBiblioteca.resultado.produccion, formato: formatoElegido },
        contexto: analisisBiblioteca.resultado.contexto,
        recursosGlobales: analisisBiblioteca.resultado.recursosGlobales,
        escenas: escenasResueltas,
        // Se persiste tal cual quedó acá, incluido "desactualizado" si el
        // usuario no volvió a pedir opinión tras la última edición —
        // nunca se "arregla" en silencio (contrato congelado).
        analisisDirectorCreativoJson: analisisDirector,
        estadoAnalisisDirectorCreativo: estadoAnalisisDirectorActual,
      });

      const proyectoDestino = proyectoElegidoId;
      onCerrar();
      // UX-MIGRATION-5: el siguiente paso después de crear el video es
      // grabar, no planificar — aterriza directo en Copiloto (que ya
      // resuelve sola cuál es la primera escena pendiente), nunca en el
      // tablero de Escenas.
      router.push(`/proyectos/${proyectoDestino}/producciones/${produccionId}/copiloto`);
    } catch (e) {
      setError(explicarError(e));
      setConfirmando(false);
    }
  }

  const resultadoProyecto = analisisProyecto?.resultado ?? null;
  const bloqueanteProyecto = resultadoProyecto !== null && resultadoProyecto.errores.length > 0;
  const proyectoPendiente = analisisProyecto !== null && !bloqueanteProyecto && proyectoElegidoId === null;
  const resultado = analisisBiblioteca?.resultado ?? null;
  const listo = resultado !== null && resultado.errores.length === 0;
  const esDuplicado = analisisBiblioteca?.produccionDuplicada != null;
  const confirmarDeshabilitado =
    !listo || faltanDecisiones(escenasRevision) || (esDuplicado && !aceptarDuplicado) || confirmando;

  // Los mismatches de Personaje/Locación/Plano ya no se resuelven uno por
  // escena — UX-MIGRATION-5 los consolida en un solo bloque ("Antes de
  // continuar", ver `agruparPendientes` + `pendientesConsolidados` abajo)
  // cuando el mismo nombre se repite en el guion, para no preguntar lo
  // mismo varias veces. Solo quedan acá las advertencias generales
  // (Proyecto/Duración de un CBD pegado a mano), que no son "campo por
  // resolver" sino información de contexto.
  const advertenciasGenerales = resultado?.advertencias.filter((a) => !a.startsWith("Escena en posición")) ?? [];
  const pendientesConsolidados = agruparPendientes(escenasRevision);

  const etapa: "paste" | "proyecto" | "resumen" | "revision" =
    !analisisProyecto || bloqueanteProyecto
      ? "paste"
      : proyectoPendiente
        ? "proyecto"
        : resultado && analisisBiblioteca
          ? resumenVisto
            ? "revision"
            : "resumen"
          : "paste";

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-bg">
      <div className="sticky top-0 z-10 border-b border-border bg-bg/95 px-4 py-3 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-[720px] items-center justify-between gap-3">
          <div>
            <span className="font-display text-base font-normal tracking-wide text-text">Vamos a armar tu video</span>
            {proyectoElegidoNombre ? (
              <span className="ml-2 text-[12px] text-text-muted">→ {proyectoElegidoNombre}</span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cancelar"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-lg leading-none text-text-muted hover:bg-surface-2 hover:text-text"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[720px] flex-1 px-4 py-6 sm:px-8">
        {etapa === "paste" ? (
          <div className="space-y-3">
            <p className="text-[13px] text-text-muted">Pegá el guion generado por ChatGPT.</p>
            <Textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="# Creative Blueprint v1..."
              className="min-h-[320px] font-mono text-[12.5px]"
            />
            {resultadoProyecto && resultadoProyecto.errores.length > 0 ? (
              <div className="rounded-lg border border-danger/40 bg-danger/5 p-3">
                <p className="text-[12.5px] font-medium text-danger">Todavía no se puede crear el video con este guion:</p>
                <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[12.5px] text-danger">
                  {resultadoProyecto.errores.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {error ? <p className="text-[12.5px] text-danger">{error}</p> : null}
            <Button type="button" onClick={() => handleAnalizar(texto)} disabled={analizando || !texto.trim()}>
              {analizando ? "Analizando…" : "Analizar"}
            </Button>
          </div>
        ) : etapa === "proyecto" && analisisProyecto ? (
          <div className="space-y-4">
            <ResolucionMarca
              nombreDeclarado={analisisProyecto.nombreDeclarado}
              proyectosDisponibles={analisisProyecto.proyectosDisponibles}
              onCrearProyecto={onCrearProyecto}
              onResuelto={resolverProyecto}
            />
            {error ? <p className="text-[12.5px] text-danger">{error}</p> : null}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="secondary" onClick={volverAPegar}>
                Volver a pegar
              </Button>
            </div>
          </div>
        ) : etapa === "resumen" && resultado ? (
          <div className="space-y-4">
            <p className="font-display text-xl font-normal tracking-wide text-text">Encontré</p>
            <ul className="space-y-1.5 text-[14.5px] text-text">
              <li>
                ✓ {escenasRevision.length} {plural(escenasRevision.length, "escena", "escenas")}
              </li>
              {(() => {
                const nPersonajes = contarUnicos(resultado.escenas.flatMap((e) => e.personajes));
                return nPersonajes > 0 ? (
                  <li>
                    ✓ {nPersonajes} {plural(nPersonajes, "personaje", "personajes")}
                  </li>
                ) : null;
              })()}
              {(() => {
                const nLocaciones = contarUnicos(resultado.escenas.map((e) => e.locacion).filter(Boolean));
                return nLocaciones > 0 ? (
                  <li>
                    ✓ {nLocaciones} {plural(nLocaciones, "locación", "locaciones")}
                  </li>
                ) : null;
              })()}
              {resultado.produccion?.formato ? <li>✓ Formato {resultado.produccion.formato}</li> : null}
            </ul>
            <p className="text-[13px] text-text-muted">Todo listo para revisar.</p>
            <div className="flex gap-2">
              <Button type="button" onClick={() => setResumenVisto(true)}>
                Comenzar revisión
              </Button>
              <Button type="button" variant="secondary" onClick={volverAPegar}>
                Volver a pegar
              </Button>
            </div>
          </div>
        ) : etapa === "revision" && resultado && analisisBiblioteca ? (
          <div className="space-y-4">
            {advertenciasGenerales.length > 0 ? (
              <p className="text-[12.5px] text-text-muted">{advertenciasGenerales.join(" ")}</p>
            ) : null}

            {analisisBiblioteca.produccionDuplicada ? (
              <div className="rounded-lg border border-danger/40 bg-danger/5 p-3">
                <p className="text-[12.5px] font-medium text-danger">
                  Ya existe una Producción con este guion exacto:{" "}
                  <Link
                    href={`/proyectos/${proyectoElegidoId}/producciones/${analisisBiblioteca.produccionDuplicada.id}`}
                    className="underline"
                    target="_blank"
                  >
                    {analisisBiblioteca.produccionDuplicada.titulo}
                  </Link>
                  .
                </p>
                <label className="mt-2 flex items-center gap-2 text-[12.5px] text-text">
                  <input
                    type="checkbox"
                    checked={aceptarDuplicado}
                    onChange={(e) => setAceptarDuplicado(e.target.checked)}
                  />
                  Crear de todas formas (esto va a crear una Producción nueva y separada)
                </label>
              </div>
            ) : null}

            <SeccionColapsable titulo="Producción" tieneContenido>
              <p className="text-[14.5px] font-medium text-text">{resultado.produccion?.titulo}</p>
              <label className="mt-2 block text-[11.5px] text-text-muted">
                Formato
                <select
                  value={formatoElegido}
                  onChange={(e) => setFormatoElegido(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-border bg-surface-2 px-2.5 py-2 text-[12.5px] text-text"
                >
                  <option value="">— Elegí un formato —</option>
                  {FORMATOS_CONTENIDO.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </label>
              {resultado.produccion?.ideaCentral ? (
                <p className="mt-1 text-[12.5px] text-text-muted">Idea central: {resultado.produccion.ideaCentral}</p>
              ) : null}
              {resultado.produccion?.objetivoGeneral ? (
                <p className="mt-1 text-[12.5px] text-text-muted">
                  Objetivo general: {resultado.produccion.objetivoGeneral}
                </p>
              ) : null}
              {resultado.produccion && resultado.produccion.objetivoEspectador.length > 0 ? (
                <ul className="mt-1 list-disc pl-4 text-[12.5px] text-text-muted">
                  {resultado.produccion.objetivoEspectador.map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
              ) : null}
            </SeccionColapsable>

            {resultado.contexto ? (
              <SeccionColapsable titulo="Contexto" tieneContenido={false}>
                <p className="whitespace-pre-wrap text-[12.5px] text-text-muted">{resultado.contexto}</p>
              </SeccionColapsable>
            ) : null}

            {resultado.recursosGlobales &&
            (resultado.recursosGlobales.musicaPrincipal ||
              resultado.recursosGlobales.intro ||
              resultado.recursosGlobales.outro) ? (
              <SeccionColapsable titulo="Recursos globales" tieneContenido={false}>
                {resultado.recursosGlobales.musicaPrincipal ? (
                  <p className="text-[12.5px] text-text-muted">Música: {resultado.recursosGlobales.musicaPrincipal}</p>
                ) : null}
                {resultado.recursosGlobales.intro ? (
                  <p className="text-[12.5px] text-text-muted">Intro: {resultado.recursosGlobales.intro}</p>
                ) : null}
                {resultado.recursosGlobales.outro ? (
                  <p className="text-[12.5px] text-text-muted">Outro: {resultado.recursosGlobales.outro}</p>
                ) : null}
              </SeccionColapsable>
            ) : null}

            <div className="rounded-xl border border-border bg-surface p-3.5">
              {/* El formulario de copiar/pegar tiene prioridad sobre el análisis
                  ya existente — "Volver a analizar" debe poder reabrirlo aunque
                  ya haya un `analisisDirector` en memoria (se reemplaza recién
                  cuando el nuevo parseo tiene éxito, nunca antes). */}
              {formularioDirectorAbierto ? (
                <div className="space-y-3">
                  <p className="text-[13px] font-medium text-text">Director Creativo</p>
                  {pasoFormularioDirector === "copiar" ? (
                    <>
                      <p className="text-[12.5px] text-text-muted">
                        Copiá este prompt y corrélo en la IA que prefieras (ChatGPT, Claude, Gemini...).
                      </p>
                      <Textarea
                        readOnly
                        value={construirPromptDirector()}
                        className="min-h-[160px] font-mono text-[11.5px]"
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="secondary" onClick={copiarPromptDirector}>
                          {promptDirectorCopiado ? "Copiado ✓" : "Copiar prompt"}
                        </Button>
                        <Button type="button" onClick={() => setPasoFormularioDirector("pegar")}>
                          Ya tengo la respuesta
                        </Button>
                        <Button type="button" variant="secondary" onClick={cerrarFormularioDirector}>
                          Cancelar
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-[12.5px] text-text-muted">Pegá acá la respuesta completa.</p>
                      <Textarea
                        value={textoRespuestaDirector}
                        onChange={(e) => setTextoRespuestaDirector(e.target.value)}
                        placeholder='{"resumenGeneral": ...}'
                        className="min-h-[160px] font-mono text-[11.5px]"
                      />
                      {errorDirector ? <p className="text-[12.5px] text-danger">{errorDirector}</p> : null}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          onClick={analizarRespuestaDirector}
                          disabled={!textoRespuestaDirector.trim()}
                        >
                          Analizar
                        </Button>
                        <Button type="button" variant="secondary" onClick={() => setPasoFormularioDirector("copiar")}>
                          Volver al prompt
                        </Button>
                        <Button type="button" variant="secondary" onClick={cerrarFormularioDirector}>
                          Cancelar
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ) : analisisDirector ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-medium text-text">Director Creativo</p>
                    <Button
                      type="button"
                      variant="secondary"
                      className="px-3 py-1.5 text-[12.5px]"
                      onClick={abrirFormularioDirector}
                    >
                      Volver a analizar
                    </Button>
                  </div>
                  {estadoAnalisisDirectorActual === "desactualizado" ? (
                    <p className="rounded-lg border border-danger/40 bg-danger/5 p-2 text-[12.5px] text-danger">
                      Este análisis quedó desactualizado — cambiaste algo después de pedir la opinión. Tocá
                      &ldquo;Volver a analizar&rdquo; para que refleje el guion actual.
                    </p>
                  ) : null}
                  <div className="rounded-lg border border-accent/30 bg-accent-soft p-3">
                    <p className="text-[12.5px] font-medium text-accent">
                      {analisisDirector.resumenGeneral.grabariaAsi ? "Lo grabaría así" : "Todavía no lo grabaría así"}
                    </p>
                    <p className="mt-1 text-[13.5px] text-text">{analisisDirector.resumenGeneral.veredicto}</p>
                    <p className="mt-1 text-[11.5px] text-text-muted">
                      Confianza del Director: {analisisDirector.resumenGeneral.confianzaDelDirector}/100
                    </p>
                  </div>
                  {analisisDirector.hallazgos.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-[11.5px] font-semibold uppercase tracking-wide text-text-muted">Hallazgos</p>
                      {analisisDirector.hallazgos.map((h, i) => (
                        <div key={i} className="rounded-lg border border-border bg-surface-2 p-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10.5px] text-accent">
                              {h.categoria}
                            </span>
                            <span className="text-[10.5px] text-text-muted">
                              {h.prioridad}
                              {h.escenas.length > 0
                                ? ` — Escena${h.escenas.length > 1 ? "s" : ""} ${h.escenas.join(", ")}`
                                : ""}
                            </span>
                          </div>
                          <p className="mt-1 text-[13px] font-medium text-text">{h.titulo}</p>
                          <p className="mt-0.5 text-[12.5px] text-text-muted">{h.porQué}</p>
                          <p className="mt-1 text-[12.5px] text-text">💡 {h.sugerencia}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {analisisDirector.mejorasPrioritarias.length > 0 ? (
                    <div>
                      <p className="mb-1 text-[11.5px] font-semibold uppercase tracking-wide text-text-muted">
                        Mejoras prioritarias
                      </p>
                      <ul className="space-y-0.5 text-[12.5px] text-text">
                        {analisisDirector.mejorasPrioritarias.map((m, i) => (
                          <li key={i}>• {m}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {analisisDirector.decisionesDeProduccion.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-[11.5px] font-semibold uppercase tracking-wide text-text-muted">
                        Decisiones de producción
                      </p>
                      {analisisDirector.decisionesDeProduccion.map((d, i) => (
                        <div key={i} className="rounded-lg border border-border bg-surface-2 p-2.5">
                          <p className="text-[12.5px] font-medium text-text">
                            Escena {d.escena} — {d.tipo}: {d.necesidad}
                          </p>
                          <p className="mt-0.5 text-[12.5px] text-text-muted">{d.porQué}</p>
                          {d.alternativasEnBiblioteca.length > 0 ? (
                            <ul className="mt-1.5 space-y-0.5 text-[12.5px] text-text">
                              {d.alternativasEnBiblioteca.map((a, j) => (
                                <li key={j}>
                                  {a.encaja ? "✓" : "✗"} {a.nombre} — {a.porQué}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          <p className="mt-1 text-[12.5px] text-text-muted">Si ninguna sirve: {d.siNingunaEncaja}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <>
                  <p className="text-[13px] font-medium text-text">Director Creativo</p>
                  <p className="mt-1 text-[12.5px] text-text-muted">
                    Pedile una segunda opinión antes de grabar — nunca hace falta para crear el video.
                  </p>
                  <Button type="button" variant="secondary" className="mt-2" onClick={abrirFormularioDirector}>
                    💡 Pedir opinión al Director Creativo
                  </Button>
                </>
              )}
            </div>

            {pendientesConsolidados.length > 0 ? (
              <div id="antes-de-continuar" className="rounded-xl border border-accent/30 bg-accent-soft p-3">
                <p className="mb-2 text-[13px] font-medium text-text">Antes de continuar</p>
                <div className="space-y-3">
                  {pendientesConsolidados.map(({ tipo, campo, ocurrencias }) => (
                    <div key={`${tipo}:${normalizarTexto(campo.nombre)}`}>
                      <span className="text-[11.5px] text-text-muted">
                        {ETIQUETA_TIPO_PENDIENTE[tipo]}
                        {ocurrencias > 1 ? ` (aparece en ${ocurrencias} escenas)` : ""}:{" "}
                      </span>
                      <SelectorResolucion
                        campo={campo}
                        onCrearNuevo={
                          tipo === "personaje"
                            ? crearPersonajeYResolver
                            : tipo === "locacion"
                              ? crearLocacionYResolver
                              : undefined
                        }
                        etiquetaCrearNuevo={tipo === "locacion" ? "nueva Locación" : "nuevo Personaje"}
                        onDecidir={(v) => decidirPorNombre(tipo, campo.nombre, v)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div>
              <p className="mb-2 text-[13px] font-medium text-text">
                {escenasRevision.length} {plural(escenasRevision.length, "escena", "escenas")}
              </p>
              <div className="space-y-3">
                {escenasRevision.map((e, i) => (
                  <div key={i} className="rounded-xl border border-border bg-surface p-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-text-muted">#{i + 1}</span>
                      <span className="rounded-full bg-accent-soft px-2.5 py-1 font-mono text-[10.5px] text-accent">
                        {ETIQUETAS_TIPO_ESCENA[e.cbd.tipo] ?? e.cbd.tipo}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[13px] text-text">{e.cbd.objetivoNarrativo}</p>

                    {e.plano ? (
                      <div className="mt-2">
                        <span className="text-[11.5px] text-text-muted">Plano: </span>
                        <SelectorResolucion
                          campo={e.plano}
                          onDecidir={(v) => decidirPorNombre("plano", e.plano!.nombre, v)}
                          soloEstado={!e.plano.resuelto && !e.plano.autoResuelto}
                        />
                      </div>
                    ) : null}
                    {e.locacion ? (
                      <div className="mt-2">
                        <span className="text-[11.5px] text-text-muted">Locación: </span>
                        <SelectorResolucion
                          campo={e.locacion}
                          onCrearNuevo={crearLocacionYResolver}
                          etiquetaCrearNuevo="nueva Locación"
                          onDecidir={(v) => decidirPorNombre("locacion", e.locacion!.nombre, v)}
                          soloEstado={!e.locacion.resuelto && !e.locacion.autoResuelto}
                        />
                      </div>
                    ) : null}
                    {e.personajes.length > 0 ? (
                      <div className="mt-2 space-y-1.5">
                        <span className="text-[11.5px] text-text-muted">Personajes:</span>
                        {e.personajes.map((c, j) => (
                          <SelectorResolucion
                            key={j}
                            campo={c}
                            onCrearNuevo={crearPersonajeYResolver}
                            onDecidir={(v) => decidirPorNombre("personaje", c.nombre, v)}
                            soloEstado={!c.resuelto && !c.autoResuelto}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            {error ? <p className="text-[12.5px] text-danger">{error}</p> : null}
          </div>
        ) : null}
      </div>

      {etapa === "revision" ? (
        <div className="sticky bottom-0 border-t border-border bg-bg/95 px-4 py-3 backdrop-blur sm:px-8">
          <div className="mx-auto max-w-[720px]">
            {pendientesConsolidados.length > 0 ? (
              <p className="mb-2 text-[12.5px] text-text-muted">
                Faltan {pendientesConsolidados.length}{" "}
                {plural(pendientesConsolidados.length, "decisión", "decisiones")} antes de crear el video:{" "}
                {pendientesConsolidados
                  .map((p) => `${ETIQUETA_TIPO_PENDIENTE[p.tipo]} "${p.campo.nombre}"`)
                  .join(", ")}
                .{" "}
                <button
                  type="button"
                  onClick={irAPrimeraPendiente}
                  className="text-accent underline hover:no-underline"
                >
                  Ir a la primera pendiente ↑
                </button>
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={volverAPegar}>
                Volver a pegar
              </Button>
              <Button type="button" onClick={handleConfirmar} disabled={confirmarDeshabilitado}>
                {confirmando ? "Creando…" : "Crear video"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
