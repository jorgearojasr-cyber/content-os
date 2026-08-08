# SPRING_REFACTOR_1 — Eliminar la resolución durante la importación

> Plan de refactor — sin implementar todavía. No se tocó ningún archivo
> de `src/`, no se hizo commit. Aplica el hallazgo central de
> `CREATOROS_PLATFORM_UX_REDESIGN_V2.md`: la fricción real no está en que
> existan Personajes/Locaciones/Planos por resolver, está en el momento
> en que se pregunta.
>
> **Revisado.** El diseño original de este documento (más abajo) proponía
> *diferir* la resolución hasta Rodaje, todavía como un paso obligatorio.
> La revisión de viabilidad (última sección) encontró evidencia de que la
> resolución nunca necesitó ser obligatoria en ningún punto — puede ser
> **completamente opcional**. Se deja el diseño original intacto por
> trazabilidad; la sección final lo actualiza.

## Objetivo

Eliminar por completo la pantalla de resolución (Personaje/Locación/
Plano) que hoy aparece al importar un CreatorOS Production Package o un
Blueprint. Esa información física —quién actúa, dónde se graba, qué
equipo se usa— se resuelve una sola vez, en el momento en que el creador
realmente la necesita: cuando va a grabar esa escena puntual, no antes.

## Restricciones de este refactor

- **No modificar el modelo de datos.** Ninguna tabla, ninguna columna
  nueva.
- **No eliminar la Biblioteca.** Personajes y Activos (Locaciones/
  Recursos) siguen existiendo tal como están, con su función intacta.
- **Solo mover el momento en que aparece la resolución** — no cambia el
  mecanismo en sí (sigue siendo la misma comparación por similitud contra
  la Biblioteca ya existente), cambia únicamente cuándo se le muestra al
  creador.

## Por qué esto no requiere tocar el modelo de datos

La razón por la que este refactor es posible sin ninguna migración: el
JSON original completo del paquete (`cppOriginal` para CreatorOS
Production Package, `cbdOriginal` para Blueprint) **ya se guarda entero**
en la Producción desde que se importa — es una regla que ya existía antes
de este refactor, pensada originalmente para reimportaciones futuras.
Ese mismo texto ya contiene, sin resolver, los nombres de Personaje,
Locación y Plano de cada escena.

Eso significa que la resolución nunca necesitó ocurrir en el momento de
importar — solo necesitaba un lugar de dónde leer los nombres crudos más
tarde, y ese lugar ya existe. `locacionId` y `planoId` en cada escena, y
la relación de Personajes por escena, ya son campos que pueden quedar
sin completar al crearse (son opcionales hoy) y completarse después, sin
ningún cambio de esquema.

## Diseño propuesto

### Al importar (Revisión de importación)

Deja de existir cualquier bloque de "Antes de continuar" que pida
resolver un nombre. La pantalla se limita a mostrar lo que trae el
paquete —título, escenas, duración— y a confirmar. Las escenas se crean
con sus campos de Personaje/Locación/Plano **sin resolver**, exactamente
con los nombres que trajo el paquete, guardados sin vínculo todavía.

### Al llegar a grabar una escena (Rodaje)

En el momento en que el creador abre una escena puntual para grabarla,
recién ahí aparece la resolución — y solo para esa escena, nunca para
todas las de la Producción de una vez. Se busca el nombre crudo
correspondiente a esa escena dentro del original guardado (`cppOriginal`/
`cbdOriginal`), se lo compara contra la Biblioteca con el mismo mecanismo
de siempre, y se le pide al creador confirmar solo lo que haga falta —
justo antes de que lo necesite, nunca antes.

### Qué pasa con una escena que nunca llega a grabarse

Si el creador reordena, salta o nunca llega a grabar una escena, esa
resolución simplemente nunca ocurre — no hace falta, porque no hace
falta saber quién actúa en una escena que no se va a grabar todavía.

## Qué NO cambia

- El modelo de datos — cero columnas, cero tablas nuevas.
- La Biblioteca (Personajes, Activos) — sigue siendo el catálogo de
  referencia, con las mismas pantallas y la misma función.
- El mecanismo de comparación por similitud — es el mismo que ya existe,
  solo se dispara en otro momento.
- El resto del recorrido (Dashboard de Producción, Edición, Publicación)
  — sin cambios.

