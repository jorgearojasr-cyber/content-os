# Principios de diseño de Content OS

Estos principios gobiernan cómo Content OS toma decisiones de producto y de
interfaz. No son reglas de una funcionalidad puntual — se aplican a
cualquier campo, pantalla o flujo nuevo, y cualquier desviación debe
justificarse explícitamente antes de romperlos.

## 1. Todo campo tiene un dueño

Cada campo de una escena, bloque o entidad debe tener un origen claro y un
responsable de mantenerlo actualizado — el CBD, el usuario, o una capa
determinística de Content OS. Un campo que nadie lee ni escribe (huérfano)
es una señal de que algo en el flujo está mal diseñado, no un detalle
menor. (Hallazgo original: `PRODUCT-REVIEW-1`, "5 de 6 campos no tienen
dueño real" en `generarPlanEdicionProduccionAction`.)

## 2. Automático nunca significa silencioso

Cualquier valor que Content OS complete o sugiera por sí mismo —sin que el
usuario lo haya escrito— debe mostrarse, explicarse y quedar editable.
"Automático" describe cuánta fricción hace falta para aceptar una
sugerencia (ninguna, en este caso), nunca si el usuario puede verla o
cambiarla. Ver [[content-os-decision-engine]] — los tres niveles de
fricción (Automático / Sugerido / Manual) existen precisamente para separar
"cuánto pide confirmación" de "qué tan visible es", que nunca deja de ser
total.

## 3. Una sola fuente de verdad

Un mismo análisis, cálculo o juicio no debe repetirse en dos lugares que
puedan divergir. Si algo ya se calculó o evaluó una vez, las demás
pantallas lo **leen**, no lo vuelven a generar. (Ejemplo: el Director
Creativo IA evalúa una vez en Revisión; el Copiloto solo muestra ese
resultado, nunca corre su propio pase de juicio — ver
`docs/phase-2/director-creativo-ia.md`.)

## 4. El origen de un dato debe entenderse visualmente antes de leerse

El usuario nunca debería tener que leer una explicación para entender de
dónde salió un valor. Si un campo viene del CBD, si es una sugerencia del
Decision Engine, o si ya es un valor confirmado por el usuario debe
distinguirse **de un vistazo** — por color, forma o estilo del propio
campo, nunca solo por una leyenda de texto debajo. El texto puede
acompañar como refuerzo o para accesibilidad, pero nunca puede ser el
único mecanismo: si hay que leer para saber el origen, el diseño todavía
no resolvió el problema.

Nace de `UX-VALIDATION — Decision Engine (Ronda 1)`: la validación
encontró que Movimiento de cámara (Automático) era visualmente idéntico a
un valor del CBD, con una leyenda gris como único indicador — fácil de
pasar por alto. `UX-MIGRATION — Decision Engine Visual Language` resolvió
esto en `Input` (`src/components/ui.tsx`, prop `sugerido`): borde y fondo
ámbar mientras el valor sea una sugerencia sin editar, que desaparece en
cuanto el usuario toca el campo — el color deja de aplicar el instante en
que el dato pasa a ser del usuario.

## Cómo aplicar estos principios

Antes de agregar un campo, una sugerencia o una pantalla nueva, revisar los
cuatro:
1. ¿Quién es el dueño de este dato?
2. ¿Alguna decisión automática queda oculta?
3. ¿Este juicio ya se calculó en otro lugar?
4. ¿Se puede distinguir el origen del dato sin leer nada?

Si la respuesta obliga a romper alguno, la desviación debe quedar
explícita y justificada en el pedido de la funcionalidad — no asumida en
silencio.
