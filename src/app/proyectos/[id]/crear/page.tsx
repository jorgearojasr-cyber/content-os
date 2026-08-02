import { redirect } from "next/navigation";

// Crear contenido pasó a ser un único flujo desde "Hoy" (UX Migration 1).
// MIGRATION-4C.1: esta ruta deja de mostrar un mensaje muerto y pasa a ser
// un puente real hacia Hoy, preservando la Marca y (si vino de "Convertir
// en contenido" desde Ideas) la idea escrita — antes ese `?idea=` se
// perdía en silencio porque esta pantalla nunca lo leía. `createBloque` y
// `CrearPiezaForm` siguen existiendo como respaldo, sin UI visible acá.
export default async function CrearPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ idea?: string }>;
}) {
  const { id } = await params;
  const { idea } = await searchParams;
  const query = new URLSearchParams({ marca: id });
  if (idea) query.set("idea", idea);
  redirect(`/?${query.toString()}`);
}
