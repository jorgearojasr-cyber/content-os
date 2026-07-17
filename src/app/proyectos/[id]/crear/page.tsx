import Link from "next/link";
import { notFound } from "next/navigation";
import {
  buscarContenidoRelacionado,
  createBloque,
  generarContenidoAction,
  getActivos,
  getAvatares,
  getConocimiento,
  getIdentidad,
  getPersonajes,
  getPersonajesDelEstudio,
  inferirConfiguracionAction,
} from "@/lib/actions";
import { identityHasContent } from "@/lib/identity-compiler";
import { Card, SectionTitle } from "@/components/ui";
import { IdentidadChecklist } from "@/components/identidad-checklist";
import { CrearModos } from "./crear-modos";

export default async function CrearPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: proyectoId } = await params;
  const identidad = await getIdentidad(proyectoId);
  if (!identidad) notFound();

  const activos = await getActivos(proyectoId);
  const conocimiento = await getConocimiento(proyectoId);
  const personajes = await getPersonajes(proyectoId);
  const personajesEstudio = await getPersonajesDelEstudio();
  const avatares = await getAvatares(proyectoId);
  const boundInferir = inferirConfiguracionAction.bind(null, proyectoId);
  const boundGenerar = generarContenidoAction.bind(null, proyectoId);
  const boundCreate = createBloque.bind(null, proyectoId);
  const tieneIdentidad = identityHasContent(identidad, {
    tienePersonaje: personajes.length > 0,
    tieneAvatar: avatares.length > 0,
  });

  return (
    <div className="space-y-5">
      {!tieneIdentidad ? (
        <p className="rounded-xl border border-accent/30 bg-accent-soft px-3.5 py-3 text-[13px] text-text">
          Sin Identidad completa, el contenido será más genérico —{" "}
          <Link href={`/proyectos/${proyectoId}/identidad`} className="font-semibold text-accent underline">
            Completar Identidad
          </Link>
        </p>
      ) : null}

      <CrearModos
        proyectoId={proyectoId}
        identidad={identidad}
        personajes={personajes}
        personajesEstudio={personajesEstudio}
        avatares={avatares}
        tieneConocimiento={conocimiento.length > 0}
        onInferir={boundInferir}
        onGenerar={boundGenerar}
        onGuardar={boundCreate}
        onBuscarRelacionado={buscarContenidoRelacionado}
      />

      <Card>
        <SectionTitle subtitle="Lo que el Compilador de Identidad tiene guardado para este proyecto ahora mismo — esto es lo que la IA usa automáticamente, sin que tengas que volver a seleccionarlo.">
          Identidad activa
        </SectionTitle>
        <IdentidadChecklist
          identidad={identidad}
          activosCount={activos.length}
          tienePersonaje={personajes.length > 0}
          tieneAvatar={avatares.length > 0}
          personaje={personajes[0] ?? null}
          avatar={avatares[0] ?? null}
        />
      </Card>
    </div>
  );
}
