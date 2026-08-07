# CONTENT OS V2 — SPRINT 7 (propuesta v2 — sin implementar)

> "Modo Rodaje APROBADO" con 4 correcciones antes de implementar. Este
> documento ya incorpora las 4 — sigue siendo solo propuesta, no se tocó
> ningún archivo de `src/`.

## Correcciones aplicadas en esta versión

1. **Un solo botón, no dos.** "Marcar como grabada" + "Siguiente escena" se
   fusionan en **"Finalizar escena"**: marca la escena actual como grabada
   y avanza sola. Si era la última, muestra "Rodaje terminado" y vuelve al
   Dashboard de la Producción (Sprint 4).
2. **Referencia visual pasa de miniatura a imagen grande** — ~un tercio de
   la altura de la pantalla. Resuelve el Riesgo 2 de la v1 (la jerarquía
   visual real es "ver dónde estoy parado", no solo el guion).
3. **Indicador de progreso agregado**: "Escena 3 de 8" + barra con
   porcentaje.
4. **Botón de salir eliminado** — resuelve el Riesgo 1 de la v1 en la
   dirección contraria a la que yo había asumido: no hay salida propia,
   se usa solo la navegación del sistema (atrás del navegador o gesto del
   teléfono).

## Punto de partida: qué existe hoy

La pantalla de grabar una escena ya existe — `copiloto-grabar.tsx`, dentro
de la pestaña **Rodaje** (renombrada en Sprint 5). Hoy muestra, en este
orden: un encabezado con progreso, un checklist "Antes de grabar" (Plano /
Locación / Personajes / Recursos, cada uno con su propio estado
resuelto/pendiente), el guion, una tarjeta del Director Creativo con
decisiones de producción pendientes, y una sección secundaria colapsada
con campos de detalle (movimiento de cámara, transición, notas, etc.).

Es una pantalla correcta para **prepararse** a grabar — pero es demasiada
información para tenerla abierta mientras se está grabando de verdad. Ese
es el problema que resuelve Modo Rodaje.

---

## 1. Propuesta UX (v2)

**Sigue sin ser una ruta nueva — es un modo de la misma pantalla.** Un
botón en la pantalla de Rodaje actual ("Modo Rodaje") cambia la vista a la
versión reducida, sin navegar a ningún lado. La URL no cambia (sigue
siendo `.../copiloto/{escenaId}`).

**Los seis elementos visibles ahora** (Corrección 1 fusiona dos botones en
uno):

| # | Elemento | De dónde sale (dato ya existente) |
|---|---|---|
| 1 | Progreso — "Escena 3 de 8" + barra | `numero` de la escena actual sobre el total de escenas de la Producción — ambos ya disponibles (`getStoryboardEscenas`) |
| 2 | Referencia visual (imagen grande, ~⅓ de pantalla) | Foto de la Locación (`activos.valor` donde `tipo="foto"`) |
| 3 | Guion | `textoHablado` |
| 4 | Plano | `planos.nombre` vía `planoId` |
| 5 | Recursos | `recursosNecesarios` (texto libre) |
| 6 | Botón único "Finalizar escena" | Compuesto de dos acciones ya existentes en secuencia — ver sección 2 |

**Jerarquía visual (actualizada)**: la Referencia visual ahora tiene peso
real (imagen grande arriba, ~⅓ de la pantalla) — deja de ser un dato
secundario y pasa a ser, junto con el Guion, uno de los dos elementos
principales. El Guion sigue siendo lo que se lee de corrido mientras se
actúa, así que conserva la tipografía más grande de la pantalla. Plano y
Recursos siguen siendo una franja compacta de texto (se consultan de un
vistazo). El progreso vive arriba de todo, chico, informativo — nunca
compite con la imagen ni con el guion. El botón "Finalizar escena" queda
fijo abajo, del tamaño del pulgar, ocupando todo el ancho — al ser el
único control posible ahora, no hay ambigüedad sobre qué tocar.

**Se eliminó el botón de salir** (Corrección 4) — Modo Rodaje ya no tiene
ninguna forma de salida propia dentro de sus 6 elementos. Salir depende
enteramente de la navegación del sistema operativo/navegador (atrás).

---

## 2. Flujo de navegación (v2)

