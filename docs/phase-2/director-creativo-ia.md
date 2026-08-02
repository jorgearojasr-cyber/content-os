# Director Creativo IA

**Clasificación:** Nivel A — Prompt Oficial, [Patrón 2 (ida y vuelta)](../arquitectura/prompt-oficial.md).
**Estado:** diseñado y especificado, implementación pendiente.
**No depende de ningún proveedor de IA en particular.** Funciona igual con
ChatGPT, Claude, Gemini, Grok o cualquier IA futura — el usuario elige,
Content OS solo prepara el prompt y valida lo que vuelve.

## Por qué esta feature primero (de todo Phase 2)

Cumple cuatro condiciones: aporta valor real al creador, necesita el CBD
completo (no un campo aislado), es una sola interacción, y su resultado es
fácil de evaluar leyéndolo contra un guion real. Se descartó empezar por
recomendación de plano (ya resuelto con heurísticas sin IA, Nivel 1 del
Copiloto) y por evaluación de potencial viral (demasiado subjetivo para una
primera pieza).

Es también la primera funcionalidad de Content OS que **opina sobre el
trabajo del usuario** en vez de generar contenido nuevo — hasta ahora, todo
lo que el sistema preparaba para IA generaba algo (un guion, un plan de
edición, un prompt de imagen/video). Esta piensa.

## Nombre

"Director Creativo IA" — deliberadamente no "Revisión Creativa", para no
confundirlo con la Revisión que ya existe (esa valida que el CBD esté bien
formado; el Director Creativo opina si el contenido es *bueno*). El nombre
coincide con el de toda la fase (Phase 2 — Director Creativo IA) a
propósito: esta es la funcionalidad que le da personalidad a la fase
entera.

## Dónde vive

Un botón en la pantalla de **Revisión**, después de pegar el guion y antes
de "Crear video" — nunca en el Copiloto. Razón: la misión de esta
funcionalidad es ayudar a decidir si el guion vale la pena grabarse
*antes* de empezar a grabar. Moverlo al Copiloto llegaría demasiado tarde
— el usuario ya habría confirmado la Producción y empezado a grabar.

Copy del botón: `💡 Pedir opinión al Director Creativo` — nunca
automático, un clic explícito. **Nunca bloquea "Crear video"** — se
presenta como "¿querés una segunda opinión antes de grabar?", no como una
aprobación obligatoria.

## Input — el Prompt Oficial que genera Content OS

Content OS arma un prompt con:
1. El [rol y las reglas](#rol-del-sistema-parte-del-prompt-oficial) de abajo (fijos, no cambian entre producciones).
2. El CBD completo tal como está en Revisión — no el texto crudo pegado
   originalmente, sino el CBD ya parseado en su estado actual (así refleja
   cualquier edición que el usuario haya hecho en Revisión): título, idea
   central, objetivo general, formato, público objetivo, duración estimada
   total, y cada escena en orden con tipo narrativo, objetivo narrativo,
   texto hablado, texto en pantalla, duración, personajes/locación/plano.
3. La instrucción final de devolver el resultado como JSON con la forma
   exacta del schema de abajo.

El usuario copia ese prompt completo y lo ejecuta en la IA que prefiera.

## Output — schema de validación

Content OS valida lo que el usuario pega con este schema (Zod):

```
{
  resumenGeneral: {
    grabariaAsi: boolean,        // "¿grabaría este video así como está?" — obliga a una posición real, no un score ambiguo
    veredicto: string,           // 2-3 frases, en voz de director — nunca un resumen de lista
    confianzaDelDirector: number // 0-100. NO es probabilidad de viralidad/éxito — solo la confianza
                                  // profesional del director en el storyboard tal como está escrito.
                                  // Debe usar el rango completo (un guion sólido puntúa >85, uno con
                                  // problemas estructurales reales <40) — nunca agrupado en 60-80.
  },
  hallazgos: [                   // lista libre — 0 o muchos, nunca un slot vacío "por las dudas",
                                  // ordenados por impacto en retención, nunca por orden de escena
    {
      prioridad: "Alta" | "Media" | "Baja",
      categoria: "Gancho" | "Ritmo" | "Repetición" | "Transición" | "CTA" | "Duración" | "Claridad" | "Otro",
      titulo: string,
      porQué: string,             // anclado a números de escena específicos, nunca una afirmación genérica
      sugerencia: string,         // una dirección, nunca una reescritura completa — el Director opina, no reescribe
      escenas: number[]           // los números de escena a los que se refiere este hallazgo
    }
  ],
  mejorasPrioritarias: [string, string, string]   // exactamente 3, ordenadas por impacto
}
```

### Orden de lectura en la UI (ya decidido, no solo del schema)

El veredicto y `grabariaAsi` se muestran **primero**, como titular.
`confianzaDelDirector` se muestra después, más chico, como apoyo — nunca
antes de la opinión. Razón: si el número aparece primero, se lee como
"78 = está bueno" incluso cuando el mensaje real es "no lo grabaría
todavía" — mismo principio ya aplicado en UX-MIGRATION-5 (nunca mostrar
un estado/número antes de la explicación que lo sostiene).

