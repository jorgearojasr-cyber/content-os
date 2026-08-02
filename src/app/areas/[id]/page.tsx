import Link from "next/link";
import { notFound } from "next/navigation";
import {
  createDocumentoDeArea,
  deleteArea,
  deleteDocumento,
  getArea,
  getDocumentosDeArea,
  getPersonajes,
  getProyectosDeArea,
  updateArea,
  updateDocumento,
} from "@/lib/actions";
import { Card, SectionTitle } from "@/components/ui";
import { DocumentosLista } from "@/components/documentos-lista";
import { AreaAcciones } from "./area-acciones";

// Lee el Área, sus proyectos y su Conocimiento reales en cada visita.
export const dynamic = "force-dynamic";

export default async function AreaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: areaId } = await params;
  const area = await getArea(areaId);
  if (!area) notFound();

  const [proyectos, documentos, personajes] = await Promise.all([
    getProyectosDeArea(areaId),
    getDocumentosDeArea(areaId),
    getPersonajes(),
  ]);
  const boundCreate = createDocumentoDeArea.bind(null, areaId);
  const boundUpdate = updateArea.bind(null, areaId);
  const boundDelete = deleteArea.bind(null, areaId);

  return (
    <main className="mx-auto max-w-[760px] px-4 py-6 sm:py-8">
      <header className="mb-6 border-b border-border pb-4">
        <div className="font-mono text-[10px] uppercase tracking-[1.5px] text-accent">
          <Link href="/areas" className="hover:text-accent">
            Áreas de Conocimiento
          </Link>
        </div>
        <h1 className="font-display text-2xl font-normal tracking-wide">{area.nombre}</h1>
        {area.descripcion ? <p className="mt-1 text-sm text-text-muted">{area.descripcion}</p> : null}
      </header>

      <AreaAcciones area={area} onUpdate={boundUpdate} onDelete={boundDelete} />

      <Card className="mb-5">
        <SectionTitle subtitle="Proyectos asignados a esta Área.">Proyectos</SectionTitle>
        {proyectos.length === 0 ? (
          <p className="text-[13px] text-text-muted">
            Todavía no hay proyectos en esta Área — asígnalos desde la Configuración de cada
            proyecto.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {proyectos.map((p) => (
              <Link
                key={p.id}
                href={`/proyectos/${p.id}/crear`}
                className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[12.5px] text-text hover:border-accent/50"
              >
                {p.nombre}
              </Link>
            ))}
          </div>
        )}
      </Card>

      <SectionTitle subtitle={`Documentos propios de "${area.nombre}" — disponibles automáticamente para todos sus proyectos, sin subirlos por proyecto.`}>
        Conocimiento del Área
      </SectionTitle>

      <DocumentosLista
        documentos={documentos}
        mostrarChipGlobal={false}
        personajes={personajes.map((p) => ({ id: p.id, nombre: p.nombre }))}
        onCreate={boundCreate}
        onUpdate={updateDocumento}
        onDelete={deleteDocumento}
      />
    </main>
  );
}
