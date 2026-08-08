# SPRINT_EXECUTION_2 — El CPP siempre visible en ejecución

> Plan — sin implementar todavía. No se tocó ningún archivo de `src/`, no
> se hizo commit. Resuelve directamente el Riesgo 1 dejado abierto en
> `SPRING_REFACTOR_1.md`: al eliminar la resolución obligatoria durante
> la importación, las pantallas de ejecución quedaron mostrando "Sin
> definir" para todo lo que nunca se vinculó — este documento cierra esa
> tensión.

## Objetivo

Ninguna pantalla de ejecución debe mostrar jamás "Sin definir", "Sin
vincular" o "Pendiente" si esa información ya existe en el CPP. La regla
de visualización, en todos los casos: si hay una entidad vinculada en la
Biblioteca, se muestra esa entidad; si no, se muestra el texto original
tal como lo escribió CreatorOS. Solo se puede mostrar un estado vacío
cuando el CPP genuinamente no incluyó ese dato — nunca como sustituto de
"no se resolvió".

## El problema técnico real

Para poder leer "el texto original tal como lo escribió CreatorOS" hace
falta poder ubicar, dentro del `cppOriginal` completo que ya se guarda,
cuál fragmento corresponde a la escena que se está mostrando en pantalla
— y hoy no existe ningún vínculo estable entre una escena ya creada y su
posición original dentro del paquete. El `numero` visible de una escena
cambia con cada reordenamiento, duplicación o eliminación (es, a
propósito, la posición actual — no una referencia fija), así que no sirve
para ubicarla de vuelta en el JSON original.

## La solución no requiere ningún cambio de esquema

Ya existe una columna pensada exactamente para este problema:
`numeroEnAnalisisDirector` — un índice inmutable que hoy se usa para
vincular una escena con el análisis del Director Creativo, y que
explícitamente **nunca se reescribe** aunque la escena se mueva, se
duplique o se reordene. Hoy, al importar un CPP, ese campo se guarda
vacío (el Director Creativo nunca analiza escenas importadas por
paquete). No hace falta ninguna columna nueva — alcanza con usar esa
misma columna, con el mismo criterio de inmutabilidad que ya tiene, para
guardar el número original de la escena dentro del paquete en el momento
de importar.

Con eso guardado, cualquier pantalla puede, en cualquier momento, volver
a ubicar la escena original dentro de `cppOriginal` — sin importar cuánto
se haya reordenado el storyboard desde entonces.

## Diseño propuesto

### Al importar

Cada escena se guarda, además de lo que ya guarda hoy, con el número que
tenía dentro del paquete original — el mismo campo que el Director
Creativo ya usa para lo mismo, aplicado ahora también al camino de CPP.

### Al mostrar cualquier pantalla de ejecución

Para Plano, Locación y Personajes de una escena, el orden de prioridad es
siempre el mismo:

1. Si hay una entidad vinculada en la Biblioteca — mostrar su nombre real
   (esto ya funciona hoy sin cambios).
2. Si no hay vínculo, pero el paquete original sí menciona un nombre para
   ese campo en esa escena — mostrar ese nombre tal cual, sin ninguna
   marca de "pendiente" ni de "sin resolver". Se ve exactamente igual que
   si estuviera vinculado, solo que no soporta clic para ver más detalle
   de Biblioteca.
3. Solo si el paquete nunca declaró ese campo para esa escena — recién
   ahí un estado vacío neutro, distinto en su redacción de "Sin definir/
   Sin vincular/Pendiente" (esos tres términos quedan prohibidos como
   texto de interfaz en toda pantalla de ejecución).

Recursos ya cumple esta regla sin ningún cambio — nunca fue un vínculo a
la Biblioteca, siempre fue el texto que trajo el paquete, guardado tal
cual.

## Dónde aplica

- **Escenas** (la grilla de storyboard) — hoy muestra "Sin definir" para
  Plano cuando no hay vínculo, y omite la Referencia visual/Locación por
  completo. Es la pantalla con más impacto de este cambio.
- **Rodaje** (grabar una escena) — el checklist y los campos de Plano/
  Locación/Personajes tienen el mismo problema.
- **Dashboard de la Producción** — revisado, y no le corresponde ningún
  cambio: su resumen de Escenas hoy solo muestra número, objetivo
  narrativo y estado — nunca Plano, Locación ni Personajes. No hay nada
  que corregir ahí.
- **Edición y Publicación** — no muestran estos campos, sin cambios.

## Archivos que cambiarían (sin tocar todavía)

- **La inserción de escenas al importar un CPP** — agregaría guardar el
  número original del paquete en la misma columna que ya usa el Director
  Creativo para este propósito, sin agregar ninguna columna.
- **Una pieza nueva y pequeña, puramente de lectura**: dado el
  `cppOriginal` de una Producción y el número original de una escena,
  devuelve el nombre crudo de Plano/Locación/Personajes que declaró el
  paquete para esa escena — sin escribir nada, solo leer.
- **Escenas** (la grilla) — usaría esa pieza como respaldo cuando no hay
  vínculo, en vez de mostrar "Sin definir".
- **Rodaje** — mismo respaldo, en el checklist y en los campos que
  muestra durante la grabación.

## Riesgos

1. **Producciones ya importadas antes de este cambio** no tienen guardado
   el número original en `numeroEnAnalisisDirector` — para ellas, el
   respaldo no tendría de dónde leer, y seguirían mostrando un estado
   vacío hasta que se reimporten. No se puede completar retroactivamente
   sin volver a tener el paquete original a mano.
2. **Reemplazo de una Producción (`confirmarReemplazoCPP`)** ya borra y
   vuelve a crear todas las escenas desde cero — el número original se
   volvería a guardar bien en ese caso, sin ningún ajuste adicional.
3. **El nombre crudo mostrado nunca pasó por ningún control de calidad**
   — si CreatorOS escribió un nombre con errores de tipeo o formato raro,
   Content OS lo va a mostrar tal cual, sin poder corregirlo, porque
   nunca hay una pantalla que pida revisarlo.
4. **Ambigüedad si dos escenas del paquete comparten el mismo número**
   — ya está prohibido por el contrato del CPP (números únicos, validado
   al parsear), así que no debería poder ocurrir, pero vale dejarlo
   dicho: la búsqueda por número asume que ese número es único dentro del
   paquete.

---

*No se modificó código. No se hizo commit. Plan a la espera de
aprobación antes de implementar.*