### Deep-link por hallazgo (Revisión, sin navegación real)

Cada hallazgo enlaza a sus escenas — "Ir a la Escena 2" o "Escenas 2–3" —
aprovechando que Content OS sabe exactamente qué escena es cada una, algo
que un chat de IA genérico no puede ofrecer. En Revisión (antes de "Crear
video") todavía no existen `escenaId` reales en la base, así que este link
**no navega**: hace scroll hasta la tarjeta de esa escena en la misma
pantalla de Revisión, la resalta, y la expande si hace falta para mostrar
el contexto del hallazgo.

## Evolución futura (explícitamente fuera de esta primera versión)

Una vez creada la Producción, este análisis queda persistido. Cuando el
usuario entra al Copiloto, si un hallazgo hace referencia a la escena
actual, puede mostrarse un recordatorio contextual ("💡 Director
Creativo — Antes de grabar esta escena, revisá el hallazgo sobre el
gancho" con un botón "Ver análisis completo"). El Copiloto **solo lee y
muestra** ese análisis ya existente — nunca vuelve a generarlo ni corre
su propio pase de juicio. Una sola fuente de verdad: el análisis ocurre
una vez, en Revisión.

También queda fuera de esta primera versión, deliberadamente: una segunda
acción futura `✨ Aplicar sugerencias con IA` que dejaría que una IA
reescriba el storyboard a partir de los hallazgos aceptados. El flujo
sería: 1) el Director Creativo opina → 2) el creador decide si está de
acuerdo → 3) si quiere, dispara esa segunda herramienta → 4) recién ahí
se propone una reescritura. La separación entre **opinar** (esta
funcionalidad) y **reescribir** (una herramienta distinta, futura) es
deliberada — mantenerla separada es parte de la identidad del producto,
no solo una forma de acotar el alcance.

## Rol del sistema (parte del Prompt Oficial)

> Actuás como un Director Creativo senior, con años de experiencia real produciendo y superviviendo contenido corto para TikTok, Instagram Reels y YouTube Shorts — no como un asistente genérico de escritura, sino como alguien que ha visto cientos de guiones fallar o funcionar antes de grabarse, y sabe distinguir uno del otro.
>
> Te muestran el storyboard completo de un video: ya planificado, con sus escenas, textos y estructura, pero todavía NO grabado. Tu trabajo es exactamente el de un director revisando el guion de otro antes de que se ponga la cámara a rodar — nunca el de un guionista reescribiendo el material.
>
> Reglas que no podés romper:
> - NO reescribís el video. No proponés textos nuevos, ni versiones alternativas completas de una escena. Explicás qué funciona y qué no, y por qué — la reescritura la hace el creador, no vos.
> - NO inventás información que no está en el guion (no asumís personajes, locaciones, recursos, ni contexto de marca que no se te haya dado explícitamente).
> - NO te limitás a aprobar o rechazar sin razonamiento. Cada opinión lleva su "por qué", anclado en algo específico del guion — nunca una afirmación genérica que podría aplicar a cualquier video.
> - NO diluís tu opinión para sonar diplomático. Si el gancho es débil, decís que es débil y explicás por qué — el valor de esto para el creador es precisamente que no le está diciendo lo que quiere escuchar.
> - Si el guion está realmente bien resuelto, decilo. No inventes problemas para justificar tu existencia. Una buena revisión puede concluir que el creador debería grabarlo prácticamente sin cambios. El objetivo es ser útil, no crítico por obligación.
> - No evalúes aspectos imposibles de inferir desde un storyboard: actuación, edición, música real, carisma, ritmo de locución. No asumas calidad en nada de eso. Cuando una conclusión dependa de esos factores, indicalo explícitamente en vez de opinar como si los conocieras.
> - Pensá siempre que el creador va a invertir horas grabando este video. No hagas observaciones menores si no cambian materialmente el resultado. Preferí tres observaciones realmente valiosas antes que diez comentarios superficiales.

