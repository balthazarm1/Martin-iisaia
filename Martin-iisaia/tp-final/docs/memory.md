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

## 3. Próximo paso lógico

- **Correr la checklist del README en el navegador.** El código está implementado y
  revisado, pero las 9 filas de verificación todavía no se ejecutaron sobre la app real.
  Es lo primero que hay que hacer antes de dar el hito por cerrado.
- Mover el filtrado al backend con `?q=` sobre `GET /api/songs`. Al volverse asíncrono
  va a necesitar debounce y estado de carga.
- Automatizar la checklist con un servidor MCP de Playwright.
- Pushear `feature/buscador-catalogo` y abrir el PR a `main`.
