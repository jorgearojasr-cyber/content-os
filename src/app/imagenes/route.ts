import { get } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy autenticado para blobs privados de Vercel Blob. Un `<img>` del
 * navegador no puede mandar el token que exige `access: "private"` — esta
 * ruta lo hace del lado del servidor y transmite el contenido. Queda
 * protegida por el middleware de contraseña como cualquier otra ruta del
 * sitio; además valida que la URL pedida sea realmente un blob de Vercel
 * (no un proxy abierto hacia cualquier URL externa).
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url || !/^https:\/\/[a-z0-9]+\.private\.blob\.vercel-storage\.com\//.test(url)) {
    return NextResponse.json({ error: "URL inválida." }, { status: 400 });
  }

  const resultado = await get(url, {
    access: "private",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  }).catch(() => null);
  if (!resultado?.stream) {
    return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  }

  return new NextResponse(resultado.stream, {
    headers: {
      "content-type": resultado.blob.contentType || "application/octet-stream",
      "cache-control": "private, max-age=3600",
    },
  });
}
