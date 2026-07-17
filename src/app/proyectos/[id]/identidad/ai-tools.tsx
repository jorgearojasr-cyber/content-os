"use client";

import { useState } from "react";
import { Button, Card, Textarea } from "@/components/ui";
import { explicarError } from "@/lib/errores";
import type { IdentidadCompletaSugerida } from "@/lib/ai";

function setCampo(id: string, valor: string) {
  const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null;
  if (el) el.value = valor;
}

function volcarMarcaYEstilo(i: IdentidadCompletaSugerida) {
  setCampo("voz", i.voz);
  setCampo("reglas", i.reglas);
  setCampo("objetivo", i.objetivo);
  setCampo("paleta", i.paleta);
  setCampo("tipografia", i.tipografia);
  setCampo("look", i.look);
  setCampo("camara", i.camara);
  setCampo("ritmo", i.ritmo);
  setCampo("estructuraCta", i.estructuraCta);
}

/**
 * "Completar con IA" a partir de una descripción libre del proyecto:
 * escribe Marca+Estilo directamente en los campos del formulario principal
 * (igual que antes — el usuario revisa y confirma con "Guardar identidad"),
 * y además crea un Personaje y un Avatar nuevos en sus listas respectivas
 * (nunca sobrescribe uno existente). El usuario puede editarlos o
 * eliminarlos como cualquier otra tarjeta después de revisar.
 */
export function IdentidadAiTools({
  onCompletarProyecto,
  onCreatePersonaje,
  onCreateAvatar,
}: {
  onCompletarProyecto: (descripcion: string) => Promise<IdentidadCompletaSugerida>;
  onCreatePersonaje: (formData: FormData) => Promise<{ id: string }>;
  onCreateAvatar: (formData: FormData) => Promise<{ id: string }>;
}) {
  const [abierto, setAbierto] = useState(false);
  const [descripcion, setDescripcion] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  async function completarProyecto() {
    setCargando(true);
    setError("");
    setAviso("");
    try {
      const resultado = await onCompletarProyecto(descripcion);
      volcarMarcaYEstilo(resultado);

      const fdPersonaje = new FormData();
      fdPersonaje.set("nombre", resultado.personajeNombre);
      fdPersonaje.set("personalidad", resultado.personajePersonalidad);
      fdPersonaje.set("fisica", resultado.fisica);
      fdPersonaje.set("vestuario", resultado.vestuario);
      fdPersonaje.set("vozDescrita", resultado.vozDescrita);
      fdPersonaje.set("gestos", resultado.gestos);
      fdPersonaje.set("muletillas", resultado.muletillas);
      await onCreatePersonaje(fdPersonaje);

      const fdAvatar = new FormData();
      fdAvatar.set("nombreFicticio", resultado.avatar.nombreFicticio);
      fdAvatar.set("edad", resultado.avatar.edad);
      fdAvatar.set("profesion", resultado.avatar.profesion);
      fdAvatar.set("nivelConocimiento", resultado.avatar.nivelConocimiento);
      fdAvatar.set("problemasFrecuentes", resultado.avatar.problemasFrecuentes);
      fdAvatar.set("objetivos", resultado.avatar.objetivos);
      fdAvatar.set("miedos", resultado.avatar.miedos);
      fdAvatar.set("queBuscaAprender", resultado.avatar.queBuscaAprender);
      fdAvatar.set("comoConsumeContenido", resultado.avatar.comoConsumeContenido);
      fdAvatar.set("lenguaje", resultado.avatar.lenguaje);
      await onCreateAvatar(fdAvatar);

      setAviso(
        "Listo — revisa Marca y Estilo abajo, y el Personaje y Avatar nuevos en sus listas, antes de guardar.",
      );
      setAbierto(false);
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
        <Button
          type="button"
          className="px-3 py-1.5 text-[12.5px]"
          onClick={() => setAbierto((v) => !v)}
          disabled={cargando}
        >
          ✨ Completar con IA
        </Button>
      </div>

      {abierto ? (
        <div className="mt-3">
          <Textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Ej: OBRABIEN es una comunidad de construcción chilena que busca enseñar de forma simple y cercana. Nuestro personaje principal es Don José Luis, un maestro con más de 30 años de experiencia."
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              className="px-3 py-1.5 text-[12.5px]"
              onClick={() => setAbierto(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="px-3 py-1.5 text-[12.5px]"
              disabled={cargando || !descripcion.trim()}
              onClick={completarProyecto}
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
