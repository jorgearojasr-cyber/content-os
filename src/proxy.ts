import { NextRequest, NextResponse } from "next/server";

/**
 * Candado simple de contraseña para toda la app — no es un sistema de
 * usuarios, es un portón único compartido (ver alcance explícito de la
 * migración a Postgres/Blob). La cookie no guarda la contraseña en texto
 * plano, sino su hash SHA-256, calculado con Web Crypto (disponible en el
 * runtime de Edge donde corre el middleware — `node:crypto` no lo está).
 */

const COOKIE_NAME = "app_auth";
const MAX_AGE_SEGUNDOS = 60 * 60 * 24 * 30; // 30 días
const CAMPO_FORMULARIO = "clave_acceso";

async function sha256(texto: string): Promise<string> {
  const datos = new TextEncoder().encode(texto);
  const digest = await crypto.subtle.digest("SHA-256", datos);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function paginaLogin(error?: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Content OS — Acceso</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    font-family: system-ui, -apple-system, sans-serif;
    background: #FBFBFD;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    margin: 0;
  }
  form {
    background: #FFFFFF;
    padding: 32px;
    border-radius: 16px;
    box-shadow: 0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04);
    width: 100%;
    max-width: 320px;
  }
  h1 { font-size: 18px; margin: 0 0 16px; color: #1C1C1E; }
  input {
    width: 100%;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid #E5E5EA;
    font-size: 14px;
    margin-bottom: 12px;
  }
  button {
    width: 100%;
    padding: 10px 12px;
    border-radius: 12px;
    border: none;
    background: #B8860B;
    color: #FFFFFF;
    font-size: 14px;
    cursor: pointer;
  }
  p.error { color: #D70015; font-size: 13px; margin: -4px 0 12px; }
</style>
</head>
<body>
<form method="POST">
  <h1>Content OS</h1>
  ${error ? `<p class="error">${error}</p>` : ""}
  <input type="password" name="${CAMPO_FORMULARIO}" placeholder="Contraseña" autofocus required />
  <button type="submit">Entrar</button>
</form>
</body>
</html>`;
}

function respuestaLogin(error?: string): NextResponse {
  return new NextResponse(paginaLogin(error), {
    status: 401,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export async function proxy(request: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) {
    return new NextResponse("Falta configurar APP_PASSWORD en el entorno.", { status: 500 });
  }

  const hashEsperado = await sha256(password);
  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  if (cookie === hashEsperado) {
    return NextResponse.next();
  }

  if (request.method === "POST") {
    let intento = "";
    try {
      const formData = await request.formData();
      intento = String(formData.get(CAMPO_FORMULARIO) ?? "");
    } catch {
      // No fue un envío del formulario de contraseña (ej. una Server Action
      // disparada con una sesión ya expirada) — se trata como no autenticado.
    }

    if (intento && intento === password) {
      const respuesta = NextResponse.redirect(request.url, 303);
      respuesta.cookies.set(COOKIE_NAME, hashEsperado, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: MAX_AGE_SEGUNDOS,
        path: "/",
      });
      return respuesta;
    }

    return respuestaLogin("Contraseña incorrecta.");
  }

  return respuestaLogin();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
