import { formatearKitTexto, nombreArchivoDesdeTitulo, type KitContenido } from "./exportar-kit";

/**
 * "Exportar PDF" — genera un PDF real y descargable en el navegador, sin
 * backend y sin IA: reutiliza `formatearKitTexto` (el mismo contenido ya
 * generado) y lo pagina con jsPDF (biblioteca cliente, MIT, sin llamadas de
 * red). No es la skill de PDF de este entorno de Claude Code — esa skill
 * genera archivos para ESTA conversación, no una capacidad en tiempo de
 * ejecución de la app desplegada; para que el usuario final descargue un
 * PDF real desde su navegador hace falta una librería que corra ahí, de
 * ahí jsPDF como dependencia nueva (ver reporte de la ronda).
 */
const MARGEN_MM = 18;
const ANCHO_UTIL_MM = 210 - MARGEN_MM * 2; // A4
const ALTO_PAGINA_MM = 297 - MARGEN_MM * 2;
const ALTO_LINEA_MM = 5.2;

export async function descargarKitPdf(kit: KitContenido): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  const texto = formatearKitTexto(kit);
  const lineas = doc.splitTextToSize(texto, ANCHO_UTIL_MM) as string[];

  let y = MARGEN_MM;
  for (const linea of lineas) {
    if (y > MARGEN_MM + ALTO_PAGINA_MM) {
      doc.addPage();
      y = MARGEN_MM;
    }
    // Encabezados en mayúsculas propios de formatearKitTexto (COPY,
    // ESCENAS, HASHTAGS...) resaltados en negrita — sin volver a parsear
    // Markdown, solo el mismo heurístico simple que ya usa el texto plano.
    const esEncabezado = /^[A-ZÁÉÍÓÚÑ ]{3,}$/.test(linea.trim()) && linea.trim().length > 0;
    doc.setFont("helvetica", esEncabezado ? "bold" : "normal");
    doc.text(linea, MARGEN_MM, y);
    y += ALTO_LINEA_MM;
  }

  doc.save(nombreArchivoDesdeTitulo(kit.titulo, "pdf"));
}
