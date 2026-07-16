/**
 * Contenido estático de ayuda para la pantalla Identidad: un tip breve,
 * un placeholder y 1-3 ejemplos reales por campo. No usa IA — es texto
 * curado a mano, pensado para que completar Identidad se sienta como
 * entrenar a un nuevo integrante del equipo creativo, no como llenar
 * un formulario técnico.
 */
export type CampoEjemplo = {
  tip: string;
  placeholder: string;
  ejemplos: string[];
};

export const EJEMPLOS_IDENTIDAD: Record<string, CampoEjemplo> = {
  voz: {
    tip: "Así habla tu marca siempre, sin importar quién escriba el texto ese día. Piensa en cómo le explicarías algo a un amigo.",
    placeholder: "Ej: directa, cercana, sin tecnicismos",
    ejemplos: [
      "Directa y cálida, como un amigo que sabe del tema",
      "Formal pero cercana, con humor sutil",
      "Enérgica y motivadora, frases cortas",
    ],
  },
  reglas: {
    tip: "Lo que nunca debe hacer o decir el contenido de este proyecto — tus líneas rojas.",
    placeholder: "Ej: nunca prometer resultados garantizados",
    ejemplos: [
      "Nunca prometer resultados garantizados",
      "No usar anglicismos innecesarios",
      "Siempre citar la fuente de los datos",
    ],
  },
  personajeNombre: {
    tip: "Quién aparece frente a cámara o firma el contenido. Si nadie aparece, puedes dejarlo vacío.",
    placeholder: "Ej: Don José Luis / Chef Martín",
    ejemplos: ["Yo (presentador)", "Don José Luis, el maestro"],
  },
  personajePersonalidad: {
    tip: "El carácter del personaje: cómo reacciona, cómo trata a la audiencia, qué lo hace memorable.",
    placeholder: "Ej: paciente, cercano, con humor sencillo",
    ejemplos: [
      "Paciente y cercano, explica con ejemplos simples",
      "Directo, con mucha experiencia, va al grano",
    ],
  },
  fisica: {
    tip: "Descríbelo como si le dieras instrucciones a un fotógrafo que nunca lo ha visto.",
    placeholder: "Ej: hombre de 35 años, cabello corto, complexión atlética",
    ejemplos: [
      "Hombre de 58 años, cabello canoso corto, complexión robusta",
      "Mujer de 32 años, cabello castaño corto con raya al medio",
    ],
  },
  vestuario: {
    tip: "Lo que usa siempre, para que se reconozca de un vistazo en cualquier pieza.",
    placeholder: "Ej: camisa de trabajo azul, siempre con gorra",
    ejemplos: ["Camisa de trabajo azul, siempre con gorra", "Delantal negro con logo bordado"],
  },
  vozDescrita: {
    tip: "Cómo suena, no qué dice — tono, ritmo, volumen.",
    placeholder: "Ej: grave, tono pausado y seguro",
    ejemplos: ["Grave, tono pausado y seguro", "Aguda, ritmo rápido y entusiasta"],
  },
  gestos: {
    tip: "Manierismos físicos que lo distinguen al hablar o moverse.",
    placeholder: "Ej: usa las manos al explicar, mira directo a cámara",
    ejemplos: ["Usa las manos al explicar, mira directo a cámara", "Cruza los brazos al pensar"],
  },
  muletillas: {
    tip: "Frases que repite — dan personalidad y hacen reconocible su forma de hablar.",
    placeholder: "Ej: 'y esto es clave', 'fíjate bien'",
    ejemplos: ["'y esto es clave', 'fíjate bien'", "'como les digo siempre'"],
  },
  paleta: {
    tip: "Los colores que usa cada pieza visual, para que todo se vea de la misma marca.",
    placeholder: "Ej: #1B1F27 (fondo), #C9A24B (acento)",
    ejemplos: ["#1B1F27 (fondo), #C9A24B (acento)", "Blanco, azul marino, dorado"],
  },
  tipografia: {
    tip: "Las fuentes que dan personalidad a títulos y textos.",
    placeholder: "Ej: títulos serif, cuerpo sans moderna",
    ejemplos: ["Títulos serif, cuerpo sans moderna", "Todo en sans bold, sin serifas"],
  },
  look: {
    tip: "La sensación visual general — luz, ambiente, qué se evita.",
    placeholder: "Ej: luz natural cálida, nada de stock genérico",
    ejemplos: ["Luz natural cálida, nada de stock genérico", "Alto contraste, estilo editorial"],
  },
  camara: {
    tip: "Cómo se mueve (o no) la cámara en video.",
    placeholder: "Ej: planos fijos, poco movimiento",
    ejemplos: ["Planos fijos, poco movimiento", "Cámara en mano, dinámica"],
  },
  ritmo: {
    tip: "La velocidad y energía con la que avanza el contenido.",
    placeholder: "Ej: pausado, sin cortes agresivos",
    ejemplos: ["Pausado, sin cortes agresivos", "Rápido, cortes cada 2-3 segundos"],
  },
  estructuraCta: {
    tip: "Cómo cierra cada pieza — el llamado a la acción.",
    placeholder: "Ej: directo, con oferta explícita",
    ejemplos: ["Directo, con oferta explícita", "Suave, invitando a comentar"],
  },
};

