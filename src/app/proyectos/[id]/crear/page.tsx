import Link from "next/link";
import { notFound } from "next/navigation";
import { createBloque, getAvatares, getIdentidad, getPersonajes } from "@/lib/actions";
import { identityHasContent } from "@/lib/identity-compiler";
import { CrearPiezaForm } from "./crear-pieza-form";

export default async function CrearPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: proyectoId } = await params;
  const identidad = await getIdentidad(proyectoId);
  if (!identidad) notFound();

  const [personajes, avatares] = await Promise.all([getPersonajes(proyectoId), getAvatares(proyectoId)]);
  const tieneIdentidad = identityHasContent(identidad, {
    tienePersonaje: personajes.length > 0,
    tieneAvatar: avatares.length > 0,
  });
  const boundCreate = createBloque.bind(null, proyectoId);

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

      <CrearPiezaForm proyectoId={proyectoId} onCreate={boundCreate} />
    </div>
  );
}
