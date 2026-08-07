# CONTENT OS V2 — SPRINT 9 "Cerrar el flujo del MVP" (propuesta — sin implementar)

> Solo propuesta ("No modificar código"). No se tocó ningún archivo de
> `src/`. Con esto se completa el rediseño de las 4 etapas del flujo
> principal: Rodaje (Sprint 7) → Escenas (Sprint 5) → **Edición** →
> **Publicación** (esta ronda) → Dashboard de Producción (Sprint 4).

## Punto de partida: qué existe hoy

Ambas pantallas ya existen — son las fases "editar" y "cierre" del
Copiloto (`copiloto/editar/page.tsx` y `copiloto/cierre/page.tsx`),
aparecen solas cuando corresponde (`resolverFaseCopiloto`), nunca como
pestañas independientes.

**Edición hoy** muestra, en orden: una tarjeta "Terminaste de grabar"
(puramente informativa), los hallazgos del Director Creativo IA
(Repetición/Transición — ya aprobados como parte del ecosistema
CreatorOS, no una IA nueva), el panel **Director de Edición** (plan de
edición generado una vez, con secciones "Empezá por acá" / escena por
escena / referencia — también ya aprobado, Sprint 1 decisión 1), y al
final el botón para marcar como editado.

**Publicación hoy** ya es casi mínima: una fecha opcional + el botón
Publicar.

Ninguna de las dos pantallas tiene Biblioteca, automatizaciones, ni IA
nueva — lo que ya existe es exactamente lo que este Sprint permite
conservar (nada de eso se agrega, nada de eso se propone quitar).

---

## 1. Propuesta UX

**El filtro es literal**: cada elemento de cada pantalla se evalúa contra
las dos preguntas. Lo que no responde ninguna de las dos, se quita o se
reduce a algo más chico.

### Edición

| Elemento actual | Responde a... | Qué cambia |
|---|---|---|
| "Terminaste de grabar" (tarjeta propia) | Ninguna directamente — es un anuncio, no una pregunta | Se retira como tarjeta propia; su mensaje pasa a ser el subtítulo de la sección de abajo, una sola vez |
| Hallazgos del Director (Repetición/Transición) | **¿Qué falta?** | Se mantiene, pero pasa a vivir DENTRO de una única sección "Qué falta para publicar", no como bloque separado arriba |
| Panel Director de Edición (plan) | **¿Qué falta?** | Se mantiene tal cual (ya es el contenido más denso y ya está bien organizado) — vive en la misma sección "Qué falta", como el ítem principal |
| Botón "Marcar video como editado" | **¿Ya está terminado?** | Se mantiene, pasa a ser la única acción primaria de la pantalla — visualmente separado y más prominente |

Estructura resultante: **dos secciones, una por pregunta** — nunca más de
dos.

### Publicación

Ya está casi en el punto — el ajuste es hacerla responder las dos
preguntas explícitamente en vez de asumir la primera:

| Elemento actual | Responde a... | Qué cambia |
|---|---|---|
| (nada — se asume implícito) | **¿Qué falta?** | Se agrega una confirmación compacta de una línea ("Grabado ✓ · Editado ✓") — dato que ya existe (estado de las escenas), no un cálculo nuevo |
| Fecha + botón Publicar | **¿Ya está terminado?** | Se mantiene igual |

---

## 2. Mockup

Maqueta interactiva con toggle entre las dos pantallas, tokens reales de
Content OS.

*(mockup HTML compartido aparte de este documento)*

```
EDICIÓN                              PUBLICACIÓN
┌─────────────────────────┐         ┌─────────────────────────┐
│ Reel — Lanzamiento       │         │ Reel — Lanzamiento       │
│                          │         │                          │
│ QUÉ FALTA PARA PUBLICAR  │         │ QUÉ FALTA PARA PUBLICAR  │
│ ┌──────────────────────┐│         │  Grabado ✓ · Editado ✓   │
│ │ ⚠ Escenas 2 y 5 muy   ││         │                          │
│ │   parecidas — revisar ││         │ ¿YA ESTÁ TERMINADO?      │
│ ├──────────────────────┤│         │  Fecha (opcional)        │
│ │ Director de Edición   ││         │  [ dd/mm/aaaa ]          │
│ │ (plan completo, sin   ││         │                          │
│ │  cambios de contenido)││         │  ┌────────────────────┐ │
│ └──────────────────────┘│         │  │      Publicar       │ │
│                          │         │  └────────────────────┘ │
│ ¿YA ESTÁ TERMINADO?      │         └─────────────────────────┘
│  ┌──────────────────────┐│
│  │ Marcar video editado ││
│  └──────────────────────┘│
└─────────────────────────┘
```

