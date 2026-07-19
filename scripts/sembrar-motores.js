// Siembra los 15 Motores de Sistema — contenido redactado a mano, sin IA
// en runtime. Se corre a mano, una vez, después de aplicar la migración
// de motores_ia. Es idempotente: si un Motor de Sistema con ese nombre ya
// existe, lo salta (no lo duplica ni lo pisa).
const { neon } = require("@neondatabase/serverless");
const { randomUUID } = require("node:crypto");

const sql = neon(process.env.DATABASE_URL);

const MOTORES = [
  {
    nombre: "Educativo",
    descripcion: "Explica un concepto de principio a fin, asumiendo que la audiencia no sabe nada del tema.",
    objetivo: "Que la audiencia entienda algo que antes no entendía, con sus propias palabras.",
    cuandoUsar: "Cuando la idea es un concepto, un término técnico o un 'por qué' que tu audiencia no maneja.",
    cuandoNoUsar: "Si la idea ya es un paso a paso concreto (usa Tutorial) o una decisión de compra (usa Venta).",
    tipoContenidoRecomendado: "Video Corto, Carrusel",
    palabrasClave: "qué es, cómo funciona, por qué, significa, explicar, entender, concepto",
    prioridad: 5,
    estructuraNarrativa:
      "1) Pregunta o afirmación que nombra el concepto. 2) Explicación en lenguaje simple, sin tecnicismos sin explicar. 3) Un ejemplo concreto de la vida real. 4) Por qué le importa a la audiencia saber esto.",
    variablesUtilizadas: "IDEA, AUDIENCIA, VOZ, NIVEL_TECNICO",
    promptMaestro:
      "Explica {{IDEA}} como si tu audiencia ({{AUDIENCIA}}) nunca hubiera escuchado el término. Empieza nombrando el concepto sin asumir que lo conocen, sigue con una explicación simple con un ejemplo cotidiano, y cierra con por qué les importa saberlo. Usa la voz de la marca: {{VOZ}}.",
    ejemplo:
      "Idea: 'humedad por capilaridad' → Copy: '¿Sabes por qué las murallas se manchan aunque no llueva? Se llama humedad por capilaridad...' seguido de la explicación simple y el ejemplo de una muralla real.",
    categoria: "Educativo",
  },
  {
    nombre: "Tutorial",
    descripcion: "Pasos concretos y numerados para lograr un resultado específico.",
    objetivo: "Que la audiencia pueda replicar el proceso por su cuenta después de ver la pieza.",
    cuandoUsar: "Cuando la idea es un procedimiento con pasos claros y un resultado verificable.",
    cuandoNoUsar: "Si el tema es abstracto sin pasos concretos (usa Educativo) o es una opinión (usa Opinión Profesional).",
    tipoContenidoRecomendado: "Video Corto, Video Largo, Carrusel",
    palabrasClave: "cómo hacer, paso a paso, tutorial, proceso, instalar, armar, preparar",
    prioridad: 5,
    estructuraNarrativa:
      "1) El resultado final primero (qué van a lograr). 2) Materiales o requisitos previos. 3) Pasos numerados, uno por escena/lámina. 4) Errores comunes a evitar en cada paso, si aplica.",
    variablesUtilizadas: "IDEA, FORMATO, ACTIVOS",
    promptMaestro:
      "Convierte {{IDEA}} en un tutorial de pasos numerados. Muestra primero el resultado final para generar interés, luego lista los materiales o requisitos, y desarrolla cada paso en una escena o lámina separada según el {{FORMATO}}. Si hay un error común en algún paso, adviértelo ahí mismo, no al final.",
    ejemplo:
      "Idea: 'cómo impermeabilizar una terraza' → Escena 1: la terraza terminada y seca bajo lluvia. Escenas 2-6: cada paso del proceso, en orden.",
    categoria: "Educativo",
  },
  {
    nombre: "Comparativa",
    descripcion: "Pone dos o más opciones lado a lado para que la audiencia decida con criterio.",
    objetivo: "Que la audiencia entienda las diferencias reales entre opciones y elija informada.",
    cuandoUsar: "Cuando existen 2-4 alternativas válidas y la audiencia suele confundirlas o no saber cuál elegir.",
    cuandoNoUsar: "Si solo hay una opción razonable, no hay nada que comparar — usa Educativo o Venta.",
    tipoContenidoRecomendado: "Carrusel, Video Corto",
    palabrasClave: "versus, vs, diferencia entre, cuál es mejor, comparar, opciones, alternativas",
    prioridad: 4,
    estructuraNarrativa:
      "1) Nombra las opciones a comparar. 2) Un criterio de comparación por escena/lámina (precio, durabilidad, mantención, etc.), nunca mezclados. 3) Veredicto según el caso de uso, no un 'ganador' absoluto.",
    variablesUtilizadas: "IDEA, OBJETIVO",
    promptMaestro:
      "Compara las opciones de {{IDEA}} punto por punto, un criterio a la vez (nunca mezcles criterios en la misma escena). Sé honesto con los pros y contras reales de cada una — no fuerces un ganador único, cierra diciendo para qué caso de uso conviene cada opción, alineado con {{OBJETIVO}}.",
    ejemplo: "Idea: 'ladrillo vs bloque de hormigón' → una lámina por criterio: costo, aislación térmica, tiempo de obra, mantención.",
    categoria: "Educativo",
  },
  {
    nombre: "Errores Frecuentes",
    descripcion: "Lista errores comunes que la audiencia comete (o podría cometer) y cómo evitarlos.",
    objetivo: "Prevenir un error costoso mostrando la causa y la solución, no solo señalando el error.",
    cuandoUsar: "Cuando conoces errores recurrentes en tu rubro que le cuestan tiempo o dinero a la audiencia.",
    cuandoNoUsar: "Si no hay un error real de por medio (es solo un consejo general), usa Educativo o Checklist.",
    tipoContenidoRecomendado: "Video Corto, Carrusel",
    palabrasClave: "error, errores comunes, no hagas, evita, mal hecho, se equivocan, fallas",
    prioridad: 4,
    estructuraNarrativa:
      "1) Nombra el error tal como se ve en la realidad. 2) Por qué pasa (la causa, no solo el síntoma). 3) La consecuencia concreta si no se corrige. 4) Cómo hacerlo bien en su lugar.",
    variablesUtilizadas: "IDEA, AUDIENCIA",
    promptMaestro:
      "Sobre {{IDEA}}, identifica el error más frecuente que comete {{AUDIENCIA}}: muéstralo tal como se ve en la práctica, explica por qué ocurre (la causa real, no el síntoma), qué consecuencia concreta trae si no se corrige, y cómo se hace correctamente en su lugar.",
    ejemplo:
      "Idea: 'errores al hacer una ampliación' → 'Error: no pedir permiso de edificación antes de construir. Por qué pasa: creen que una ampliación chica no lo necesita. Consecuencia: multa y demolición. Cómo hacerlo bien: ...'",
    categoria: "Educativo",
  },
  {
    nombre: "Checklist",
    descripcion: "Una lista verificable de ítems que la audiencia puede repasar antes de actuar.",
    objetivo: "Dar una herramienta práctica y guardable, no solo información para leer una vez.",
    cuandoUsar: "Cuando hay una lista concreta de cosas a revisar antes de una decisión o acción (comprar, contratar, empezar una obra).",
    cuandoNoUsar: "Si los ítems no son independientes entre sí y necesitan orden estricto, usa Tutorial en su lugar.",
    tipoContenidoRecomendado: "Carrusel, Imagen",
    palabrasClave: "checklist, lista, revisar antes de, qué considerar, no olvides, verificar",
    prioridad: 3,
    estructuraNarrativa:
      "1) El momento/decisión para la que sirve la checklist. 2) Cada ítem en su propia lámina, corto y accionable (empieza con verbo). 3) Cierre invitando a guardar la pieza para revisarla después.",
    variablesUtilizadas: "IDEA, CTA",
    promptMaestro:
      "Convierte {{IDEA}} en una checklist de ítems cortos y accionables (cada uno empieza con un verbo). Explica primero para qué momento sirve esta checklist, desarrolla cada ítem en su propia lámina, y cierra invitando a guardarla con algo como {{CTA}}.",
    ejemplo: "Idea: 'qué revisar antes de contratar una constructora' → 'Pide 3 referencias de obras anteriores' / 'Confirma que tenga seguro de responsabilidad civil' / ...",
    categoria: "Educativo",
  },
  {
    nombre: "Storytelling",
    descripcion: "Cuenta una historia con inicio, tensión y resolución — el mensaje llega a través del relato, no de una lista.",
    objetivo: "Generar conexión emocional y que el mensaje se recuerde por la historia, no por datos sueltos.",
    cuandoUsar: "Cuando hay un personaje, un conflicto real y una resolución — no fuerces una historia donde no la hay.",
    cuandoNoUsar: "Si la idea es puramente informativa sin ningún elemento humano o narrativo, usa Educativo.",
    tipoContenidoRecomendado: "Video Corto, Video Largo",
    palabrasClave: "historia, cuenta, una vez, pasó que, experiencia, viví, nos tocó",
    prioridad: 4,
    estructuraNarrativa:
      "1) Situación inicial (el 'antes'). 2) El problema o tensión que apareció. 3) Qué se hizo para resolverlo. 4) El resultado y el aprendizaje, dicho en una frase memorable.",
    variablesUtilizadas: "IDEA, PERSONAJE, VOZ",
    promptMaestro:
      "Cuenta {{IDEA}} como una historia real, no como una lista de datos. Sigue el arco: situación inicial, el problema que apareció, qué se hizo para resolverlo, y el resultado con el aprendizaje en una frase memorable. Si hay un Personaje ({{PERSONAJE}}) que la protagoniza, que hable con su propia voz. Tono: {{VOZ}}.",
    ejemplo: "Idea: 'la vez que una filtración casi arruina una obra' → historia real de Don José contando qué pasó, cómo lo resolvieron y qué aprendieron.",
    categoria: "Entretenimiento",
  },
  {
    nombre: "Caso Real",
    descripcion: "Muestra un proyecto o cliente real, con datos concretos, como evidencia de que el trabajo funciona.",
    objetivo: "Generar confianza mostrando resultados verificables, no promesas genéricas.",
    cuandoUsar: "Cuando tienes un proyecto terminado, con antes/después o resultados medibles, para respaldar tu trabajo.",
    cuandoNoUsar: "Si no hay un caso concreto y verificable detrás — no inventes datos, usa Educativo o Inspiración en su lugar.",
    tipoContenidoRecomendado: "Carrusel, Video Corto",
    palabrasClave: "caso real, cliente, proyecto, antes y después, resultado, terminamos, entregamos",
    prioridad: 4,
    estructuraNarrativa:
      "1) El punto de partida del proyecto (el problema o el estado inicial). 2) Qué se hizo, con datos concretos (plazos, materiales, decisiones clave). 3) El resultado final, mostrado o descrito con precisión. 4) Un dato que dé credibilidad (tiempo, magnitud, dificultad superada).",
    variablesUtilizadas: "IDEA, ACTIVOS, OBJETIVO",
    promptMaestro:
      "Presenta {{IDEA}} como un caso real y verificable: el punto de partida, qué se hizo con datos concretos (no vagos), el resultado final, y un dato que dé credibilidad real. Evita superlativos sin respaldo — la evidencia es el dato concreto, no el adjetivo. Objetivo de la pieza: {{OBJETIVO}}.",
    ejemplo: "Idea: 'ampliación de una casa en 6 semanas' → punto de partida (casa de 60m²), qué se hizo (segundo piso de 40m² en 6 semanas), resultado (fotos del antes/después), dato de credibilidad (sin atrasos pese a la lluvia de julio).",
    categoria: "Autoridad",
  },
  {
    nombre: "Opinión Profesional",
    descripcion: "Comparte un punto de vista fundado en la experiencia, sin necesidad de un caso o tutorial detrás.",
    objetivo: "Posicionar a la marca/personaje como una voz con criterio propio en su rubro.",
    cuandoUsar: "Cuando hay un tema con más de una postura válida y quieres tomar posición con fundamento.",
    cuandoNoUsar: "Si el tema no admite opinión (es un hecho técnico verificable), usa Educativo.",
    tipoContenidoRecomendado: "Video Corto, Imagen",
    palabrasClave: "opino, creo que, mi opinión, en mi experiencia, no estoy de acuerdo, pienso que",
    prioridad: 3,
    estructuraNarrativa:
      "1) La postura, dicha directamente, sin rodeos. 2) El fundamento basado en experiencia real, no en generalidades. 3) Reconocer honestamente cuándo la otra postura también tiene sentido, si aplica.",
    variablesUtilizadas: "IDEA, VOZ",
    promptMaestro:
      "Sobre {{IDEA}}, toma una postura clara y directa desde la experiencia real (no genérica). Fundaméntala con algo que hayas vivido o visto en el rubro, no con lugares comunes. Si la otra postura también tiene mérito en algún caso, dilo con honestidad — no fuerces una opinión absoluta. Voz: {{VOZ}}.",
    ejemplo: "Idea: '¿vale la pena la autoconstrucción?' → postura directa ('para una ampliación chica sí, para una casa completa no'), fundamentada en casos vistos, reconociendo la excepción.",
    categoria: "Autoridad",
  },
  {
    nombre: "Mitos y Verdades",
    descripcion: "Confronta una creencia popular equivocada con la realidad, formato pregunta-respuesta.",
    objetivo: "Corregir una idea errada instalada en la audiencia, de forma memorable.",
    cuandoUsar: "Cuando existe una creencia popular extendida y equivocada sobre tu rubro.",
    cuandoNoUsar: "Si la creencia popular es correcta, no hay mito que desmentir — usa Educativo para reforzarla en su lugar.",
    tipoContenidoRecomendado: "Carrusel, Video Corto",
    palabrasClave: "mito, falso, verdad, la gente cree, es cierto que, realidad, mentira",
    prioridad: 3,
    estructuraNarrativa:
      "1) El mito, dicho tal como la gente lo repite. 2) 'Mito' o 'Verdad' como veredicto inmediato. 3) La explicación de por qué, con un dato o ejemplo concreto.",
    variablesUtilizadas: "IDEA",
    promptMaestro:
      "Toma la creencia popular sobre {{IDEA}}, dila tal como la gente la repite, da el veredicto inmediato ('Mito' o 'Verdad') y explica por qué con un dato o ejemplo concreto — no te quedes en la afirmación genérica.",
    ejemplo: "Idea: 'el cemento se seca más rápido con sol directo' → 'MITO. El sol directo evapora el agua antes de que el cemento fragüe bien, y eso lo debilita...'",
    categoria: "Educativo",
  },
  {
    nombre: "Viral",
    descripcion: "Prioriza el gancho de los primeros 2 segundos y un formato altamente compartible por sobre la profundidad.",
    objetivo: "Maximizar alcance y compartidos — la profundidad es secundaria a la retención inicial.",
    cuandoUsar: "Cuando el tema tiene un ángulo sorprendente, polémico o muy relatable que puede enganchar de inmediato.",
    cuandoNoUsar: "Si el tema requiere contexto previo para entenderse, no fuerces este ángulo — usa Educativo.",
    tipoContenidoRecomendado: "Video Corto, Historia",
    palabrasClave: "viral, tendencia, no vas a creer, todos hacen esto, reto, challenge",
    prioridad: 2,
    estructuraNarrativa:
      "1) Gancho en los primeros 2 segundos (una afirmación sorprendente o una pregunta directa a cámara). 2) Desarrollo rápido, sin relleno. 3) Cierre con un giro o una línea muy citable.",
    variablesUtilizadas: "IDEA, FORMATO",
    promptMaestro:
      "Convierte {{IDEA}} en una pieza para {{FORMATO}} con gancho inmediato en los primeros 2 segundos (afirmación sorprendente o pregunta directa a cámara), desarrollo rápido sin relleno, y un cierre con una línea muy citable o compartible.",
    ejemplo: "Idea: 'por qué las casas antiguas no se caen con terremotos' → gancho: 'Esta casa tiene 80 años y ha resistido 5 terremotos. Así es como lo hicieron.'",
    categoria: "Entretenimiento",
  },
  {
    nombre: "Inspiración",
    descripcion: "Muestra un resultado deseable para motivar a la audiencia, sin necesariamente enseñar el cómo.",
    objetivo: "Que la audiencia se imagine el resultado y sienta ganas de dar el primer paso.",
    cuandoUsar: "Cuando el objetivo es motivar, no instruir — mostrar el 'qué se puede lograr' antes que el 'cómo'.",
    cuandoNoUsar: "Si la audiencia ya está motivada y necesita información práctica, usa Tutorial o Educativo.",
    tipoContenidoRecomendado: "Imagen, Carrusel, Historia",
    palabrasClave: "inspiración, imagina, ideas para, transforma, antes y después, sueña",
    prioridad: 2,
    estructuraNarrativa:
      "1) El resultado deseable, mostrado o descrito de forma vívida. 2) Una frase que conecte ese resultado con un deseo real de la audiencia. 3) Una invitación suave a dar el primer paso, sin presión de venta.",
    variablesUtilizadas: "IDEA, AUDIENCIA, CTA",
    promptMaestro:
      "Muestra {{IDEA}} como un resultado deseable e inspirador para {{AUDIENCIA}} — describe la escena de forma vívida, conecta con un deseo real (comodidad, orgullo, tranquilidad), y cierra con una invitación suave, sin presión de venta: {{CTA}}.",
    ejemplo: "Idea: 'patio transformado en quincho' → descripción vívida del patio terminado, la sensación de reunir a la familia ahí, invitación suave a cotizar 'cuando quieras dar el paso'.",
    categoria: "Entretenimiento",
  },
  {
    nombre: "Venta",
    descripcion: "Presenta una oferta o servicio con un llamado a la acción claro y un motivo concreto para actuar ahora.",
    objetivo: "Generar una consulta, cotización o compra — es la única estrategia con conversión como meta explícita.",
    cuandoUsar: "Cuando hay una oferta, cupo limitado o servicio concreto que promocionar directamente.",
    cuandoNoUsar: "No abuses de esta estrategia en contenido educativo o de marca — dilúyela con Educativo/Storytelling para no fatigar a la audiencia.",
    tipoContenidoRecomendado: "Imagen, Video Corto",
    palabrasClave: "oferta, promoción, descuento, cotiza, cupos limitados, agenda, compra, contrata",
    prioridad: 3,
    estructuraNarrativa:
      "1) El problema que resuelve el servicio/producto, dicho desde la perspectiva del cliente. 2) La oferta concreta (qué incluye, qué la hace distinta). 3) Un motivo real para actuar ahora (no presión artificial). 4) CTA directo y específico.",
    variablesUtilizadas: "IDEA, CTA, OBJETIVO",
    promptMaestro:
      "Presenta {{IDEA}} como una oferta: parte desde el problema que resuelve para el cliente, describe la oferta concreta (qué incluye, qué la distingue), da un motivo real para actuar ahora (no presión artificial ni urgencia falsa), y cierra con un CTA directo: {{CTA}}. Objetivo: {{OBJETIVO}}.",
    ejemplo: "Idea: 'cotizaciones gratis de octubre' → problema (no sabes cuánto cuesta tu proyecto), oferta (visita y cotización sin costo), motivo real (solo en octubre por baja temporada), CTA ('escríbenos y coordinamos la visita').",
    categoria: "Venta",
  },
  {
    nombre: "FAQ",
    descripcion: "Responde la pregunta más frecuente que recibe la marca, en formato directo pregunta-respuesta.",
    objetivo: "Reducir fricción respondiendo dudas reales antes de que se conviertan en objeciones.",
    cuandoUsar: "Cuando tienes una pregunta que se repite en comentarios, DMs o conversaciones con clientes.",
    cuandoNoUsar: "Si la pregunta no es realmente frecuente (la estás inventando), busca una real primero.",
    tipoContenidoRecomendado: "Video Corto, Imagen",
    palabrasClave: "pregunta frecuente, me preguntan, duda, cuánto cuesta, cuánto se demora, es verdad que",
    prioridad: 3,
    estructuraNarrativa:
      "1) La pregunta, dicha tal como la hacen los clientes. 2) Respuesta directa primero, sin rodeos. 3) El contexto o matiz que la respuesta necesita.",
    variablesUtilizadas: "IDEA, VOZ",
    promptMaestro:
      "Responde la pregunta frecuente sobre {{IDEA}} tal como la haría un cliente real. Da la respuesta directa PRIMERO (sin rodeos ni introducción larga), y después agrega el contexto o matiz que la respuesta necesite. Voz: {{VOZ}}.",
    ejemplo: "Idea: '¿cuánto se demora una ampliación?' → 'Depende del tamaño, pero en promedio 6 a 10 semanas. Esto varía según...' ",
    categoria: "Informativo",
  },
  {
    nombre: "Tendencias",
    descripcion: "Conecta la marca con algo que está pasando ahora en el rubro, dando una lectura propia.",
    objetivo: "Mostrar que la marca está al día y tiene criterio propio sobre lo que está de moda.",
    cuandoUsar: "Cuando hay una tendencia real y verificable en el rubro (material, estilo, tecnología) que vale comentar.",
    cuandoNoUsar: "No inventes una tendencia que no existe — si no hay una real y verificable, usa otra estrategia.",
    tipoContenidoRecomendado: "Video Corto, Carrusel",
    palabrasClave: "tendencia, de moda, lo nuevo, está pegando, todos están usando, este año",
    prioridad: 2,
    estructuraNarrativa:
      "1) Nombra la tendencia y de dónde viene. 2) Por qué está pasando ahora (el motivo real, no solo 'porque sí'). 3) La lectura propia de la marca: ¿vale la pena sumarse o es una moda pasajera?",
    variablesUtilizadas: "IDEA, VOZ, OBJETIVO",
    promptMaestro:
      "Comenta la tendencia sobre {{IDEA}}: nómbrala y explica de dónde viene, por qué está pasando ahora (el motivo real), y da la lectura propia de la marca sobre si vale la pena sumarse o es pasajera. Voz: {{VOZ}}.",
    ejemplo: "Idea: 'auge de las casas prefabricadas' → qué es, por qué creció (tiempos de construcción más cortos), lectura propia (para qué casos conviene y para cuáles no).",
    categoria: "Informativo",
  },
  {
    nombre: "Noticias",
    descripcion: "Informa un hecho concreto y reciente relevante para la audiencia, con la interpretación de la marca.",
    objetivo: "Mantener a la audiencia informada de algo que le afecta directamente, con criterio propio.",
    cuandoUsar: "Cuando hay un hecho verificable y reciente (cambio normativo, evento del rubro) que afecta a tu audiencia.",
    cuandoNoUsar: "No presentes una opinión o especulación como si fuera un hecho — verifica antes de publicar.",
    tipoContenidoRecomendado: "Video Corto, Imagen",
    palabrasClave: "noticia, nueva ley, cambio normativo, se anunció, desde este mes, ahora es obligatorio",
    prioridad: 2,
    estructuraNarrativa:
      "1) El hecho, dicho de forma clara y verificable (qué pasó, desde cuándo). 2) Qué significa en la práctica para la audiencia. 3) La interpretación o recomendación de la marca frente a esto.",
    variablesUtilizadas: "IDEA, AUDIENCIA, OBJETIVO",
    promptMaestro:
      "Informa el hecho sobre {{IDEA}} de forma clara y verificable (qué pasó, desde cuándo), explica qué significa en la práctica para {{AUDIENCIA}}, y cierra con la interpretación o recomendación de la marca. Objetivo: {{OBJETIVO}}.",
    ejemplo: "Idea: 'nueva normativa de eficiencia energética' → el hecho (entra en vigencia desde marzo), qué significa (aislación obligatoria en construcciones nuevas), recomendación (planifícalo desde el diseño, no al final).",
    categoria: "Informativo",
  },
];

