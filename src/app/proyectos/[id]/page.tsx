import { redirect } from "next/navigation";

export default async function ProyectoIndex({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/proyectos/${id}/crear`);
}