---

## 3. Flujo

Sin cambios de navegación — ambas pantallas ya son el destino final de
`resolverFaseCopiloto` para sus respectivas fases, y ya redirigen a donde
correspondía (Editar → Cierre al marcar editado; Cierre → Dashboard de la
Producción al publicar). Esta ronda es exclusivamente reorganización
visual dentro de la misma pantalla, igual que Modo Rodaje (Sprint 7) y el
rediseño de Escenas (Sprint 5) — ningún destino nuevo, ninguna ruta nueva.

```
Rodaje (última escena grabada)
  → Edición
      "Qué falta" (hallazgos + Director de Edición)
      "¿Ya está terminado?" → Marcar como editada
  → Publicación
      "Qué falta" (confirmación Grabado ✓ Editado ✓)
      "¿Ya está terminado?" → fecha + Publicar
  → Dashboard de la Producción (Sprint 4)
```

---

## 4. Archivos que cambiarían (todavía no tocados)

- **`src/app/proyectos/[id]/producciones/[produccionId]/copiloto/editar/page.tsx`** — reordenaría el JSX en dos secciones ("Qué falta" / "¿Ya está terminado?"), sin tocar ninguna consulta ni acción — mismos datos (`hallazgosParaEditar`, `PlanEdicionPanel`, `marcarProduccionComoEditada`) que ya se usan hoy.
- **`src/app/proyectos/[id]/producciones/[produccionId]/copiloto/cierre/page.tsx`** — agregaría la línea de confirmación "Grabado ✓ · Editado ✓" (usando el mismo `getStoryboardEscenas` que la página ya podría pedir, y el hecho de que llegar a esta fase YA implica que todo está editado — es un dato derivado, no una consulta nueva).
- **`src/components/plan-edicion-panel.tsx`** — sin cambios. Ya está bien organizado (Sprint UX-MIGRATION-5 ya hizo este mismo trabajo de jerarquía ahí adentro).
- Ningún archivo de `src/lib/actions.ts` — cero funciones nuevas.
- Ningún cambio de esquema.

---

## 5. Riesgos

1. **"Grabado ✓ · Editado ✓" en Publicación es un dato siempre verdadero por construcción** — llegar a la fase "cierre" ya implica que no queda ninguna escena en Borrador ni Grabada (`resolverFaseCopiloto`). No es información nueva, es una confirmación redundante a propósito — resuelve la pregunta "¿ya está terminado?" sin que el usuario tenga que confiar en la memoria. Si te parece innecesario por ser siempre igual, se puede omitir sin perder nada funcional.
2. **Los hallazgos del Director (Repetición/Transición) pueden no existir** (Producciones importadas por CPP, o Blueprint sin ese análisis) — la sección "Qué falta" en Edición, en ese caso, queda con un solo ítem (el plan de edición). No es un caso nuevo, ya se maneja hoy (`hallazgosEditar.length > 0 ? ... : null`), solo lo señalo porque cambia cómo se ve la sección combinada cuando está vacía.
3. **El Panel Director de Edición es grande** (plan completo, escena por escena) — meterlo "dentro" de una sección más chica visualmente podría sentirse raro si el plan tiene muchas escenas. Es una tensión inherente a comprimir dos preguntas cuando una de las respuestas es naturalmente larga — no la resolví con un límite ni con colapsar contenido, para no tocar el panel en sí (fuera de alcance, ver archivos).

---

*No se modificó código. No se hizo commit. A la espera de tu aprobación
(con o sin correcciones) antes de implementar.*
