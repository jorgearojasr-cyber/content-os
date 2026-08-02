import { describe, expect, it } from "vitest";
import { agruparPendientes, faltanDecisiones, resolverCampo, type EscenaEnRevision } from "./blueprint-import-shared";
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

describe("agruparPendientes — UX-MIGRATION-5 consolidación por nombre", () => {
  it("el mismo Personaje pendiente en 2+ escenas produce una sola tarjeta, con las ocurrencias contadas", () => {
    const personaje = () => resolverCampo("Don José", []); // sin candidatas -> pendiente
    const escenas: EscenaEnRevision[] = [
      { cbd: cbdVacio, personajes: [personaje()], locacion: null, plano: null },
      { cbd: cbdVacio, personajes: [personaje()], locacion: null, plano: null },
      { cbd: cbdVacio, personajes: [personaje()], locacion: null, plano: null },
    ];
    const pendientes = agruparPendientes(escenas);
    expect(pendientes).toHaveLength(1);
    expect(pendientes[0]).toMatchObject({ tipo: "personaje", ocurrencias: 3 });
    expect(pendientes[0].campo.nombre).toBe("Don José");
  });

  it("agrupa sin importar mayúsculas/tildes — mismo nombre normalizado, una sola tarjeta", () => {
    const escenas: EscenaEnRevision[] = [
      { cbd: cbdVacio, personajes: [], locacion: resolverCampo("Oficina", []), plano: null },
      { cbd: cbdVacio, personajes: [], locacion: resolverCampo("OFICINA", []), plano: null },
      { cbd: cbdVacio, personajes: [], locacion: resolverCampo("oficína", []), plano: null },
    ];
    const pendientes = agruparPendientes(escenas);
    expect(pendientes).toHaveLength(1);
    expect(pendientes[0].ocurrencias).toBe(3);
  });

  it("plano, locación y personajes distintos no se mezclan aunque compartan nombre normalizado", () => {
    const escenas: EscenaEnRevision[] = [
      {
        cbd: cbdVacio,
        personajes: [resolverCampo("Estudio", [])],
        locacion: resolverCampo("Estudio", []),
        plano: resolverCampo("Estudio", []),
      },
    ];
    const pendientes = agruparPendientes(escenas);
    expect(pendientes).toHaveLength(3);
    expect(pendientes.map((p) => p.tipo).sort()).toEqual(["locacion", "personaje", "plano"]);
  });

  it("excluye resueltos, auto-resueltos (4A) y ya decididos — solo lo genuinamente pendiente entra", () => {
    const resuelto = resolverCampo("Oficina", [{ id: "1", nombre: "Oficina" }]); // resuelto: true
    const autoResuelto = resolverCampo("Presentador", [{ id: "1", nombre: "Presentadr" }]); // autoResuelto
    const yaDecidido = resolverCampo("Piso", []);
    if (yaDecidido.resuelto) throw new Error("unreachable");
    const decidido = { ...yaDecidido, decision: null }; // usuario ya eligió "sin vincular"
    const genuinoPendiente = resolverCampo("Cocina", []);

    const escenas: EscenaEnRevision[] = [
      {
        cbd: cbdVacio,
        personajes: [autoResuelto],
        locacion: resuelto,
        plano: decidido,
      },
      {
        cbd: cbdVacio,
        personajes: [genuinoPendiente],
        locacion: null,
        plano: null,
      },
    ];
    const pendientes = agruparPendientes(escenas);
    expect(pendientes).toHaveLength(1);
    expect(pendientes[0].campo.nombre).toBe("Cocina");
  });

  it("lista vacía cuando no queda nada genuinamente pendiente", () => {
    const escenas: EscenaEnRevision[] = [
      {
        cbd: cbdVacio,
        personajes: [resolverCampo("Presentador", [{ id: "1", nombre: "Presentadr" }])],
        locacion: { resuelto: true, id: "loc1", nombre: "Oficina" },
        plano: null,
      },
    ];
    expect(agruparPendientes(escenas)).toEqual([]);
  });
});
