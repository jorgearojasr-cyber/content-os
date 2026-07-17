/**
 * Los blobs de Vercel Blob que sube esta app son `access: "private"`
 * (requieren el token de la app para leerse) — un `<img>` del navegador no
 * puede mandar ese token, así que hay que pasarlos por el proxy
 * autenticado `/imagenes` (protegido por el mismo middleware de
 * contraseña que el resto del sitio, ver `src/middleware.ts`). URLs
 * externas (ej. un enlace pegado a mano en la foto de Personaje) no son
 * nuestras y se dejan tal cual — nunca pasan por este proxy.
 */
export function urlImagenVisible(url: string): string {
  if (!url) return url;
  if (/\.private\.blob\.vercel-storage\.com\//.test(url)) {
    return `/imagenes?url=${encodeURIComponent(url)}`;
  }
  return url;
}