## Flujo de navegación actualizado

```
Importar Producción (CPP)
  → Revisión: solo confirmar (sin resolución)
  → Producción creada, escenas sin Personaje/Locación/Plano vinculados

Dashboard de la Producción
  → Escenas: se ven con el nombre crudo tal como lo trajo el paquete
     (todavía sin resolver, y está bien que así sea)

Rodaje → abrir una escena puntual
  → Recién acá: si el nombre no coincide exacto con la Biblioteca,
    se pide resolver — solo esta escena, solo lo que haga falta
  → Confirmar → grabar
```

## Archivos que cambiarían (sin tocar todavía)

- **La pantalla de Revisión de importación** (CPP y Blueprint) — perdería
  el bloque de resolución completo; pasaría a ser una confirmación pura.
- **La creación de la Producción al importar** — dejaría de exigir que
  cada escena venga con Personaje/Locación/Plano ya resueltos; los
  guardaría vacíos cuando el nombre no matchee, en vez de bloquear la
  importación.
- **La pantalla de Rodaje** — ganaría el paso de resolución que hoy vive
  en la importación, aplicado a una sola escena por vez, leyendo el
  nombre crudo desde el original guardado.
- **Escenas** (la grilla de storyboard) — mostraría el nombre crudo del
  paquete en las escenas todavía sin resolver, en vez de "sin definir".

## Riesgos

1. **Una escena puede llegar a Rodaje sin haber resuelto nunca su
   Personaje/Locación/Plano** si el creador salta directo a grabar sin
   pasar por la vista general — hay que decidir si eso bloquea grabar o
   si se puede grabar igual y resolver después. No lo resuelvo acá.
2. **Leer el nombre crudo de una escena puntual desde el original
   guardado** requiere poder ubicar, dentro de ese texto completo, cuál
   parte corresponde a esa escena en particular — hoy ese vínculo existe
   a nivel de Producción completa, no filtrado por escena individual.
3. **Reimportación de una Producción ya resuelta parcialmente**: si el
   creador ya resolvió algunas escenas y después se reemplaza el paquete
   completo (mismo `packageId`), hay que decidir si esas resoluciones ya
   hechas se conservan o se pierden — la regla actual de reemplazo es
   "siempre total", que entraría en tensión con resoluciones hechas
   escena por escena a lo largo del tiempo.
4. **La Biblioteca deja de ser parte del recorrido inicial** — hoy
   asignar un Personaje/Locación nuevo a una Producción es casi
   inmediato al importar; con este cambio, un catálogo pobre (pocos
   Personajes/Locaciones reales cargados) recién se nota escena por
   escena, en el peor momento posible (con la cámara lista). Vale la pena
   que el Dashboard de la Producción avise si hay resoluciones pendientes
   antes de llegar a Rodaje, aunque no bloquee nada.

---

## Revisión de viabilidad: ¿puede ser completamente opcional?

> Análisis, no implementación. Responde una pregunta más ambiciosa que el
> diseño original: no solo mover el momento de la resolución, sino
> preguntar si hace falta que ocurra en algún momento obligatorio. Parte
> del mismo hecho ya verificado (el CPP original completo se guarda
> entero en la Producción) y agrega evidencia nueva revisando el código
> real.

### Veredicto

**Sí, es viable — y es un cambio más chico de lo que el diseño original
asumía.** La revisión encontró que ningún punto del sistema, salvo uno,
exige hoy que Personaje, Locación o Plano estén resueltos. El único
bloqueo real es una condición del lado de la pantalla de importación, no
una regla del servidor ni del modelo de datos.

### Evidencia, punto por punto

- **Confirmar una importación**: la función del servidor que crea la
  Producción (`confirmarImportacionCPP`) solo exige que el paquete tenga
  título y que cada escena tenga un objetivo narrativo. En ningún punto
  valida que haya Personaje, Locación o Plano resuelto — guarda esos
  campos vacíos sin problema. El único motivo por el que hoy no se puede
  confirmar sin resolver es un candado que vive únicamente en la
  pantalla, no en el servidor.
- **Marcar una escena como grabada**: el checklist "Antes de grabar" que
  hoy se ve en Rodaje es puramente informativo — ya no bloquea nada. El
  botón para marcar una escena como grabada no depende de si el Plano, la
  Locación o los Personajes están resueltos.
