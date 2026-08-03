import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduccion } from "@/lib/actions";
import { ProduccionNav } from "./produccion-nav";

export default async function ProduccionDetalleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string; produccionId: string }>;
}) {
  const { id: proyectoId, produccionId } = await params;
  const produccion = await getProduccion(produccionId);
  if (!produccion || produccion.proyectoId !== proyectoId) notFound();

  return (
    <div className="space-y-5">
      <div>
        <Link
          href={`/producciones?proyecto=${proyectoId}`}
          className="font-mono text-[10px] uppercase tracking-[1.5px] text-text-muted hover:text-accent"
        >
          ← Todas las producciones
        </Link>
        <h2 className="mt-1 font-display text-xl font-normal tracking-wide">{produccion.titulo}</h2>
      </div>

      <ProduccionNav proyectoId={proyectoId} produccionId={produccionId} />
      {children}
    </div>
  );
}
