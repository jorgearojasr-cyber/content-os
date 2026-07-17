import { notFound } from "next/navigation";
import {
  generarImagenParaEscena,
  getActivos,
  getAvatares,
  getBloque,
  getIdentidad,
  getPersonajes,
  updateBloque,
} from "@/lib/actions";
import { Card, Input, Label, SectionTitle, Textarea } from "@/components/ui";
import { BotonGuardar } from "@/components/boton-guardar";
import { IdentidadChecklist } from "@/components/identidad-checklist";
import { FORMATOS_CONTENIDO, parseEscenas } from "@/lib/types";
import { EditarBloqueConEscenas } from "./editar-bloque-escenas";

export default async function EditarBloquePage({
  params,
}: {
  params: Promise<{ id: string; bloqueId: string }>;
}) {
  const { id: proyectoId, bloqueId } = await params;
  const bloque = await getBloque(proyectoId, bloqueId);
  if (!bloque) notFound();

  const identidad = await getIdentidad(proyectoId);
  const activos = await getActivos(proyectoId);
  const personajes = await getPersonajes(proyectoId);
  const avatares = await getAvatares(proyectoId);
  const boundUpdate = updateBloque.bind(null, proyectoId, bloqueId);
  const boundGenerarImagen = generarImagenParaEscena.bind(null, proyectoId, bloqueId);

  if (bloque.escenasJson !== null) {
    const escenas = parseEscenas(bloque.escenasJson);
    return (
      <EditarBloqueConEscenas
        bloque={bloque}
        escenasIniciales={escenas}
        onUpdate={boundUpdate}
        onGenerarImagen={boundGenerarImagen}
        identidad={identidad}
        activosCount={activos.length}
        tienePersonaje={personajes.length > 0}
        tieneAvatar={avatares.length > 0}
      />
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle subtitle="Ver y editar esta pieza guardada.">{bloque.titulo}</SectionTitle>

        <form action={boundUpdate} className="space-y-0">
          <Label htmlFor="titulo">Título</Label>
          <Input id="titulo" name="titulo" defaultValue={bloque.titulo} required />

          <Label htmlFor="formato">Formato</Label>
          <select
            id="formato"
            name="formato"
            defaultValue={bloque.formato}
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-[14.5px] text-text"
          >
            {FORMATOS_CONTENIDO.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>

          <Label htmlFor="texto">Contenido</Label>
          <Textarea
            id="texto"
            name="texto"
            defaultValue={bloque.texto}
            className="min-h-[160px]"
            required
          />

          <BotonGuardar texto="Guardar cambios" className="mt-4" />
        </form>
      </Card>

      {bloque.identidadCompilada && identidad ? (
        <Card>
          <SectionTitle subtitle="La identidad que se usó cuando se creó esta pieza — no cambia al editar el texto.">
            Identidad usada en la creación
          </SectionTitle>
          <IdentidadChecklist
            identidad={identidad}
            activosCount={activos.length}
            tienePersonaje={personajes.length > 0}
            tieneAvatar={avatares.length > 0}
            textoDetalle={bloque.identidadCompilada}
          />
        </Card>
      ) : null}
    </div>
  );
}
