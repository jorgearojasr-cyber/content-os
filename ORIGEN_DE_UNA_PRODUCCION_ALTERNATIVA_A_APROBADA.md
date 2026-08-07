# Origen de una Producción — Alternativa A aprobada (propuesta de cambio, sin implementar)

> Decisión de producto ya tomada: Content OS deja de crear Producciones.
> La única fuente oficial pasa a ser ChatGPT (Blueprint) o un CreatorOS
> Production Package. Este documento es la propuesta concreta de qué
> desaparecería para llevar esa decisión al código — **no se tocó ningún
> archivo de `src/`, no se hizo commit.**

## Hallazgo que enmarca todo lo demás

La creación manual de hoy no es una pantalla propia ni una ruta propia —
es una sección dentro de la pantalla `/producciones` que ya existe (un
botón que despliega un formulario inline). Por eso el impacto real de la
Alternativa A es **más chico de lo que "eliminar un flujo entero" sugiere
a primera vista**: no desaparece ninguna pantalla ni ninguna ruta,
desaparece una acción y el componente que la sostiene. Lo documento tal
cual es, sin inflar el alcance del cambio.

---

## 1. Qué pantallas desaparecerían

**Ninguna pantalla completa desaparece.**

`/producciones` se mantiene — es la pantalla de listado de todas las
Producciones existentes, y seguiría siéndolo. Lo único que cambia dentro
de esa misma pantalla es que deja de tener una sección de creación: hoy
el botón "+ Nueva producción" (`src/app/producciones/producciones-lista.tsx:69-71`)
despliega una `<Card>` con el formulario de creación
(`producciones-lista.tsx:75-86`); ambos desaparecerían, dejando la
pantalla como una lista de solo lectura con su filtro por Marca.

## 2. Qué componentes desaparecerían

- **`ProduccionForm`** — función interna de
  `src/app/producciones/producciones-lista.tsx:126-...` (título + Marca,
  el único formulario de creación manual que existe). No es un archivo
  aparte, es una función dentro de ese archivo — desaparecería junto con
  el bloque que la renderiza.
- El botón **"+ Nueva producción"** y el estado `creando` que lo
  acompaña (`useState(false)` en `ProduccionesLista`) — ambos dejan de
  tener sentido sin el formulario detrás.
- El copy condicional del estado vacío que menciona ese botón
  (`producciones-lista.tsx:95`: *"Creá la primera con "+ Nueva
  producción"."*) — necesitaría un texto nuevo que no dependa de una
  acción que ya no existe (ej. remitir a Hoy/importar).

## 3. Qué rutas dejarían de existir

**Ninguna.** La creación manual nunca tuvo su propia ruta — vivía inline
dentro de `/producciones`, que se mantiene. No hay ningún `/producciones/nueva`
ni equivalente que dar de baja.

En el servidor, la función **`crearProduccion`**
(`src/lib/actions.ts`, recibe `titulo` + `proyectoId` desde un
`FormData` e inserta una Producción vacía) quedaría sin ningún llamador —
no es una ruta, pero es la pieza de lógica que la Alternativa A vuelve
innecesaria. Se documenta acá porque es la contraparte exacta de lo que
desaparece en la interfaz, aunque técnicamente sea código de acción, no
una ruta.

## 4. Qué elementos del menú lateral dejarían de existir

**Ninguno.** El menú lateral (`src/components/sidebar.tsx`) no tiene
ninguna entrada dedicada a "crear Producción" — la entrada **Producciones**
(dentro del grupo "Mis videos") sigue apuntando a `/producciones`, que
se mantiene como pantalla de listado. Ningún ítem de navegación de
primer ni segundo nivel se retira por este cambio.

## 5. Cómo quedaría la navegación final del MVP

Sin cambios de estructura respecto de la navegación actual — el cambio es
de comportamiento dentro de una pantalla existente, no de arquitectura de
navegación:

```
Hoy (/)                              ← única puerta de entrada de creación
  · Campo de idea → ChatGPT → pegar resultado (Blueprint)
  · "Importar Producción" → archivo .cpp.json (CreatorOS Production Package)
  · Agenda del día (Grabar/Editar/Publicar/Reanudar) — sin cambios

Mis videos
  · Producciones (/producciones)      ← pasa a ser SOLO listado, sin "+ Nueva producción"
  · Biblioteca (/biblioteca)          ← sin cambios
  · Calendario (/calendario)          ← sin cambios

Mi marca
  · Marcas (/proyectos)               ← sin cambios
  · Personajes (/personajes)          ← sin cambios
  · Conocimiento del estudio
      · Prompts (/prompts)            ← sin cambios
      · Documentos (/conocimiento)    ← sin cambios

Ideas (/segundo-cerebro)              ← sin cambios, no es un punto de creación de Producciones
```

La única diferencia real, visible para el creador: entrar a
`/producciones` y no encontrar ningún botón para crear algo ahí — solo
para revisar lo que ya existe. Toda creación, sin excepción, pasa a
originarse en Hoy.

---

*Propuesta únicamente — no se modificó código, no se hizo commit. Queda
a la espera de tu autorización explícita para implementar.*
