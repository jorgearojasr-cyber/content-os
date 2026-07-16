import { describe, expect, it } from "vitest";
import {
  contarCoincidencias,
  extraerFragmento,
  extraerPalabrasClave,
  rankearResultados,
  type ResultadoRelacionado,
} from "./reutilizacion";

describe("extraerPalabrasClave", () => {
  it("ignora tildes, mayúsculas y palabras vacías cortas", () => {
    const palabras = extraerPalabrasClave("Cómo impermeabilizar un radier de hormigón");
    expect(palabras).toContain("impermeabilizar");
    expect(palabras).toContain("radier");
    expect(palabras).toContain("hormigon");
    expect(palabras).not.toContain("un");
    expect(palabras).not.toContain("de");
  });

  it("descarta palabras de menos de 4 letras", () => {
    const palabras = extraerPalabrasClave("El PVC va mal ahí");
    expect(palabras).not.toContain("pvc");
    expect(palabras).not.toContain("mal");
  });

  it("un tema sin ninguna palabra clave real devuelve un arreglo vacío", () => {
    expect(extraerPalabrasClave("eso así de lo que")).toEqual([]);
  });

  it("no duplica palabras repetidas", () => {
    const palabras = extraerPalabrasClave("radier radier radier");
    expect(palabras).toEqual(["radier"]);
  });
});

describe("contarCoincidencias", () => {
  it("cuenta coincidencias sin distinguir mayúsculas ni tildes", () => {
    const n = contarCoincidencias("Guía completa de Impermeabilización de Techos", [
      "impermeabilizacion",
      "techos",
    ]);
    expect(n).toBe(2);
  });

  it("devuelve 0 si ninguna palabra clave aparece", () => {
    expect(contarCoincidencias("Receta de pastel de choclo", ["radier", "hormigon"])).toBe(0);
  });
});

describe("extraerFragmento", () => {
  it("no corta textos ya cortos", () => {
    expect(extraerFragmento("Texto corto")).toBe("Texto corto");
  });

  it("recorta y agrega elipsis a textos largos", () => {
    const largo = "a".repeat(200);
    const fragmento = extraerFragmento(largo, 140);
    expect(fragmento.length).toBe(141);
    expect(fragmento.endsWith("…")).toBe(true);
  });

  it("colapsa saltos de línea y espacios repetidos", () => {
    expect(extraerFragmento("Línea uno\n\n  Línea dos")).toBe("Línea uno Línea dos");
  });
});

describe("rankearResultados", () => {
  type Item = { id: string; texto: string };

  function aResultado(item: Item): ResultadoRelacionado {
    return { id: item.id, titulo: item.id, fragmento: item.texto };
  }

  it("descarta items sin ninguna coincidencia", () => {
    const items: Item[] = [
      { id: "a", texto: "Cómo elegir porcelanato" },
      { id: "b", texto: "Receta de pastel de choclo" },
    ];
    const resultados = rankearResultados(items, (i) => i.texto, aResultado, ["porcelanato"], 5);
    expect(resultados.map((r) => r.id)).toEqual(["a"]);
  });

  it("ordena por más coincidencias primero", () => {
    const items: Item[] = [
      { id: "pocas", texto: "Radier" },
      { id: "muchas", texto: "Radier de hormigón, curado del hormigón y compactación del terreno" },
    ];
    const palabras = extraerPalabrasClave("radier hormigon compactacion terreno");
    const resultados = rankearResultados(items, (i) => i.texto, aResultado, palabras, 5);
    expect(resultados[0].id).toBe("muchas");
  });

  it("respeta el límite de resultados por fuente", () => {
    const items: Item[] = Array.from({ length: 10 }, (_, i) => ({ id: `n${i}`, texto: "radier" }));
    const resultados = rankearResultados(items, (i) => i.texto, aResultado, ["radier"], 3);
    expect(resultados).toHaveLength(3);
  });
});
