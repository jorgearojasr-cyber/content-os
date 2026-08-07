# CONTENT OS V2 — SPRINT 8 (propuesta — sin implementar)

> Igual que Sprint 7: solo propuesta ("No modificar código todavía"). No se
> tocó ningún archivo de `src/`.

## Punto de partida: qué existe hoy

La pantalla inicial (`/`, `HoyScreen`) hoy es un campo único: "¿Qué video
querés hacer hoy?" — pensada para **arrancar algo nuevo** (dictar/pegar una
idea, o importar una Producción). Abajo de ese campo ya existe una sección
"Videos en curso" que lista las Producciones activas con su título y
cantidad de escenas — pero sin decir qué acción concreta corresponde a
cada una, y sin distinguir grabar/editar/publicar.

Este Sprint pide invertir el orden de importancia: la pregunta principal
deja de ser "¿qué querés empezar?" y pasa a ser **"¿qué hago ahora?"** —
casi siempre la respuesta es continuar algo que ya está en curso, no
empezar algo nuevo.

## Tensión a resolver (marcada, no asumida en silencio)

Tu instrucción dice *"Convertir la pantalla inicial en un centro de
trabajo diario"* — pero el campo de idea/importar Producción es, por
regla ya establecida en este proyecto, **el único punto de entrada para
crear contenido nuevo** (no existe otro lugar en toda la app para
arrancar una Producción). Eliminarlo entraría en conflicto con esa regla.

**Lo que propongo**: el campo de idea no desaparece, pero deja de ser lo
primero que se ve. El Dashboard Hoy (los 4 elementos pedidos) ocupa la
parte de arriba de la pantalla; el campo de idea queda debajo, siempre
disponible pero ya no protagonista — literalmente la misma pantalla,
reordenada. Si no hay nada que grabar/editar/publicar (usuario nuevo, o
todo al día), el campo de idea es lo único que se ve, igual que hoy.

---

## 1. Propuesta UX

**Los 4 elementos pedidos, ni uno más** (nada de estadísticas, nada de
gráficos, nada de IA):

| # | Elemento | De dónde sale (dato ya existente) |
|---|---|---|
| 1 | Qué grabar hoy | Producciones cuya fase (`resolverFaseCopiloto`) es `"grabar"` — ya calculado hoy para el Copiloto, nunca antes agregado por tipo de acción |
| 2 | Qué editar hoy | Producciones cuya fase es `"editar"` |
| 3 | Qué publicar hoy | Producciones cuya fase es `"cierre"` |
| 4 | Botón "Reanudar Producción" | La Producción más urgente entre las tres listas de arriba — ver criterio de desempate abajo |

Cada Producción aparece en **una sola** de las tres listas (la fase de
`resolverFaseCopiloto` ya es mutuamente excluyente) — nunca se repite ni
se cuenta dos veces. Una Producción sin nada pendiente (fase `"vacio"` o
`"publicado"`) no aparece en ninguna lista.

**Cada fila lleva directo a la acción**, sin pasos intermedios:

- Fila en "Qué grabar hoy" → `.../copiloto/{escenaId}` (la escena
  concreta que toca grabar). Cuando Modo Rodaje (Sprint 7) esté
  implementado, este es el destino natural para abrirlo directamente.
- Fila en "Qué editar hoy" → `.../copiloto/editar`
- Fila en "Qué publicar hoy" → `.../copiloto/cierre`

**Formato de cada fila** (mismo lenguaje ya establecido en Sprint 5 —
"la etiqueta ES la acción"): título de la Producción + la acción
específica, ej. *"Reel — Lanzamiento → Grabar Escena 4"*, nunca un estado
genérico tipo "En progreso".

**Criterio de desempate para "Reanudar Producción"** (pendiente en
`SPRINT_1_PROPUESTA.md` desde el Sprint 1, esta propuesta lo resuelve):
orden de urgencia **Grabar > Editar > Publicar** (grabar bloquea todo lo
demás de esa Producción, es lo más urgente por definición), y dentro de
la misma categoría, la Producción con la actualización más reciente
(`updatedAt`). Es una decisión de producto, la marco explícita para que
la confirmes o la corrijas.

**Qué NO se agrega**: ningún número suelto ("3 escenas pendientes"),
ningún gráfico de progreso, ninguna sugerencia generada — todo lo que ya
armamos en Sprints anteriores (barra de progreso, desglose por estado)
vive en el Dashboard de cada Producción (Sprint 4), no acá. Esta pantalla
responde una sola pregunta, no dos.

---

## 2. Mockup

Maqueta interactiva con los tokens reales de Content OS, mostrando la
pantalla con 3 Producciones activas repartidas entre las tres listas.

