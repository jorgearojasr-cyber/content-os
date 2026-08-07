import { describe, expect, it } from "vitest";
import { parsearCreatorOSPackage } from "./creator-os-package";

function paqueteValido(overrides: Record<string, unknown> = {}) {
  return {
    creatorOSPackage: "1.0",
    packageId: "11111111-1111-1111-1111-111111111111",
    createdBy: { herramienta: "ChatGPT", modelo: "gpt-5", fecha: "2026-08-01T00:00:00Z" },
    produccion: { titulo: "Reel de prueba", formato: "reel", ideaCentral: "Mostrar el producto en acción" },
    escenas: [{ numero: 1, tipo: "gancho", objetivoNarrativo: "Captar atención" }],
    ...overrides,
  };
}

describe("parsearCreatorOSPackage", () => {
  it("acepta un paquete mínimo válido", () => {
    const resultado = parsearCreatorOSPackage(JSON.stringify(paqueteValido()));
    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.paquete.produccion.titulo).toBe("Reel de prueba");
      expect(resultado.paquete.escenas).toHaveLength(1);
    }
  });

  it("rechaza texto vacío", () => {
    expect(parsearCreatorOSPackage("").ok).toBe(false);
    expect(parsearCreatorOSPackage("   ").ok).toBe(false);
  });

  it("rechaza JSON malformado", () => {
    const resultado = parsearCreatorOSPackage("{ esto no es json");
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.error).toMatch(/JSON válido/);
  });

  it("rechaza si falta creatorOSPackage", () => {
    const paquete = paqueteValido();
    delete (paquete as Record<string, unknown>).creatorOSPackage;
    const resultado = parsearCreatorOSPackage(JSON.stringify(paquete));
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.error).toMatch(/creatorOSPackage/);
  });

  it("rechaza una versión MAJOR no soportada", () => {
    const resultado = parsearCreatorOSPackage(JSON.stringify(paqueteValido({ creatorOSPackage: "2.0" })));
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.error).toMatch(/v1\.x/);
  });

  it("acepta un MINOR desconocido dentro del mismo MAJOR", () => {
    const resultado = parsearCreatorOSPackage(JSON.stringify(paqueteValido({ creatorOSPackage: "1.7" })));
    expect(resultado.ok).toBe(true);
  });

  it("rechaza si falta packageId", () => {
    const paquete = paqueteValido();
    delete (paquete as Record<string, unknown>).packageId;
    const resultado = parsearCreatorOSPackage(JSON.stringify(paquete));
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.error).toMatch(/packageId/);
  });

  it("rechaza si falta produccion.titulo", () => {
    const resultado = parsearCreatorOSPackage(
      JSON.stringify(paqueteValido({ produccion: { formato: "reel", ideaCentral: "x" } })),
    );
    expect(resultado.ok).toBe(false);
  });

  it("rechaza un paquete sin escenas", () => {
    const resultado = parsearCreatorOSPackage(JSON.stringify(paqueteValido({ escenas: [] })));
    expect(resultado.ok).toBe(false);
  });

  it("rechaza escenas con numero duplicado", () => {
    const resultado = parsearCreatorOSPackage(
      JSON.stringify(
        paqueteValido({
          escenas: [
            { numero: 1, tipo: "gancho", objetivoNarrativo: "a" },
            { numero: 1, tipo: "cta", objetivoNarrativo: "b" },
          ],
        }),
      ),
    );
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.error).toMatch(/mismo número/);
  });

  it("acepta un valor de tipo de escena desconocido (enum abierto)", () => {
    const resultado = parsearCreatorOSPackage(
      JSON.stringify(paqueteValido({ escenas: [{ numero: 1, tipo: "flashback", objetivoNarrativo: "x" }] })),
    );
    expect(resultado.ok).toBe(true);
  });

  it("tolera campos desconocidos en metadata sin fallar", () => {
    const resultado = parsearCreatorOSPackage(
      JSON.stringify(paqueteValido({ metadata: { idioma: "es", campoFuturo: { anidado: true } } })),
    );
    expect(resultado.ok).toBe(true);
  });

  it("acepta miniatura y publicacion opcionales, y funciona sin ellas", () => {
    const conAmbas = parsearCreatorOSPackage(
      JSON.stringify(
        paqueteValido({
          miniatura: { descripcion: "Portada llamativa" },
          publicacion: { fechaPlanificada: "2026-09-01", plataformas: ["instagram"] },
        }),
      ),
    );
    expect(conAmbas.ok).toBe(true);

    const sinNinguna = parsearCreatorOSPackage(JSON.stringify(paqueteValido()));
    expect(sinNinguna.ok).toBe(true);
    if (sinNinguna.ok) {
      expect(sinNinguna.paquete.miniatura).toBeUndefined();
      expect(sinNinguna.paquete.publicacion).toBeUndefined();
    }
  });

  it("acepta coverImage en produccion, distinto de miniatura", () => {
    const resultado = parsearCreatorOSPackage(
      JSON.stringify(
        paqueteValido({
          produccion: {
            titulo: "Reel",
            formato: "reel",
            ideaCentral: "x",
            coverImage: "https://ejemplo.com/portada.jpg",
          },
        }),
      ),
    );
    expect(resultado.ok).toBe(true);
    if (resultado.ok) expect(resultado.paquete.produccion.coverImage).toBe("https://ejemplo.com/portada.jpg");
  });
});