(async () => {
  const existentes = await sql`SELECT nombre FROM motores_ia WHERE origen = 'sistema'`;
  const nombresExistentes = new Set(existentes.map((r) => r.nombre));

  let creados = 0;
  for (const m of MOTORES) {
    if (nombresExistentes.has(m.nombre)) {
      console.log(`Ya existe, se salta: ${m.nombre}`);
      continue;
    }
    await sql`
      INSERT INTO motores_ia (
        id, proyecto_id, nombre, descripcion, objetivo, cuando_usar, cuando_no_usar,
        tipo_contenido_recomendado, palabras_clave, prioridad, estructura_narrativa,
        variables_utilizadas, prompt_maestro, ejemplo, notas_internas, estado, categoria,
        version, origen, motor_original_id
      ) VALUES (
        ${randomUUID()}, NULL, ${m.nombre}, ${m.descripcion}, ${m.objetivo}, ${m.cuandoUsar}, ${m.cuandoNoUsar},
        ${m.tipoContenidoRecomendado}, ${m.palabrasClave}, ${m.prioridad}, ${m.estructuraNarrativa},
        ${m.variablesUtilizadas}, ${m.promptMaestro}, ${m.ejemplo}, '', 'activo', ${m.categoria},
        1, 'sistema', NULL
      )
    `;
    creados++;
    console.log(`Creado: ${m.nombre}`);
  }
  console.log(`\n${creados} Motores de Sistema creados (${MOTORES.length - creados} ya existían).`);
})();
