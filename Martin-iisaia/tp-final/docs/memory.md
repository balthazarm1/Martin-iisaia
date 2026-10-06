# Memoria del proyecto — IndieStream

_Última actualización: 2026-10-05 · branch `feature/buscador-catalogo`_

## 1. Qué se logró

El catálogo ahora se filtra por título o artista mientras se escribe, sin recargar
la página y sin cortar la reproducción.

- **Módulo nuevo `frontend/js/search.js`.** Puro, sin DOM ni fetch: `normalize`,
  `songMatches` y `filterSongs`.
- **`catalog.js` partido en esqueleto y grid.** `renderSkeleton` dibuja una vez por
  montaje; `renderGrid` reemplaza solo el contenido de la `<section>`, así que el
  input conserva foco, texto y cursor.
- **Estados de UI:** resumen de resultados, bloque propio para cero coincidencias con
  botón Limpiar, y limpieza con Esc o con la ✕ nativa de `type="search"`.
- **Dos arreglos preexistentes** que el re-render destapó: el estado de "ya di like"
  vivía únicamente en el DOM, y el `aria-live` estaba en el `<main>`.
- **Backend sin cambios.** El contrato de la API quedó igual.

Diseño y plan quedaron versionados en `docs/superpowers/specs/` y `docs/superpowers/plans/`.

## 2. Decisiones técnicas

- El filtrado es **local**: sobre la lista que ya devolvió `GET /api/songs`. La lógica
  quedó aislada en `search.js` para que migrar a `?q=` sea cambiar un solo call site.
- Coincidencia por **subcadena insensible a mayúsculas y acentos** (`toLocaleLowerCase`
  + `NFD` + descarte de diacríticos). Consecuencia aceptada: `ñ` se normaliza a `n`,
  así que `nino` encuentra `niño`.
- La barra vive **dentro de la vista**, sobre el grid, no en el header: la búsqueda
  pertenece al catálogo y no a la Shell.
- **Sin debounce**, porque el filtrado es síncrono y en memoria. Hará falta recién
  cuando pase al backend.
- `likedIds` (un `Set`) es la fuente de verdad del estado "likeado"; `markLiked` quedó
  como actualización puntual del botón montado. El backend sigue siendo la verdad real
  y responde `409` ante un duplicado.
- **Verificación manual**, sin Node ni runner: el frontend sigue siendo Vanilla JS sin
  build. La función pura se verifica importándola desde la consola de DevTools.

## 3. Estado de la verificación

La checklist de 9 filas del README se corrió en el navegador y pasó entera:
acentos, mayúsculas, subcadena, sin coincidencias, el audio que no se corta al
filtrar la canción que suena, los likes que sobreviven al re-render, la búsqueda
que sobrevive a Reintentar, cero requests al tipear y el cursor que no se pierde.

Fuera del navegador se verificó además que los módulos ES resuelven sus imports,
que la API responde con las 3 canciones del seed, que los estáticos se sirven con
el MIME correcto, y que la lógica de coincidencia da los resultados esperados
contra el payload real de la API.

## 4. Próximo paso lógico

- El branch `feature/buscador-catalogo` ya está pusheado a `origin`. Falta abrir
  el PR a `main` desde la web (`gh` no está instalado en este entorno).
- Mover el filtrado al backend con `?q=` sobre `GET /api/songs`. Al volverse
  asíncrono va a necesitar debounce y estado de carga.
- Automatizar la checklist con un servidor MCP de Playwright.
- Pendiente menor, ya anotado en la revisión: la etiqueta `♥ Te gusta` aparece
  tanto en `renderSongCard` como en `markLiked`. Candidata a una constante
  compartida si alguna vez cambia el texto.
