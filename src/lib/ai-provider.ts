import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

/**
 * CAPA DE PROVEEDOR DE IA
 * ------------------------------------------------------------------
 * Todo lo específico de Anthropic (el SDK, el modelo, el mapeo de errores)
 * vive únicamente aquí. `ai.ts` (las funciones expuestas: generarPersonaje,
 * completarProyecto, generarContenido, inferirConfiguracion, etc.) solo
 * conoce `generarEstructurado()` — no importa `@anthropic-ai/sdk` ni sabe
 * qué modelo se está usando. Agregar otro proveedor en el futuro significa
 * escribir un archivo nuevo con la misma firma, no reescribir ai.ts.
 * ------------------------------------------------------------------
 */

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Falta configurar ANTHROPIC_API_KEY. Crea una cuenta en console.anthropic.com, " +
        "genera una API key y agrégala como variable de entorno (archivo .env.local en " +
        "content-os/) antes de usar las funciones de IA.",
    );
  }
  return new Anthropic({ apiKey });
}

/** Pide una respuesta estructurada (validada contra `schema`) al proveedor
 * de IA activo. Traduce cualquier error del SDK a un mensaje en español
 * entendible por el usuario final.
 *
 * `contextoCacheable` (opcional): texto estable que se repite igual entre
 * llamadas sucesivas (ej. la Identidad compilada de un proyecto — misma
 * Marca/Personaje/Activos para toda una sesión de generación). Va como
 * bloque `system` separado con `cache_control: "ephemeral"` — Anthropic
 * cobra precio de entrada completo la primera vez que aparece ese bloque
 * exacto, y precio reducido (~10%) en cualquier llamada posterior dentro
 * de la ventana de caché (5 min por defecto) que lo repita byte a byte,
 * sin importar qué función la originó. `prompt` sigue siendo el mensaje
 * de usuario normal (la parte que SÍ cambia entre llamadas: tema, opciones,
 * qué escena se está revisando, etc.) — nunca debe ir ahí nada que varíe
 * entre llamadas o el prefijo cacheado dejaría de coincidir. */
export async function generarEstructurado<T>(
  prompt: string,
  schema: z.ZodType<T>,
  maxTokens = 2048,
  contextoCacheable?: string,
): Promise<T> {
  const client = getClient();

  let response;
  try {
    response = await client.messages.parse({
      model: MODEL,
      max_tokens: maxTokens,
      ...(contextoCacheable
        ? {
            system: [
              {
                type: "text" as const,
                text: contextoCacheable,
                cache_control: { type: "ephemeral" as const },
              },
            ],
          }
        : {}),
      messages: [{ role: "user", content: prompt }],
      output_config: { format: zodOutputFormat(schema) },
    });
  } catch (err) {
    console.error(err);
    if (err instanceof Anthropic.AuthenticationError) {
      throw new Error("La API key de Anthropic no es válida. Revisa ANTHROPIC_API_KEY.");
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new Error("Límite de uso de la API de Anthropic alcanzado. Intenta de nuevo en unos minutos.");
    }
    if (err instanceof Anthropic.APIConnectionTimeoutError) {
      throw new Error("Tiempo de espera agotado al contactar a Claude. Intenta de nuevo.");
    }
    if (err instanceof Anthropic.APIConnectionError) {
      throw new Error("No se pudo conectar con la API de Anthropic. Revisa tu conexión a internet.");
    }
    if (err instanceof Anthropic.APIError) {
      throw new Error(`Error de la API de Anthropic: ${err.message}`);
    }
    throw err;
  }

  if (response.stop_reason === "refusal") {
    throw new Error("La IA no pudo generar una respuesta para esa descripción. Intenta reformularla.");
  }
  if (!response.parsed_output) {
    throw new Error("La IA no devolvió una respuesta válida. Intenta de nuevo.");
  }
  return response.parsed_output;
}