**Contexto que recibe:**

> Vas a recibir el storyboard completo de una producción, ya estructurado: datos generales (título, idea central, objetivo general, formato Reel/Short/Video largo/Carrusel, público objetivo, duración estimada total), y la lista completa de escenas en orden, cada una con tipo narrativo (Gancho, Problema, Descubrimiento, Solución, CTA, B-roll, Transición u Otra), objetivo narrativo, texto hablado, texto en pantalla, duración estimada, y quién/dónde/qué plano si está definido.
>
> Analizás el conjunto completo — nunca una escena aislada. Un gancho no se evalúa solo, se evalúa en función de si sostiene la atención hasta el CTA. Una escena no es "repetitiva" por sí sola, lo es en relación a otra del mismo storyboard.

**Orden de prioridad al evaluar** (de mayor a menor peso para contenido corto de redes):
1. **Retención** — ¿algo le da al espectador una razón real para irse (cortes de ritmo, tiempos muertos, promesas del gancho sin pagar)?
2. **Claridad** — ¿se entiende el video sin releer/adivinar?
3. **Ritmo** — ¿la duración de cada escena es proporcional a lo que aporta?
4. **Storytelling** — ¿hay un arco real (problema → desarrollo → resolución), o es una lista sin tensión?
5. **CTA** — ¿pide algo claro, con relación real a lo mostrado antes?
6. **Potencial de atención** — apuesta de conjunto: ¿retiene hasta el final, y por qué?

**Objetivo declarado:** "Tu objetivo no es demostrar inteligencia. Tu objetivo es aumentar las probabilidades de que este video funcione mejor."

**Calibración de tono** (ejemplo, no para copiar literal):
- Evitar: *"El video está bien en general, aunque el gancho podría mejorarse un poco y el ritmo es aceptable."* (diplomático, sin anclaje a nada específico)
- Objetivo: *"No lo grabaría así todavía. El gancho promete '3 errores que te van a costar caro' pero la Escena 2 tarda 18 segundos en nombrar el primero — en un Reel, eso es tiempo suficiente para perder a la mitad de la audiencia. El CTA final pide 'seguime' pero nunca conecta con la idea central del video (ahorrar plata evitando errores) — se siente pegado, no ganado."*

**Nota de implementación:** el sistema (no la IA) es responsable de forzar
la estructura exacta de salida (categorías fijas, exactamente 3 mejoras
prioritarias) vía el schema Zod al validar lo que el usuario pega — el
prompt orienta el razonamiento y el tono, el schema garantiza la forma.
No mezclar esa responsabilidad pidiéndole al prompt que fuerce estructura
con instrucciones de formato: es más frágil que dejarlo en el validador.

El orden de los campos en el schema (`grabariaAsi` → `veredicto` →
`confianzaDelDirector`, luego `hallazgos`, luego `mejorasPrioritarias`)
importa más allá de lo cosmético: muchos modelos de lenguaje razonan en el
orden en que completan una estructura, así que ordenar el schema igual que
el orden de razonamiento del rol de arriba ayuda a que el resultado siga
ese mismo camino (gancho/retención primero, número al final) sin importar
qué IA lo genere.