- **Recursos**: nunca tuvieron un mecanismo de resolución para empezar —
  siempre fueron texto libre, sin ningún vínculo a la Biblioteca. Son la
  prueba de que el sistema ya funciona hoy, en producción, sin resolver
  esa categoría — nunca fue necesario.
- **El Plan de Edición** (el análisis que arma el montaje del video) se
  construye enteramente a partir del guion y la descripción de cada
  escena — nunca lee si el Personaje, la Locación o el Plano están
  resueltos. Una escena nunca vinculada genera un plan de edición
  exactamente igual de completo que una resuelta.
- **La detección de repeticiones y transiciones** (Director Creativo) no
  compara identificadores vinculados a la Biblioteca — analiza los
  nombres tal como aparecen en el guion, y solo durante la revisión de un
  guion pegado en Markdown. No participa en absoluto del camino de
  importar un CreatorOS Production Package, así que no hay ningún riesgo
  de que dos escenas sin vincular se confundan entre sí por esta vía.

En síntesis: la Biblioteca hoy ya es, en los hechos, un catálogo de
consulta — nada en el sistema la trata como un requisito para poder
avanzar. Lo único que la hace *sentir* obligatoria es la pantalla de
importación.

### Consecuencias de hacerlo completamente opcional

1. **Es un cambio más pequeño que el diseño original de este documento.**
   No hace falta construir un paso de resolución nuevo dentro de Rodaje
   — alcanza con dejar de bloquear la confirmación al importar, y con
   ofrecer vincular a la Biblioteca como una acción disponible, nunca
   exigida, en cualquier momento en que el creador la quiera.
2. **El nombre tal como lo escribió CreatorOS necesita poder mostrarse
   en pantalla aunque nunca se vincule a nada.** Hoy, si una escena queda
   sin resolver, lo único que se guarda es "vacío" — el nombre real solo
   sobrevive dentro del paquete original completo. Sin eso, una escena
   nunca vinculada se vería como "Sin definir" para siempre, en vez de
   mostrar el nombre real que trajo el guion. Es la misma necesidad que
   ya señalaba el Riesgo 2 del diseño original, y se vuelve más
   importante todavía si la resolución puede no ocurrir nunca.
3. **La Referencia visual (la foto grande de Modo Rodaje) puede quedar
   vacía indefinidamente** para cualquier Locación que el creador nunca
   decida vincular — es una consecuencia real de la opcionalidad total,
   no un error: si nunca se vincula, nunca hay foto. Vale la pena
   decidir conscientemente si eso es aceptable o si se prefiere invitar a
   vincular en algún punto, sin nunca exigirlo.
4. **Vincular un Recurso a la Biblioteca sería, en rigor, una
   posibilidad nueva, no una que se hace opcional** — hoy no existe
   ningún camino para conectar un Recurso mencionado en un guion con un
   Activo real; siempre fue texto suelto. Si se quiere que el creador
   pueda "asociar información física para reutilizarla después" también
   para Recursos, eso es construir algo que hoy no existe, a diferencia
   de Personaje/Locación/Plano, que sí tienen el mecanismo de vínculo ya
   construido, listo para usarse de forma opcional.
5. **El Riesgo 3 del diseño original (reimportar pisa resoluciones ya
   hechas) se vuelve menos grave, no más** — si vincular es una acción
   ocasional y voluntaria en vez de un paso esperado para cada escena,
   hay naturalmente menos vínculos en juego que una reimportación pudiera
   pisar.
6. **El Riesgo 1 del diseño original queda resuelto en un solo sentido**:
   nunca bloquea. Grabar, editar y publicar una Producción entera sin
   vincular nunca nada a la Biblioteca es, según esta revisión, un
   camino ya soportado por el sistema tal como está hoy — salvo por el
   candado de la pantalla de importación.

### Qué sigue sin resolver esta revisión

Sigue sin decidirse *cuándo y cómo* se le ofrece al creador la
posibilidad de vincular algo a la Biblioteca si nunca es obligatorio —
¿un botón disponible en cada escena, en todo momento? ¿una invitación
suave en el Dashboard de la Producción, sin bloquear nada? Es una
decisión de interacción, no de viabilidad, y queda para cuando se
apruebe implementar.

---

*No se modificó código. No se hizo commit. Plan y revisión a la espera
de aprobación antes de implementar.*