*(mockup HTML compartido aparte de este documento)*

Vista en texto para referencia rápida:

```
┌───────────────────────────────────────────┐
│  ¿Qué hago ahora?                          │
│                                             │
│  ┌───────────────────────────────────┐    │
│  │  ▶ Reanudar Producción              │    │
│  │  Reel — Lanzamiento · Grabar Esc. 4 │    │
│  └───────────────────────────────────┘    │
│                                             │
│  GRABAR HOY                                │
│  · Reel — Lanzamiento → Grabar Escena 4    │
│                                             │
│  EDITAR HOY                                │
│  · Carrusel — Testimonios → Editar video   │
│                                             │
│  PUBLICAR HOY                              │
│  · Short — Tip rápido → Publicar           │
│                                             │
│  ───────────────────────────────────────   │
│  ¿Qué video querés hacer hoy?              │
│  [ campo de idea / importar Producción ]   │
└───────────────────────────────────────────┘
```

Si no hay nada pendiente en ninguna de las tres, las tres secciones y el
botón "Reanudar Producción" desaparecen — queda solo el campo de idea,
exactamente como la pantalla de hoy.

---

## 3. Flujo de navegación

```
/ (Hoy → Dashboard Hoy)
  │
  ├─ [Reanudar Producción] ──────────────► la acción más urgente
  │                                        (Grabar/Editar/Publicar,
  │                                        según desempate)
  │
  ├─ fila en "Grabar hoy" ────────────────► Rodaje, esa escena
  ├─ fila en "Editar hoy" ────────────────► Copiloto Editar
  ├─ fila en "Publicar hoy" ──────────────► Copiloto Cierre
  │
  └─ campo de idea (sin cambios) ─────────► flujo de creación ya
                                             existente (Blueprint/CPP)
```

Ningún destino es nuevo — los cuatro ya existen (Rodaje, Editar, Cierre,
el flujo de creación). Esta pantalla es exclusivamente un enrutador con
contexto, no una pantalla con lógica propia nueva.

---

## 4. Archivos que cambiarían (todavía no tocados)

- **`src/components/hoy-screen.tsx`** — reordenaría el layout (triage
  arriba, campo de idea abajo) y reemplazaría la sección "Videos en curso"
  actual por las tres listas agrupadas por acción + el botón "Reanudar
  Producción". Mismo componente, no uno nuevo.
- **`src/app/page.tsx`** — la consulta que hoy trae `produccionesEnCurso`
  (título + cantidad de escenas) necesitaría también las escenas de cada
  Producción para calcular la fase (`resolverFaseCopiloto` ya la calcula
  con esos datos) — es una consulta más rica, no una acción nueva.
- **`src/lib/actions.ts`** — posiblemente una función de lectura nueva
  (ej. `getProduccionesEnCurso` ampliada, o una función que agrupe por
  fase) — sería una función de **lectura pura**, sin escribir nada, en el
  mismo espíritu que `resolverFaseCopiloto` (que ya es lógica
  determinística, no una "función nueva" en el sentido de feature). Lo
  marco como el único punto donde este Sprint tocaría lógica, aunque sea
  de solo lectura.
- Ningún cambio de esquema.

---

## 5. Riesgos

1. **Tensión de la pantalla inicial** (ver sección "Tensión a resolver" arriba) — mi resolución (reordenar, no eliminar el campo de idea) es una decisión de diseño que tomé para no romper la regla de "único punto de entrada de creación". Si tu intención era que el campo de idea se moviera a otro lugar completamente, avisame.
2. **Criterio de desempate para "Reanudar Producción"** — propuesto (Grabar > Editar > Publicar, después por más reciente) pero es una decisión de producto que vengo señalando como pendiente desde `SPRINT_1_PROPUESTA.md`. Esta es la primera vez que se resuelve; vale tu confirmación explícita.
3. **Muchas Producciones activas a la vez** — si hay, por ejemplo, 6 Producciones repartidas en las tres listas, la pantalla deja de sentirse como "una sola pregunta" y empieza a parecerse a una lista larga. No lo resolví (¿límite de N por lista con "ver todas"? ¿nunca pasa en la práctica?) — lo señalo para cuando haya datos reales de uso.
4. **"Editar hoy" y "Publicar hoy" no tienen una escena específica** (son acciones a nivel Producción completa, no de una escena) — a diferencia de "Grabar hoy", que sí apunta a una escena concreta. Ya es así en el Copiloto de hoy (`resolverFaseCopiloto`), no es una inconsistencia nueva de este Sprint, pero vale tenerlo presente al redactar el texto de cada fila.

---

*No se modificó código. No se hizo commit. A la espera de tu aprobación
(con o sin correcciones) antes de implementar.*
