# Origen de una Producción

> Documento de producto — sin código, sin decisión tomada. Objetivo: definir
> cuál será la única puerta de entrada oficial a Content OS para crear una
> Producción. Analiza las dos alternativas planteadas, sin recomendar
> ninguna.

## Estado actual (contexto, no una tercera alternativa)

Antes de comparar A y B, un hallazgo relevante: **hoy existen dos caminos
para crear una Producción, no uno**, aunque el proyecto viene operando
bajo la regla no escrita de "un solo punto de entrada de creación":

1. **Importar** (Hoy, `/`) — el creador escribe o dicta una idea, la lleva
   a ChatGPT (Blueprint) o sube un archivo `.cpp.json` (CreatorOS
   Production Package), y Content OS crea la Producción completa —
   título, formato, idea central y todas las escenas ya resueltas —
   a partir de ese contenido.
2. **Crear en blanco** (`/producciones`, botón "+ Nueva producción") —
   un formulario mínimo de dos campos (Título y Marca) que crea una
   Producción vacía, sin formato ni escenas, para completarse después a
   mano.

Este documento no asume que hay que elegir una de cero — la Alternativa A
implicaría **eliminar** el camino 2 (que ya existe); la Alternativa B
implicaría **mantener o expandir** ese mismo camino. Ninguna de las dos es
puramente hipotética.

---

## Alternativa A — La Producción siempre nace en ChatGPT y se importa

### Ventajas

- Coherente al 100% con la arquitectura ya congelada (Nivel A/B): Content
  OS nunca genera ni compone contenido, solo organiza lo que ya existe.
- Un solo flujo mental, sin ambigüedad: "primero escribo/pienso en
  ChatGPT, después traigo el resultado" — nunca hay que decidir "¿esto lo
  hago acá o allá?".
- El guion siempre pasa por una herramienta de escritura real, en vez de
  un formulario de campos sueltos dentro de Content OS.
- Elimina el estado intermedio de "Producción cáscara" — hoy es posible
  crear una Producción sin ideaCentral, sin formato y sin ninguna escena,
  que queda incompleta hasta que alguien la completa campo por campo.
- Menos superficie de mantenimiento a futuro: un solo camino de creación
  que atender, no dos con sus propias validaciones y casos borde.

### Desventajas

- Dependencia total de ChatGPT (o de tener un archivo CPP a mano) para
  arrancar cualquier cosa, incluso la más simple.
- Fricción para casos chicos: una Producción de una sola escena de
  B-roll, o una corrección rápida, exige igual el viaje completo
  (ChatGPT → exportar/pegar → importar) que una Producción completa.
- Se pierde la posibilidad de "reservar" o bocetar una Producción por su
  título/idea antes de tener el guion resuelto — hoy eso es posible con
  el formulario en blanco.
- El guion queda duplicado por diseño: vive primero en ChatGPT y se copia
  a Content OS al importar — una edición posterior del original en
  ChatGPT no se refleja sola en la Producción ya importada.

### Impacto en la interfaz

- Desaparece el botón "+ Nueva producción" y el formulario que abre
  (Título + Marca) de `/producciones`.
- `/producciones` pasa a ser una pantalla puramente de lectura: lista de
  Producciones existentes y su estado, sin ninguna acción de creación
  propia.
- La pantalla Hoy (`/`) se consolida como la única puerta de entrada real
  de todo el sistema — ya lo es en la práctica, pasaría a serlo también
  en las reglas.

### Impacto en el flujo del creador

- El camino se vuelve más largo pero más consistente: idea → ChatGPT →
  pegar/exportar → importar → Content OS. Sin atajos, sin excepciones.
- El creador nunca completa un formulario de creación dentro de Content
  OS — solo revisa y confirma lo que ya trae resuelto.
- Cualquier Producción, sin importar cuán simple, recorre exactamente el
  mismo camino que una compleja.

### Qué pantallas dejarían de existir

