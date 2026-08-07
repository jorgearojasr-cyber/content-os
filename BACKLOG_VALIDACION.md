# BACKLOG_VALIDACION.md

> Fase 2 — Validación. Este documento solo registra problemas ya
> detectados durante los Sprints 1 a 8 de CONTENT OS V2 — no propone
> soluciones, no crea tareas técnicas. Nada de esto se implementa hasta
> nueva orden.

---

### 1. Cinco módulos sin definición en la nueva arquitectura por dominios

**Problema**: Identidad, Personajes, Avatares, Segundo Cerebro, Calendario
y Áreas no aparecen en la lista de dominios del Sprint 1 (Producciones,
Escenas, Recursos, Miniaturas, Publicación, Biblioteca, Configuración).
**Impacto**: no está definido si se mantienen, se deprecian o se
reorganizan — cualquier decisión de alcance sobre ellos queda sin
resolver.
**Prioridad**: Media
**Estado**: Pendiente

---

### 2. `actions.ts` concentra la escritura de las 15 tablas del sistema

**Problema**: un solo archivo (más de 2700 líneas) es el único punto de
escritura de todo el modelo de datos.
**Impacto**: cualquier reorganización futura por dominio va a tocar ese
archivo casi con certeza, con más riesgo de conflictos o errores al
modificarlo.
**Prioridad**: Media
**Estado**: Pendiente

---

### 3. Dos arquitecturas de IA conviviendo en el proyecto

**Problema**: `ai-provider.ts`/`imagen-provider.ts` llaman directamente a
proveedores de IA (Anthropic/OpenAI), a diferencia del patrón "Nivel A"
que usa el resto del sistema (nunca llamar IA directamente).
**Impacto**: dos criterios distintos conviven sobre qué es y qué no es
Content OS respecto a IA.
**Prioridad**: Media
**Estado**: Pendiente

---

### 4. Miniaturas y Plantillas sin modelo de datos propio

**Problema**: dentro de la Biblioteca de Producción (congelada), dos de
los cinco tipos de elemento no tienen ninguna tabla ni entidad hoy.
**Impacto**: cualquier avance en esos dos tipos requiere antes una
decisión de producto sobre su forma.
**Prioridad**: Baja
**Estado**: Pendiente

---

### 5. `/biblioteca` ya tiene otro propósito

**Problema**: la ruta ya existe hoy como archivo histórico de `bloques`
(contenido del viejo flujo "Crear", ya deprecado).
**Impacto**: repropósitarla implica que el archivo histórico deja de ser
lo primero que se ve al entrar.
**Prioridad**: Baja
**Estado**: Pendiente

---

### 6. Reutilizar una Escena entre Marcas distintas rompería referencias

**Problema**: Personaje/Locación/Plano son ids específicos de cada
Proyecto — copiar una Escena a una Producción de otra Marca no tiene
adónde apuntar esas referencias.
**Impacto**: una reutilización simple (copiar tal cual) fallaría o
perdería esos vínculos al cruzar de Marca.
**Prioridad**: Media
**Estado**: Pendiente

---

### 7. "Reanudar Producción" puede no ser la que el usuario tenía en mente

**Problema**: el criterio usa `updatedAt`, que se actualiza con cualquier
edición — no distingue "la abrí y la miré" de "la edité de verdad".
**Impacto**: el botón puede apuntar a una Producción distinta de la que
el usuario realmente quería continuar.
**Prioridad**: Alta
**Estado**: Pendiente

---

### 8. Sin límite definido de cuántas Producciones puede mostrar el Dashboard Hoy

**Problema**: la lista de acciones (Grabar/Editar/Publicar) no tiene tope.
**Impacto**: con muchas Producciones activas a la vez, la pantalla deja de
sentirse como "una sola pregunta, una sola respuesta".
**Prioridad**: Media
**Estado**: Pendiente

---

### 9. Inconsistencia de nivel de detalle en la lista del Dashboard Hoy

**Problema**: "Grabar hoy" apunta a una escena específica; "Editar hoy" y
"Publicar hoy" apuntan solo a la Producción completa.
**Impacto**: las filas de la misma lista no tienen el mismo nivel de
especificidad.
**Prioridad**: Baja
**Estado**: Pendiente

---

### 10. Sección "Qué falta para publicar" puede quedar desbalanceada en Edición

