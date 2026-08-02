import { describe, expect, it } from "vitest";
import { recomendacionBaseParaPlano } from "./recomendaciones-audiovisuales";

describe("recomendacionBaseParaPlano — Nivel 1 UX-PREP-4B.1 (sin IA)", () => {
  it("devuelve la recomendación para un Plano conocido", () => {
    expect(recomendacionBaseParaPlano("Primer plano")).toBe(
      "Ideal para transmitir cercanía y conectar con la expresión.",
    );
  });

  it("es insensible a mayúsculas y tildes, igual que la resolución de Revisión", () => {
    expect(recomendacionBaseParaPlano("PRIMER PLANO")).toBe(recomendacionBaseParaPlano("primer plano"));
    expect(recomendacionBaseParaPlano("Plano Cenital")).toBe(recomendacionBaseParaPlano("plano cenital"));
  });

  it("cubre los Planos reales usados en la Biblioteca del Estudio hoy", () => {
    for (const nombre of ["Plano caminando", "Plano cenital", "Plano detalle", "Plano lateral", "Primer plano"]) {
      expect(recomendacionBaseParaPlano(nombre)).not.toBeNull();
    }
  });

  it("devuelve null para un Plano que no está en la base de conocimiento, sin inventar nada genérico", () => {
    expect(recomendacionBaseParaPlano("Plano inventado que no existe")).toBeNull();
  });

  it("devuelve null para un nombre vacío", () => {
    expect(recomendacionBaseParaPlano("")).toBeNull();
  });

  it("nunca devuelve un string vacío como recomendación", () => {
    expect(recomendacionBaseParaPlano("Contrapicado")).not.toBe("");
  });
});
