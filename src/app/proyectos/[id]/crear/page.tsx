import Link from "next/link";
import { notFound } from "next/navigation";
import {
  buscarContenidoRelacionado,
  createBloque,
  getActivos,
  getAvatares,
  getBloques,
  getIdentidad,
  getPersonajes,
  getPersonajesDelEstudio,
  revisarEscenaAction,
} from "@/lib/actions";
import { identityHasContent } from "@/lib/identity-compiler";
import { CrearModos } from "./crear-modos";

export default async function CrearPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ idea?: string }>;
}) {
  const { id: proyectoId } = await params;
  // "Convertir en contenido" desde el Banco de Ideas: la idea llega como
  // query param y queda pre-escrita en el Paso 3 — el resto del flujo es
  // el de siempre.
  const { idea: ideaInicial } = await searchParams;
  const identidad = await getIdentidad(proyectoId);
  if (!identidad) notFound();

  const activos = await getActivos(proyectoId);
  const personajes = await getPersonajes(proyectoId);
  const personajesEstudio = await getPersonajesDelEstudio();
  const avatares = await getAvatares(proyectoId);
  const bloquesRecientes = (await getBloques(proyectoId)).slice(0, 3);
  const activosFoto = activos.filter((a) => a.tipo === "foto");
  const activosVisuales = activosFoto.map((a) => ({ etiqueta: a.nombre, url: a.valor }));
  const boundCreate = createBloque.bind(null, proyectoId);
  const boundRevisarEscena = revisarEscenaAction.bind(null, proyectoId);
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
        key={ideaInicial ?? "sin-idea"}
        temaInicial={ideaInicial ?? ""}
        proyectoId={proyectoId}
        identidad={identidad}
        personajes={personajes}
        personajesEstudio={personajesEstudio}
        avatares={avatares}
        activosCount={activosFoto.length}
        activosVisuales={activosVisuales}
        bloquesRecientes={bloquesRecientes}
        onGuardar={boundCreate}
        onBuscarRelacionado={buscarContenidoRelacionado}
        onRevisarEscena={boundRevisarEscena}
      />
    </div>
  );
}