**Problema**: si la Producción no tiene hallazgos del Director Creativo
(por ejemplo, importada por CreatorOS Production Package), la sección
queda con un solo ítem.
**Impacto**: la pantalla se ve incompleta en ese caso, aunque no sea un
error real.
**Prioridad**: Baja
**Estado**: Pendiente

---

### 11. El panel Director de Edición es grande frente al resto de la pantalla de Edición

**Problema**: en Producciones con muchas escenas, el plan de edición
(escena por escena) puede ser mucho más largo que el resto del contenido
de la sección "Qué falta para publicar".
**Impacto**: la pantalla puede sentirse desbalanceada entre una sección
muy larga y una muy corta.
**Prioridad**: Baja
**Estado**: Pendiente

---

### 12. "Finalizar escena" en Modo Rodaje combina dos efectos sin garantía transaccional

**Problema**: el botón (diseñado, sin implementar todavía) marca la
escena como grabada y avanza a la siguiente en un solo paso.
**Impacto**: si algo falla justo entre ambos efectos (ej. corte de red),
la escena queda grabada pero la pantalla no avanzó.
**Prioridad**: Media
**Estado**: Pendiente

---

### 13. Modo Rodaje no define el caso de guion vacío o muy largo

**Problema**: con la referencia visual ocupando un tercio de la pantalla,
queda menos espacio para el guion — el caso de escenas sin texto (B-roll)
o con texto largo no está resuelto.
**Impacto**: esas escenas podrían verse mal en la pantalla de grabación.
**Prioridad**: Baja
**Estado**: Pendiente

---

### 14. Vuelta automática al Dashboard al terminar el Rodaje, sin confirmación

**Problema**: al grabar la última escena, Modo Rodaje redirige solo,
sin que el usuario confirme nada.
**Impacto**: no hay forma de quedarse mirando la pantalla de cierre más
que un instante.
**Prioridad**: Baja
**Estado**: Pendiente

---

### 15. Criterio "Referencia visual" vs. "Recurso" no es obvio desde la interfaz

**Problema**: la distinción depende de `activos.tipo === "foto"`, un
detalle interno que no se ve reflejado en ningún texto de la Biblioteca
propuesta.
**Impacto**: riesgo de confusión futura sobre qué elemento entra en cada
categoría.
**Prioridad**: Baja
**Estado**: Pendiente

---

### 16. Recursos de un CreatorOS Production Package no se resuelven contra la Biblioteca al importar

**Problema**: a diferencia de Personaje/Locación, los Recursos del
paquete se muestran de solo lectura, sin vincularlos a nada existente.
**Impacto**: un Recurso mencionado en un guion importado queda suelto,
sin conexión con la Biblioteca real.
**Prioridad**: Baja
**Estado**: Pendiente

---

### 17. Salir de Modo Rodaje depende solo de la navegación del sistema

**Problema**: no hay ningún control propio dentro de la pantalla para
salir — solo el gesto/botón "atrás" del navegador o del teléfono.
**Impacto**: en contextos donde ese gesto no es evidente, el usuario
podría no encontrar cómo salir.
**Prioridad**: Media
**Estado**: Validado (decisión confirmada explícitamente por el usuario
en la corrección del Sprint 7)

---

### 18. La pantalla Hoy combina dos objetivos distintos en un solo lugar

**Problema**: agenda de trabajo diario (Grabar/Editar/Publicar/Reanudar)
y arranque de contenido nuevo (campo de idea) conviven en la misma
pantalla, aunque reordenados.
**Impacto**: si ambos objetivos necesitan espacio a la vez (muchas
Producciones activas y, además, ganas de arrancar algo nuevo), la
pantalla puede crecer en complejidad visual.
**Prioridad**: Baja
**Estado**: Pendiente

---

### 19. La confirmación "Grabado ✓ · Editado ✓" en Publicación no aportaba información nueva

**Problema**: ese dato es siempre verdadero por construcción — no se
puede llegar a la pantalla de Publicación sin que ambas cosas ya sean
ciertas.
**Impacto**: redundancia visual sin valor informativo real.
**Prioridad**: Baja
**Estado**: Descartado (reemplazada por "Estado 🟢 Listo para publicar"
en la corrección del usuario)

---

*19 ítems — dentro del máximo de 20. No se modificó código. No se hizo
commit.*