```
Rodaje (Copiloto) — pantalla de preparación de la escena actual
  │
  │  [Modo Rodaje]  ← botón, no navega
  ▼
┌─────────────────────────────────────┐
│  Escena 3 de 8      ██████░░ 38%     │
│                                       │
│  ┌─────────────────────────────┐    │
│  │                               │    │
│  │   [ REFERENCIA VISUAL ]      │    │  ← ~⅓ de la pantalla
│  │        📍 Oficina Moderna     │    │
│  └─────────────────────────────┘    │
│                                       │
│         « GUION »                    │
│    (texto grande, protagonista)      │
│                                       │
│  🎥 Plano medio                      │
│  🎒 laptop, mockup de la app         │
│                                       │
│  ┌─────────────────────────────┐    │
│  │      Finalizar escena         │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
  │
  │  "Finalizar escena" (una sola acción, dos efectos en secuencia):
  │    1. Marca la escena actual como GRABADA (ya existe:
  │       `actualizarEstadoProduccionEscena`)
  │    2. Avanza a la siguiente escena en Borrador — mismo criterio
  │       que ya calcula `resolverFaseCopiloto`, sin salir de Modo
  │       Rodaje (el contenido de pantalla se actualiza in-place)
  │
  ▼
¿Quedan escenas en Borrador?
  │
  ├─ Sí → siguiente escena se muestra dentro del mismo Modo Rodaje
  │       (progreso avanza, imagen/guion/plano/recursos cambian)
  │
  └─ No (era la última) → "Rodaje terminado" (pantalla de cierre,
        dentro de Modo Rodaje) → navega automáticamente al Dashboard
        de la Producción (mismo destino que ya usa la importación de
        Producción, Sprint 4)
```

---

## 3. Archivos que cambiarían (todavía no tocados)

Sin cambios respecto de la v1 — las 4 correcciones son de UI/UX dentro del
mismo componente, no agregan superficie nueva de código:

- **`src/app/proyectos/[id]/producciones/[produccionId]/copiloto/copiloto-grabar.tsx`** — agregaría el estado `modoRodaje` (boolean) y el componente de vista reducida, condicional a ese estado. El botón "Finalizar escena" llamaría, en secuencia, a la misma acción de marcar grabada que ya existe y al mismo cálculo de "próxima escena en Borrador" que ya existe — ninguna lógica nueva, solo una composición de las dos.
- Ningún archivo de `src/lib/actions.ts` — cero acciones nuevas (confirmado explícitamente por tu instrucción "no agregar nuevas funciones").
- Ningún cambio de esquema.

---

## 4. Riesgos

Los 4 riesgos de la v1 quedaron resueltos por tus correcciones (constancia
para trazabilidad):

- ~~Salir de Modo Rodaje no estaba en la lista~~ → resuelto: no hay salida propia, se usa navegación del sistema (Corrección 4).
- ~~Referencia visual como miniatura vs. protagonista~~ → resuelto: ahora es imagen grande, un tercio de pantalla (Corrección 2).
- ~~Qué pasa al final del recorrido~~ → resuelto: "Rodaje terminado" → Dashboard (Corrección 1).

Vigentes, nuevos de esta ronda:

1. **"Finalizar escena" es una sola acción que dispara dos efectos en secuencia** (marcar grabada + avanzar) — si el primer efecto se persiste pero el segundo falla por algún motivo (ej. corte de red justo en el medio), la escena queda grabada pero la pantalla no avanzó. No es un caso que la propuesta resuelva — hay que decidir, al implementar, si se trata como una sola transacción de UI (optimista, revierte todo si falla) o como dos pasos independientes donde el primero ya quedó bien igual. Lo señalo para la implementación, no lo resuelvo acá.
2. **Guion vacío o muy largo** (heredado de la v1, sigue sin resolver del todo): con la Referencia visual ahora ocupando ⅓ de la pantalla, un guion largo tiene menos espacio disponible que en la v1 — vale confirmar que el scroll interno del bloque de guion (ya propuesto en v1) sigue siendo la solución, ahora con menos margen.
3. **"Volver al Dashboard" es una redirección automática, sin confirmación** — coherente con "no agregar nuevas funciones" (no hay ningún botón nuevo tipo "Ir al Dashboard"), pero significa que el usuario no tiene forma de quedarse mirando la pantalla de cierre más que un instante. Si preferís que la redirección espere un toque en vez de ser automática, es una función más (aunque sea un solo botón) y valdría confirmarlo antes de implementar.

---

## 5. Mockup (v2)

Actualizada la misma maqueta interactiva (mismo archivo, mismos tokens de
diseño reales de Content OS) con las 4 correcciones: botón único
"Finalizar escena", imagen grande de referencia visual, indicador de
progreso, sin botón de salir. La comparto aparte de este documento.

---

*No se modificó código. No se hizo commit. A la espera de tu aprobación
final antes de implementar.*
