/**
 * Traduce un error crudo a un mensaje claro en español para el usuario, y
 * siempre deja el error completo en la consola para depurar. Usarlo en
 * cualquier catch de una llamada a una Server Action desde un componente
 * cliente — evita que el usuario vea cosas como "Failed to fetch".
 */
export function explicarError(e: unknown): string {
  console.error(e);

  if (e instanceof Error) {
    if (e.name === "TypeError" && /fetch/i.test(e.message)) {
      return "No se pudo conectar con el servidor. Revisa tu conexión a internet o que el servidor siga corriendo, e intenta de nuevo.";
    }
    return e.message;
  }

  return "Ocurrió un error inesperado.";
}
