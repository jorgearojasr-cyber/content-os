"use client";

import { useState } from "react";
import { Button, Card, Textarea } from "@/components/ui";
import { explicarError } from "@/lib/errores";
import type { IdentidadCompletaSugerida, PersonajeSugerido } from "@/lib/ai";

function setCampo(id: string, valor: string) {
  const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null;
  if (el) el.value = valor;
}

function leerCampo(id: string): string {
  const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null;
  return el?.value ?? "";
}

function volcarPersonaje(p: PersonajeSugerido) {
  setCampo("fisica", p.fisica);
  setCampo("vestuario", p.vestuario);
  setCampo("vozDescrita", p.vozDescrita);
  setCampo("personajePersonalidad", p.personajePersonalidad);
  setCampo("gestos", p.gestos);
  setCampo("muletillas", p.muletillas);
  setCampo("look", p.look);
  setCampo("camara", p.camara);
}

function volcarIdentidadCompleta(i: IdentidadCompletaSugerida) {
  setCampo("voz", i.voz);
  setCampo("reglas", i.reglas);
  setCampo("objetivo", i.objetivo);
  setCampo("avatarNombreFicticio", i.avatar.nombreFicticio);
  setCampo("avatarEdad", i.avatar.edad);
  setCampo("avatarProfesion", i.avatar.profesion);
  setCampo("avatarNivelConocimiento", i.avatar.nivelConocimiento);
  setCampo("avatarProblemasFrecuentes", i.avatar.problemasFrecuentes);
  setCampo("avatarObjetivos", i.avatar.objetivos);
  setCampo("avatarMiedos", i.avatar.miedos);
  setCampo("avatarQueBuscaAprender", i.avatar.queBuscaAprender);
  setCampo("avatarComoConsumeContenido", i.avatar.comoConsumeContenido);
  setCampo("avatarLenguaje", i.avatar.lenguaje);
  setCampo("personajeNombre", i.personajeNombre);
  setCampo("personajePersonalidad", i.personajePersonalidad);
  setCampo("fisica", i.fisica);
  setCampo("vestuario", i.vestuario);
  setCampo("vozDescrita", i.vozDescrita);
  setCampo("gestos", i.gestos);
  setCampo("muletillas", i.muletillas);
  setCampo("paleta", i.paleta);
  setCampo("tipografia", i.tipografia);
  setCampo("look", i.look);
  setCampo("camara", i.camara);
  setCampo("ritmo", i.ritmo);
  setCampo("estructuraCta", i.estructuraCta);
}

type Modo = "personaje" | "proyecto" | null;

export function IdentidadAiTools({
  onGenerarPersonaje,
  onCompletarProyecto,
}: {
  onGenerarPersonaje: (
    descripcion: string,
    contexto?: Partial<PersonajeSugerido>,
  ) => Promise<PersonajeSugerido>;
  onCompletarProyecto: (descripcion: string) => Promise<IdentidadCompletaSugerida>;
}) {
  const [modo, setModo] = useState<Modo>(null);
  const [descripcion, setDescripcion] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  async function generarPersonaje(sugerirRestoDesdeExistente: boolean) {
    setCargando(true);
    setError("");
    setAviso("");
    try {
      const contexto = sugerirRestoDesdeExistente
        ? {
            fisica: leerCampo("fisica"),
            vestuario: leerCampo("vestuario"),
            vozDescrita: leerCampo("vozDescrita"),
            personajePersonalidad: leerCampo("personajePersonalidad"),
            gestos: leerCampo("gestos"),
            muletillas: leerCampo("muletillas"),
            look: leerCampo("look"),
            camara: leerCampo("camara"),
          }
        : undefined;
      const resultado = await onGenerarPersonaje(descripcion, contexto);
      volcarPersonaje(resultado);
      setAviso("Listo — revisa los campos del Personaje y ajusta lo que quieras antes de guardar.");
      setModo(null);
      setDescripcion("");
    } catch (e) {
      setError(explicarError(e));
    } finally {
      setCargando(false);
    }
  }

  async function completarProyecto() {
    setCargando(true);
    setError("");
    setAviso("");
    try {
      const resultado = await onCompletarProyecto(descripcion);
      volcarIdentidadCompleta(resultado);
      setAviso("Listo — revisa toda la identidad y ajusta lo que quieras antes de guardar.");
      setModo(null);
      setDescripcion("");
    } catch (e) {
      setError(explicarError(e));
    } finally {
      setCargando(false);
    }
  }

  return (
    <Card className="border-accent/30 bg-accent-soft/40">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13.5px] text-text">
          Deja que la IA arranque por ti — tú revisas y ajustas antes de guardar.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            className="px-3 py-1.5 text-[12.5px]"
            onClick={() => generarPersonaje(true)}
            disabled={cargando}
          >
            Sugerir el resto del personaje
          </Button>
          <Button
            type="button"
            className="px-3 py-1.5 text-[12.5px]"
            onClick={() => setModo(modo === "personaje" ? null : "personaje")}
            disabled={cargando}
          >
            ✨ Generar personaje
          </Button>
          <Button
            type="button"
            className="px-3 py-1.5 text-[12.5px]"
            onClick={() => setModo(modo === "proyecto" ? null : "proyecto")}
            disabled={cargando}
          >
            ✨ Completar con IA
          </Button>
        </div>
      </div>

      {modo ? (
        <div className="mt-3">
          <Textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder={
              modo === "personaje"
                ? "Ej: Quiero un maestro chileno de aproximadamente 58 años, cercano, con mucha experiencia y que enseñe de forma sencilla."
                : "Ej: OBRABIEN es una comunidad de construcción chilena que busca enseñar de forma simple y cercana. Nuestro personaje principal es Don José Luis, un maestro con más de 30 años de experiencia."
            }
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              className="px-3 py-1.5 text-[12.5px]"
              onClick={() => setModo(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="px-3 py-1.5 text-[12.5px]"
              disabled={cargando || !descripcion.trim()}
              onClick={() => (modo === "personaje" ? generarPersonaje(false) : completarProyecto())}
            >
              {cargando ? "Generando…" : "Generar"}
            </Button>
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-2 text-[12.5px] text-danger">{error}</p> : null}
      {aviso ? <p className="mt-2 text-[12.5px] text-accent">{aviso}</p> : null}
    </Card>
  );
}
