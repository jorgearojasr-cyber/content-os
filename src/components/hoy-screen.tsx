"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Textarea } from "@/components/ui";
import { ResolucionMarca } from "@/components/resolucion-marca";
import { ContextoParaChatGPT } from "@/components/contexto-para-chatgpt";
import { RevisionBlueprint } from "@/components/revision-blueprint";
import { tieneEstructuraDeBlueprint } from "@/lib/blueprint-parser";
import { explicarError } from "@/lib/errores";
import type {
  AnalisisBlueprint,
  AnalisisProyectoBlueprint,
  DatosImportacionBlueprint,
  EntidadBiblioteca,
  ProduccionEnCurso,
} from "@/lib/actions";

type Modo = "campo" | "resolucion-marca" | "contexto-chatgpt" | "pegar-resultado";

/**
 * Pantalla "Hoy" (UX Migration 1) — entrada única a Content OS, reemplaza
 * al Dashboard. Un solo campo, una sola pregunta ("¿qué video querés hacer
 * hoy?"). Al confirmar, `tieneEstructuraDeBlueprint()` decide el camino:
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
  produccionesEnCurso,
  onAnalizarProyecto,
  onCrearProyecto,
  onAnalizarBiblioteca,
  onConfirmar,
  onCrearPersonaje,
  onGenerarContexto,
}: {
  proyectos: EntidadBiblioteca[];
  produccionesEnCurso: ProduccionEnCurso[];
  onAnalizarProyecto: (textoCrudo: string) => Promise<AnalisisProyectoBlueprint>;
  onCrearProyecto: (nombre: string) => Promise<{ proyectoId: string }>;
  onAnalizarBiblioteca: (proyectoId: string, textoCrudo: string) => Promise<AnalisisBlueprint>;
  onConfirmar: (
    proyectoId: string,
    textoCrudo: string,
    datos: DatosImportacionBlueprint,
  ) => Promise<{ produccionId: string }>;
  onCrearPersonaje: (proyectoId: string, nombre: string) => Promise<{ id: string }>;
  onGenerarContexto: (proyectoId: string) => Promise<string>;
}) {
  const [texto, setTexto] = useState("");
  const [marcaActivaId, setMarcaActivaId] = useState<string | null>(
    proyectos.length > 0 ? proyectos[proyectos.length - 1].id : null,
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
  const [textoPegado, setTextoPegado] = useState("");
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState("");

  const marcaActiva = proyectos.find((p) => p.id === marcaActivaId) ?? null;

  async function generarContexto(proyectoId: string) {
    setGenerando(true);
    setError("");
    try {
      const contexto = await onGenerarContexto(proyectoId);
      setContextoGenerado(contexto);
      setModo("contexto-chatgpt");
    } catch (e) {
      setError(explicarError(e));
    } finally {
      setGenerando(false);
    }
  }

  async function handleContinuar() {
    if (!texto.trim()) return;
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
    <main className="mx-auto flex min-h-full max-w-[640px] flex-col justify-center px-4 py-10 sm:px-8">
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
            placeholder="Escribí tu idea, o pegá acá tu Creative Blueprint..."
            className="min-h-[160px] text-[14.5px]"
          />
          {error ? <p className="text-[12.5px] text-danger">{error}</p> : null}
          <div className="flex justify-center">
            <Button type="button" onClick={handleContinuar} disabled={generando || !texto.trim()}>
              {generando ? "Un momento…" : "Continuar"}
            </Button>
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
              Analizar Blueprint
            </Button>
          </div>
        </div>
      ) : (
        <ContextoParaChatGPT
          idea={texto.trim()}
          contexto={contextoGenerado}
          onVolver={volverAlCampo}
          onContinuar={irAPegarResultado}
        />
      )}

      {modo === "campo" && produccionesEnCurso.length > 0 ? (
        <div className="mt-10">
          <p className="mb-2.5 text-[12px] font-medium uppercase tracking-wide text-text-muted">Videos en curso</p>
          <div className="space-y-2">
            {produccionesEnCurso.map((p) => (
              <Link
                key={p.id}
                href={`/proyectos/${p.proyectoId}/producciones/${p.id}`}
                className="hover-lift block rounded-xl border border-border bg-surface p-3"
              >
                <p className="text-[13.5px] font-medium text-text">{p.titulo}</p>
                <p className="mt-0.5 text-[12px] text-text-muted">
                  {p.proyectoNombre} · {p.totalEscenas} escena{p.totalEscenas === 1 ? "" : "s"}
                </p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

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
        />
      ) : null}
    </main>
  );
}