- El formulario inline "+ Nueva producción" (`ProduccionForm`) dentro de
  `/producciones`.
- Por descarte, cualquier pantalla futura de "creación paso a paso desde
  cero" queda fuera de alcance de entrada.

### Qué menú dejaría de existir

- Ninguna entrada de navegación de nivel superior desaparece — Hoy ya es
  el punto de entrada hoy. Lo que desaparece es una **acción** dentro de
  `/producciones` (el botón), no una entrada de menú completa;
  `/producciones` en sí se mantiene, como listado.

---

## Alternativa B — La Producción puede nacer dentro de Content OS

### Ventajas

- No depende de ChatGPT para arrancar — más rápido para Producciones
  simples o para quien prefiera escribir directo en Content OS.
- No es un concepto nuevo: ya existe una base real y en uso
  (`crearProduccion` + el formulario Título/Marca en `/producciones`) —
  sería formalizar y quizás ampliar algo que ya funciona, no construirlo
  de cero.
- Permite reservar/bocetar una Producción por su título o idea antes de
  tener el guion completo resuelto.
- Reduce la fricción para correcciones chicas o Producciones de una sola
  escena, sin el viaje completo por ChatGPT.

### Desventajas

- Introduce un segundo camino mental — "¿esto lo escribo en ChatGPT o
  directo acá?" — en tensión directa con la idea de una puerta de entrada
  única que este documento busca definir.
- Riesgo de que, con el tiempo, el formulario de creación crezca
  campo por campo hasta que Content OS empiece a comportarse como un
  editor/generador de contenido — justo lo que el congelamiento de
  arquitectura (v2) buscó evitar.
- Dos superficies a mantener en paralelo: el importador (Blueprint/CPP) y
  un formulario de creación manual, cada uno con su propia validación y
  sus propios casos borde.
- Una Producción creada en blanco queda, por diseño, en un estado
  incompleto (sin idea central, sin formato, sin escenas) hasta que
  alguien la completa a mano, escena por escena, dentro del editor de
  Escenas — un trabajo manual bastante mayor que pegar un guion ya
  armado.

### Impacto en la interfaz

- El formulario "+ Nueva producción" en `/producciones` se mantiene, y
  podría crecer más allá de Título + Marca si se busca una experiencia de
  creación más completa (formato, idea central, etc., de entrada).
- Podría sumarse una segunda entrada de creación directamente en Hoy
  (hoy Hoy solo ofrece "escribir idea → exportar a ChatGPT"; en esta
  alternativa podría ofrecer también un atajo "crear Producción vacía").
- Dos flujos de creación visibles y activos al mismo tiempo, potencialmente
  compitiendo por la atención del creador en la misma sesión.

### Impacto en el flujo del creador

- El creador elige entre dos caminos según el caso: guion ya armado →
  importar; idea suelta o Producción simple → crear directo.
- Exige que el creador entienda la diferencia entre ambos caminos y
  cuándo conviene cada uno — carga cognitiva adicional que hoy no existe
  de forma explícita.
- Una Producción creada en blanco requiere que el creador complete cada
  escena a mano dentro de Content OS — hoy el sistema no ofrece ninguna
  asistencia de escritura para eso, por la misma decisión de "nunca
  generar contenido" que ya rige el resto del proyecto.

### Qué pantallas dejarían de existir

- Ninguna. Esta alternativa preserva (y potencialmente expande) pantallas
  que ya existen — no hay pérdida de superficie de interfaz.

### Qué menú dejaría de existir

- Ninguno. Todas las entradas de navegación actuales se mantienen
  intactas.

---

## Cierre

Este documento no toma una decisión — describe el estado real de hoy
(dos caminos de creación coexistiendo) y las consecuencias concretas de
consolidar en cada dirección. La decisión de cuál será la puerta de
entrada oficial queda pendiente de tu confirmación.

*No se modificó código. No se hizo commit.*
