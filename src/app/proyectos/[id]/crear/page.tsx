import Link from "next/link";
import { notFound } from "next/navigation";
import {
  buscarContenidoRelacionado,
  createBloque,
  generarContenidoAction,
  getActivos,
  getAvatares,
  getBloques,
  getIdentidad,
  getPersonajes,
  getPersonajesDelEstudio,
  inferirConfiguracionAction,
} from "@/lib/actions";
import { identityHasContent } from "@/lib/identity-compiler";
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
  const personajes = await getPersonajes(proyectoId);
  const personajesEstudio = await getPersonajesDelEstudio();
  const avatares = await getAvatares(proyectoId);
  const bloquesRecientes = (await getBloques(proyectoId)).slice(0, 3);
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
        activosCount={activos.length}
        bloquesRecientes={bloquesRecientes}
        onInferir={boundInferir}
        onGenerar={boundGenerar}
        onGuardar={boundCreate}
        onBuscarRelacionado={buscarContenidoRelacionado}
      />
    </div>
  );
}
