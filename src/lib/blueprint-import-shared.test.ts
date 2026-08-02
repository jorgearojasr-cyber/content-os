import { describe, expect, it } from "vitest";
import { faltanDecisiones, resolverCampo, type EscenaEnRevision } from "./blueprint-import-shared";
import type { EscenaCBD } from "./blueprint-parser";

const cbdVacio: EscenaCBD = {
  numeroEtiqueta: 1,
  tipo: "GANCHO",
  objetivoNarrativo: "Objetivo de prueba",
  duracionEstimada: null,
  emocion: "",
  resultadoEsperado: "",
  personajes: [],
  locacion: "",
  plano: "",
  movimientoCamara: "",
  textoHablado: "",
  textoPantalla: "",
  recursosNecesarios: "",
  promptImagen: "",
  promptVideo: "",
  musica: "",
  transicion: "",
  notas: "",
};

describe("resolverCampo — UX-MIGRATION-4A automatización primero", () => {
  it("coincidencia exacta única sigue resolviéndose sola (sin cambios respecto de antes)", () => {
    const campo = resolverCampo("Oficina", [{ id: "1", nombre: "Oficina" }]);
    expect(campo).toEqual({ resuelto: true, id: "1", nombre: "Oficina" });
  });

  it("coincidencia exacta con 2+ entradas queda pendiente, con motivo y sin autoResuelto", () => {
    const campo = resolverCampo("Oficina", [
      { id: "1", nombre: "Oficina" },
      { id: "2", nombre: "oficina" },
    ]);
    expect(campo.resuelto).toBe(false);
    if (campo.resuelto) throw new Error("unreachable");
    expect(campo.autoResuelto).toBe(false);
    expect(campo.decision).toBeUndefined();
    expect(campo.candidatos).toHaveLength(2);
    expect(campo.motivo).toContain("2 entradas");
  });

  it("una única sugerencia fuerte (>=85%) sin competencia se autovincula sola", () => {
    // "presentador" (11) vs "presentadr" (10, falta una letra): distancia 1,
    // similitud = 1 - 1/11 ≈ 0.909 — cruza el umbral fuerte (0.85) sola.
    const campo = resolverCampo("Presentador", [{ id: "1", nombre: "Presentadr" }]);
    expect(campo.resuelto).toBe(false);
    if (campo.resuelto) throw new Error("unreachable");
    expect(campo.autoResuelto).toBe(true);
    expect(campo.decision).toBe("1");
    expect(campo.recomendacion?.id).toBe("1");
    expect(campo.motivo).toContain("lo vinculé sola");
  });

  it("dos sugerencias fuertes reñidas no se autovinculan — sigue siendo una decisión real, con recomendación", () => {
    const campo = resolverCampo("Presentador", [
      { id: "a", nombre: "Presentadora" }, // 12 vs 11, distancia 1 -> sim ≈ 0.917
      { id: "b", nombre: "Presemtador" }, // 11 vs 11, distancia 1 -> sim ≈ 0.909
    ]);
    expect(campo.resuelto).toBe(false);
    if (campo.resuelto) throw new Error("unreachable");
    expect(campo.autoResuelto).toBe(false);
    expect(campo.decision).toBeUndefined();
    expect(campo.recomendacion?.id).toBe("a");
    expect(campo.motivo).toContain("más de una opción");
  });

  it("una sugerencia débil (entre 60% y 85%) queda pendiente pero con recomendación tentativa", () => {
    // "presentador" (11) vs "presentadxx" (11, 2 sustituciones): sim ≈ 0.818
    const campo = resolverCampo("Presentador", [{ id: "1", nombre: "Presentadxx" }]);
    expect(campo.resuelto).toBe(false);
    if (campo.resuelto) throw new Error("unreachable");
    expect(campo.autoResuelto).toBe(false);
    expect(campo.decision).toBeUndefined();
    expect(campo.recomendacion?.id).toBe("1");
    expect(campo.recomendacion?.similitud).toBeLessThan(0.85);
    expect(campo.motivo).toContain("no estoy segura");
  });

  it("sin ninguna candidata parecida, queda pendiente sin recomendación", () => {
    const campo = resolverCampo("Presentador", []);
    expect(campo.resuelto).toBe(false);
    if (campo.resuelto) throw new Error("unreachable");
    expect(campo.autoResuelto).toBe(false);
    expect(campo.decision).toBeUndefined();
    expect(campo.recomendacion).toBeUndefined();
    expect(campo.motivo).toContain("No encontré nada parecido");
  });
});

describe("faltanDecisiones — auto-resueltos y decisiones explícitas nunca bloquean", () => {
  it("false cuando todos los campos están resueltos o auto-resueltos", () => {
    const escenas: EscenaEnRevision[] = [
      {
        cbd: cbdVacio,
        personajes: [resolverCampo("Presentador", [{ id: "1", nombre: "Presentadr" }])], // auto-resuelto
        locacion: { resuelto: true, id: "loc1", nombre: "Oficina" },
        plano: null,
      },
    ];
    expect(faltanDecisiones(escenas)).toBe(false);
  });

  it("true cuando queda un campo genuinamente pendiente", () => {
    const escenas: EscenaEnRevision[] = [
      {
        cbd: cbdVacio,
        personajes: [],
        locacion: resolverCampo("Oficina", []), // sin candidatas, decision undefined
        plano: null,
      },
    ];
    expect(faltanDecisiones(escenas)).toBe(true);
  });

  it("false cuando el usuario ya decidió explícitamente dejar el campo sin vincular (decision: null)", () => {
    const pendiente = resolverCampo("Oficina", []);
    if (pendiente.resuelto) throw new Error("unreachable");
    const escenas: EscenaEnRevision[] = [
      {
        cbd: cbdVacio,
        personajes: [],
        locacion: { ...pendiente, decision: null },
        plano: null,
      },
    ];
    expect(faltanDecisiones(escenas)).toBe(false);
  });
});
