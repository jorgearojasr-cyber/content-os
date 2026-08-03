# Deuda técnica registrada

Este documento existe para dejar constancia de problemas encontrados que
**no se corrigen en el momento** en que se descubren — quedan documentados
acá para una futura limpieza de infraestructura, en vez de perderse o
mezclarse silenciosamente con el trabajo que sí estaba en alcance. Ningún
ítem de esta lista se resuelve solo por estar escrito acá; cada uno necesita
su propio ticket explícito cuando se decida abordarlo.

## Deriva entre `drizzle/meta` y el esquema real (detectada 2026-08-02, PHASE-2-IMPLEMENTACION-1)

Al intentar generar una migración para dos columnas nuevas en `producciones`
(`analisisDirectorCreativoJson`, `estadoAnalisisDirectorCreativo`), `npx
drizzle-kit generate` falló con un prompt interactivo de "conflicto de
columnas" que no pudo resolverse en un entorno no interactivo.

**Causa raíz confirmada**: la tabla `producciones` (y, aparentemente,
`storyboard_escenas`) **no existe en ningún snapshot de `drizzle/meta`** —
verificado leyendo `drizzle/meta/0009_snapshot.json` (el más reciente) y
confirmando que `Object.keys(snap.tables)` no incluye `public.producciones`
en absoluto. Esto significa que, en algún punto de la historia del
proyecto, cambios de schema para esa tabla (y probablemente otras
agregadas después, como `areas`, `documentos`, `promptsGuardados`) se
aplicaron con `drizzle-kit push` (que introspecciona la base real
directamente) en vez de `drizzle-kit generate` + migración versionada — el
`drizzle/` folder y su cadena de snapshots quedaron incompletos desde
entonces, sin que ningún commit lo señalara.

**Cómo se resolvió puntualmente esta vez**: se usó `drizzle-kit push`
directo (que sí funciona, porque introspecciona la base real en vez de
depender de la cadena de snapshots rota) y se confirmó el resultado con una
consulta a `information_schema.columns` contra la base real. No se generó
ningún archivo `.sql` en `drizzle/` para este cambio — agregar uno a mano
hubiera sido un artefacto falso, dado que no encaja en una cadena de
snapshots que ya está rota para esta tabla.

**Qué implica no corregirlo todavía**:
- `drizzle-kit generate` seguirá fallando (o dando resultados no confiables)
  para cualquier cambio futuro sobre `producciones`/`storyboard_escenas`
  hasta que se resuelva.
- No hay forma de reproducir el estado exacto de esas tablas ejecutando
  `drizzle-kit migrate` desde cero — solo la base de Neon real refleja el
  estado verdadero.
- El equipo (hoy, una sola persona + Claude) necesita seguir usando
  `drizzle-kit push` para esas tablas específicas hasta que se audite y
  regenere la cadena de snapshots completa.

**Alcance de una futura limpieza** (no iniciar sin pedido explícito):
auditar todas las tablas de `src/db/schema.ts` contra `drizzle/meta`,
confirmar cuáles faltan, y decidir si se reconstruye la cadena de snapshots
desde cero (probablemente vía `drizzle-kit introspect` contra la base real)
o si el proyecto adopta `push` como su mecanismo oficial de ahora en más y
se abandona la carpeta `drizzle/` de migraciones versionadas.
