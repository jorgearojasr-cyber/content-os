"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label, SectionTitle, Textarea } from "@/components/ui";
import { EscenasEditor } from "@/components/escenas-editor";
import { IdentidadChecklist } from "@/components/identidad-checklist";
import { PlanEdicionPanel } from "@/components/plan-edicion-panel";
import { ValidadorConsistencia } from "@/components/validador-consistencia";
import { explicarError } from "@/lib/errores";
import {
  esConversionAVideo,
  parsePlanEdicion,
  reemplazarSeccionEscenas,
  type Bloque,
  type CalidadImagen,
  type Escena,
  type Identidad,
  type Personaje,
} from "@/lib/types";
import type { EscenaRevisada, PlanEdicion } from "@/lib/ai";

const DURACION_CONFIRMACION_MS = 2000;

/**
 * Ver/editar un bloque ya guardado cuyo `escenasJson` no es null: reutiliza
 * el mismo EscenasEditor de la pantalla Crear. Al guardar, `texto` se
 * sincroniza reemplazando solo su sección "## Escenas" — el resto (Copy,
 * Hashtags, CTA, etc., si el usuario los edita a mano abajo) queda intacto.
 */
export function EditarBloqueConEscenas({
  bloque,
  escenasIniciales,
  onUpdate,
  onGenerarImagen,
  onGenerarPlanEdicion,
  onRevisarEscena,
  identidad,
  activosCount,
  tienePersonaje,
  tieneAvatar,
  personajesUsados,
}: {
  bloque: Bloque;
  escenasIniciales: Escena[];
  onUpdate: (formData: FormData) => Promise<void>;
  onGenerarImagen: (numeroEscena: number, calidad: CalidadImagen) => Promise<string>;
  onGenerarPlanEdicion: (regenerar: boolean) => Promise<PlanEdicion>;
  onRevisarEscena: (input: {
    escena: { numero: number; descripcion: string; textoEnPantalla: string };
    otrasEscenas: { numero: number; descripcion: string; textoEnPantalla: string }[];
  }) => Promise<EscenaRevisada>;
  identidad: Identidad | null;
  activosCount: number;
  tienePersonaje: boolean;
  tieneAvatar: boolean;
  personajesUsados: Personaje[];
}) {
  const router = useRouter();
  const [titulo, setTitulo] = useState(bloque.titulo);
  const [texto, setTexto] = useState(bloque.texto);
  const [escenas, setEscenas] = useState<Escena[]>(escenasIniciales);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState("");

  function revisarEscena(escena: Escena, otrasEscenas: Escena[]) {
    return onRevisarEscena({
      escena: { numero: escena.numero, descripcion: escena.descripcion, textoEnPantalla: escena.textoEnPantalla },
      otrasEscenas: otrasEscenas.map((e) => ({
        numero: e.numero,
        descripcion: e.descripcion,
        textoEnPantalla: e.textoEnPantalla,
      })),
    });
  }

  async function guardar() {
    if (!titulo.trim()) return;
    setGuardando(true);
    setError("");
    try {
      const fd = new FormData();
      fd.set("titulo", titulo.trim());
      fd.set("formato", bloque.formato);
      fd.set("texto", reemplazarSeccionEscenas(texto, escenas) || "(sin contenido)");
      fd.set("escenasJson", JSON.stringify(escenas));
      await onUpdate(fd);
      router.refresh();
      setGuardado(true);
      setTimeout(() => setGuardado(false), DURACION_CONFIRMACION_MS);
    } catch (e) {
      setError(explicarError(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle subtitle="Ver y editar esta pieza guardada.">{bloque.titulo}</SectionTitle>

        <Label htmlFor="titulo">Título</Label>
        <Input id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} required />

        <Label>Escenas</Label>
        <p className="mb-2 text-[12.5px] text-text-muted">
          Edita cada escena — al guardar, el contenido de abajo se actualiza automáticamente para
          que quede sincronizado.
        </p>
        <EscenasEditor
          escenas={escenas}
          onChange={setEscenas}
          onGenerarImagen={onGenerarImagen}
          onRevisarEscena={revisarEscena}
        />

        <Label htmlFor="texto">Contenido completo</Label>
        <Textarea
          id="texto"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className="min-h-[160px]"
        />

        {error ? <p className="mt-2 text-[12.5px] text-danger">{error}</p> : null}
        <Button type="button" className="mt-4" disabled={guardando} onClick={guardar}>
          {guardando ? "Guardando…" : guardado ? "Guardado ✓" : "Guardar cambios"}
        </Button>
      </Card>

      <PlanEdicionPanel
        tituloBloque={bloque.titulo}
        planInicial={parsePlanEdicion(bloque.planEdicionJson)}
        puedeGenerar={escenasIniciales.length > 0}
        esConversion={esConversionAVideo(escenasIniciales)}
        onGenerar={onGenerarPlanEdicion}
      />

      {bloque.identidadCompilada && identidad ? (
        <Card>
          <SectionTitle subtitle="La identidad que se usó cuando se creó esta pieza — no cambia al editar el texto.">
            Identidad usada en la creación
          </SectionTitle>
          <IdentidadChecklist
            identidad={identidad}
            activosCount={activosCount}
            tienePersonaje={tienePersonaje}
            tieneAvatar={tieneAvatar}
            textoDetalle={bloque.identidadCompilada}
          />
        </Card>
      ) : null}

      {personajesUsados.length > 0 ? (
        <Card>
          <SectionTitle subtitle="Chequeos estructurales, sin IA de visión — ver el alcance en el componente.">
            Validador de consistencia
          </SectionTitle>
          <div className="space-y-2">
            {personajesUsados.map((p) => (
              <div key={p.id}>
                <p className="mb-1 text-[12.5px] font-medium text-text">{p.nombre || "Personaje sin nombre"}</p>
                <ValidadorConsistencia bloque={bloque} personaje={p} />
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
