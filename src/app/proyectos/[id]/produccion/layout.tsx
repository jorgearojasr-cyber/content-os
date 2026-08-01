import { ProduccionNav } from "./produccion-nav";

export default async function ProduccionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id: proyectoId } = await params;

  return (
    <div className="space-y-5">
      <ProduccionNav proyectoId={proyectoId} />
      {children}
    </div>
  );
}
