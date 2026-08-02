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
  onCrearPersonaje: (proyectoId: string, nombre: string) => Promise<{ id: string }>;
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
    if (!proyectoElegidoId) throw new Error("Todavía no se eligió un Proyecto.");
    const { id } = await onCrearPersonaje(proyectoElegidoId, nombre);
    setAnalisisBiblioteca((prev) =>
      prev ? { ...prev, personajesDisponibles: [...prev.personajesDisponibles, { id, nombre }] } : prev,
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

            {pendientesConsolidados.length > 0 ? (
              <div className="rounded-xl border border-accent/30 bg-accent-soft p-3">
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
                        onCrearNuevo={tipo === "personaje" ? crearPersonajeYResolver : undefined}
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
          <div className="mx-auto flex max-w-[720px] justify-end gap-2">
            <Button type="button" variant="secondary" onClick={volverAPegar}>
              Volver a pegar
            </Button>
            <Button type="button" onClick={handleConfirmar} disabled={confirmarDeshabilitado}>
              {confirmando ? "Creando…" : "Crear video"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