export const OBJETIVO_TIP =
  "Qué pretende lograr este proyecto en general — influye en todo el contenido que generes.";

export const OBJETIVOS_SUGERIDOS = [
  "Educar",
  "Posicionar marca",
  "Conseguir clientes",
  "Construir comunidad",
  "Generar confianza",
  "Vender servicios",
  "Difundir conocimiento",
];

export const EJEMPLOS_AVATAR: Record<string, CampoEjemplo> = {
  nombreFicticio: {
    tip: "Un nombre inventado ayuda a pensar en una persona real, no en una estadística.",
    placeholder: "Ej: Marta",
    ejemplos: ["Marta", "Don Carlos"],
  },
  edad: {
    tip: "Rango de edad típico de tu cliente ideal.",
    placeholder: "Ej: 35-45 años",
    ejemplos: ["25-35 años", "45-60 años"],
  },
  profesion: {
    tip: "A qué se dedica.",
    placeholder: "Ej: dueña de un negocio de remodelación",
    ejemplos: ["Dueña de un negocio de remodelación", "Arquitecto junior"],
  },
  nivelConocimiento: {
    tip: "Qué tanto sabe ya del tema — para no explicar de más ni de menos.",
    placeholder: "Ej: principiante, nunca ha remodelado antes",
    ejemplos: ["Principiante, nunca ha remodelado antes", "Intermedio, ya maneja lo básico"],
  },
  problemasFrecuentes: {
    tip: "Lo que le genera fricción o frustración hoy.",
    placeholder: "Ej: no sabe a quién contratar y le da miedo que la estafen",
    ejemplos: ["No sabe a quién contratar y le da miedo que la estafen"],
  },
  objetivos: {
    tip: "Qué quiere lograr esta persona.",
    placeholder: "Ej: remodelar su casa sin sobrepasar el presupuesto",
    ejemplos: ["Remodelar su casa sin sobrepasar el presupuesto"],
  },
  miedos: {
    tip: "Lo que le preocupa o le da inseguridad.",
    placeholder: "Ej: que el proyecto se atrase o cueste más de lo cotizado",
    ejemplos: ["Que el proyecto se atrase o cueste más de lo cotizado"],
  },
  queBuscaAprender: {
    tip: "Qué información busca activamente.",
    placeholder: "Ej: cómo elegir materiales de calidad sin gastar de más",
    ejemplos: ["Cómo elegir materiales de calidad sin gastar de más"],
  },
  comoConsumeContenido: {
    tip: "Dónde y cómo ve contenido — para saber qué formato usar.",
    placeholder: "Ej: videos cortos en Instagram, en la noche",
    ejemplos: ["Videos cortos en Instagram, en la noche"],
  },
  lenguaje: {
    tip: "El nivel de lenguaje que mejor entiende — técnico o simple.",
    placeholder: "Ej: simple, sin tecnicismos de construcción",
    ejemplos: ["Simple, sin tecnicismos de construcción"],
  },
};
