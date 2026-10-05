# Diseño: buscador del catálogo

_Fecha: 2026-10-05 · branch `feature/buscador-catalogo` · estado: aprobado en conversación, pendiente de plan de implementación_

## 1. Objetivo

Agregar una barra de búsqueda a la vista de catálogo de IndieStream que filtre las
canciones por **título o artista** mientras el usuario escribe, sin recargar la página
y sin interrumpir la reproducción en curso.

### Entendimiento acordado

Lo que pidió el usuario, textualmente: *"una barra de búsqueda en el frontend para
filtrar las canciones del catálogo por título o artista"*.

Criterios de éxito derivados de esa frase y confirmados durante el diseño:

- El filtrado ocurre **en el cliente**, sobre la lista que ya devolvió `GET /api/songs`.
- La búsqueda es tolerante a mayúsculas y a acentos: con el seed actual, escribir
  `tranvias` debe encontrar a **Los Tranvías**.
- La música no se corta nunca, ni siquiera al filtrar la canción que está sonando.
- El backend no cambia en esta fase.

Supuesto explícito, no dicho por el usuario: el catálogo seguirá siendo chico
(hoy 3 canciones de seed, sin endpoint de alta), por lo que filtrar en memoria es
proporcionado y no requiere paginación ni índices.

## 2. Decisiones cerradas

| # | Decisión | Alternativa descartada |
|---|---|---|
| D1 | Filtrado **en el cliente**, con la lógica aislada para poder migrarla a `?q=` después | Agregar `?q=` al backend ahora |
| D2 | Coincidencia por **subcadena, sin mayúsculas ni acentos**, contra título y artista | `LIKE` simple (falla con *Tranvías*); búsqueda por tokens AND |
| D3 | La barra vive **dentro de la vista, sobre el grid** (opción B de los mockups) | En el header de la Shell; sub-barra sticky propia |
| D4 | **Módulo puro + re-render del grid**: `search.js` sin DOM, `catalog.js` reemplaza solo la `<section>` | Ocultar tarjetas con `hidden`; store centralizado con suscriptores |
| D5 | Verificación **manual** por ahora; la automatización se delega a Playwright MCP en la fase siguiente | `node --test` sobre la función pura; `pytest` + `TestClient` |

## 3. Restricciones

- **Prohibido introducir Node.js o cualquier herramienta de build en el frontend.**
  Sigue siendo Vanilla JS con ES Modules servido estáticamente por FastAPI.
  (El servidor de brainstorming que se usó para los mockups corre en la caché del
  plugin, fuera del repo, y no es una dependencia del proyecto.)
- Prohibido `location.reload()` y `<a href>` de navegación (`.claude/rules/frontend.md`).
- Ningún archivo supera las 300 líneas; ninguna función, las 50 (`CLAUDE.md`).
- Todo texto que venga del servidor se inserta con `textContent` vía el helper `el()`,
  nunca con `innerHTML`.

## 4. Arquitectura

### 4.1 Módulo nuevo: `frontend/js/search.js`

Sin imports, sin acceso al DOM, ~30 líneas. Es la única pieza que se reemplaza el día
que el filtrado pase al backend.

| Función | Contrato |
|---|---|
| `normalize(text)` | `trim` → `toLocaleLowerCase('es')` → normalización `NFD` → eliminación de diacríticos. `"Los Tranvías"` → `"los tranvias"` |
| `songMatches(song, normalizedQuery)` | `true` si `normalizedQuery` es subcadena del título **o** del artista normalizados. Recibe la query ya normalizada |
| `filterSongs(songs, query)` | Normaliza la query una sola vez y delega en `songMatches`. Query vacía → devuelve `songs` tal cual, sin copiar |

**Consecuencia aceptada:** eliminar diacríticos también transforma `ñ` en `n`, por lo que
`nino` encontraría `niño`. Para un buscador es el comportamiento deseable; queda
documentado para que no sorprenda.

### 4.2 Refactor de `frontend/js/views/catalog.js`

Estado del módulo: `allSongs` (array, fuente de verdad devuelta por el fetch, en el orden
del servidor), `query` (string) y `likedIds` (`Set`). El `Map` `songsById` se conserva como
índice derivado de `allSongs`, porque `onContainerClick` lo necesita para resolver
`playTrack(songsById.get(id))` incluso mientras hay un filtro activo. Se reconstruye una
sola vez, al recibir el fetch, nunca al filtrar.

El render se parte en dos responsabilidades:

- **`renderSkeleton(container)`** — se ejecuta **una vez por montaje**: el `<h2>`, la barra
  de búsqueda, la línea de resumen (vacía) y una `<section class="song-grid">` vacía.
- **`renderGrid()`** — calcula `filterSongs(allSongs, query)` y con el resultado hace dos
  cosas: `replaceChildren` **solo sobre la `<section>`**, y actualiza el `textContent` de la
  línea de resumen. El input jamás forma parte de ningún nodo reemplazado, así que conserva
  foco, texto y posición del cursor sin necesidad de restaurarlos a mano.

El listener del input se limita a `query = input.value; renderGrid();`.

`renderGrid()` termina **siempre** llamando a `highlightPlaying(getCurrentSongId(), isPlaying())`,
porque las tarjetas son nodos nuevos y hay que restaurar el borde verde y el texto
`❚❚ Pausar` de la canción en reproducción.

### 4.3 Flujo de datos

```text
GET /api/songs ─────> allSongs ──┐
                                 │   (search.js, puro, sin DOM)
input 'search' ────> query ──────┴──> filterSongs(allSongs, query)
                                              │
                                              ▼
                                   renderGrid() · replaceChildren
                                   SOLO en .song-grid
                                              │
                                              ▼
                              highlightPlaying(getCurrentSongId(), isPlaying())
```

`player.js` y el elemento `<audio>` **no se tocan en absoluto**. Si al filtrar la canción
que suena deja de coincidir, desaparece su tarjeta del grid pero la música continúa y la
barra inferior la sigue mostrando; al borrar la búsqueda, la tarjeta reaparece con su
resaltado intacto.

### 4.4 Migración futura a `?q=`

Cambiar `filterSongs(allSongs, query)` por `await getSongs({ q: query })` en un único
call site. El layout, el esqueleto y los estados de UI no se tocan. Esa fase sí
requerirá debounce y estado de carga, porque pasará a ser asíncrona.

## 5. Arreglos acotados incluidos

Dos defectos preexistentes que este cambio activa y que, por tanto, entran en el alcance.

### 5.1 El estado de "ya di like" vive solo en el DOM

Hoy `markLiked()` deshabilita el botón y `handleLike()` escribe el contador en el `<span>`,
pero ninguno actualiza el objeto de `songsById` (`catalog.js:67-68`). Con un render único
no se nota; al re-renderizar el grid en cada tecla, los botones volverían a *"♥ Like"* y el
contador mostraría el `likes_count` viejo del fetch inicial.

**Arreglo:** `likedIds` pasa a ser la fuente de verdad y `markLiked()` se vuelve un derivado.

- Like exitoso → `songsById.get(id).likes_count = like.likes_count` **y** `likedIds.add(id)`.
  El `Map` guarda referencias a los mismos objetos del array `allSongs`, así que una sola
  asignación actualiza ambas vistas del dato.
- `409` → `likedIds.add(id)` (el backend ya lo sabía). No se toca `likes_count`, porque esa
  respuesta no trae un total nuevo.
- `renderSongCard(song)` consulta `likedIds.has(song.id)` y pinta el botón ya marcado y
  deshabilitado, en lugar de que `markLiked()` sea quien origina ese estado.

El `Set` es por sesión de página y no persiste: la verdad sigue siendo el backend, que
responde `409` ante un duplicado.

### 5.2 `aria-live` en el contenedor equivocado

`index.html:23` declara `<main id="view" aria-live="polite">`. Con un render único es
inofensivo; al re-renderizar el grid por cada tecla, un lector de pantalla releería el
catálogo entero letra por letra.

**Arreglo:** quitar `aria-live` del `<main>` y moverlo a la línea de resumen, que es la que
realmente condensa el cambio. El usuario escucha *"Mostrando 1 de 3 canciones"* en lugar
de las tres tarjetas completas.

## 6. Comportamiento de la interfaz

| Estado | Condición | Qué se ve |
|---|---|---|
| Sin búsqueda | `query === ""` | Las 3 tarjetas y el resumen *"3 canciones"* |
| Con coincidencias | hay resultados | Las tarjetas que coinciden y *"Mostrando N de M canciones"* |
| Sin coincidencias | `query !== ""` y 0 resultados | *"Ninguna canción coincide con «zzz»"* y un botón **Limpiar búsqueda** |
| Catálogo vacío | el servidor devolvió 0 canciones | *"Todavía no hay canciones"* — mensaje distinto, no se mezcla con el anterior |

Los tres primeros estados comparten el esqueleto: la barra de búsqueda está presente y solo
cambia el contenido del grid y del resumen. El cuarto es distinto a propósito: cuando el
servidor devuelve 0 canciones se mantiene el camino actual (`renderStatus` reemplaza el
contenedor entero y **no se dibuja la barra de búsqueda**), porque ofrecer un buscador sobre
un catálogo vacío no tiene sentido. Lo mismo vale para el estado de error con *Reintentar*.

Detalles fijados:

- **Contador siempre visible**, y es además el nodo con `aria-live="polite"`.
- **Limpiar** con la ✕ nativa de `type="search"` y con la tecla <kbd>Esc</kbd>, que vacía
  el campo y deja el foco en él. No se agrega un botón propio en la barra.
- El input lleva `type="search"`, `aria-label="Buscar canciones por título o artista"`,
  `autocomplete="off"` y un `placeholder` que actúa solo como pista, nunca como etiqueta única.
- **La búsqueda sobrevive a "Reintentar"**: `query` es estado del módulo, así que si el fetch
  falla y luego se reintenta con éxito, el esqueleto se rearma con el texto ya tecleado.

## 7. Manejo de errores

El filtrado es **síncrono, local y no puede fallar**: no hay `fetch`, no hay promesa y no
corresponde un estado "Cargando…". La regla de `frontend.md` sobre estados de carga aplica
a acciones asíncronas, y ésta no lo es; agregar un spinner sería decorativo.

El manejo de errores existente queda intacto: si `getSongs()` falla se sigue mostrando el
mensaje con **Reintentar**, y `likeSong` conserva su `withLoading`, su `409` y su banner.

## 8. Fuera de alcance

- Debounce (innecesario mientras el filtrado sea local y síncrono).
- El parámetro `?q=` en el backend y cualquier cambio al contrato de la API.
- Persistir la búsqueda en la URL o en `localStorage`.
- Resaltar el fragmento coincidente dentro de la tarjeta.
- Filtrar por otros campos, ordenar resultados o paginar.
- Cualquier runner de tests en el frontend.

## 9. Verificación

Manual, en el navegador, contra el seed actual. Esta tabla es también el guion que
automatizará Playwright MCP en la fase siguiente.

| # | Paso | Esperado |
|---|---|---|
| 1 | Tipear `tranvias` | Aparece *Garage Session #2* — acentos normalizados |
| 2 | Tipear `LUNA` | Aparece *Maqueta Nocturna* — mayúsculas ignoradas |
| 3 | Tipear `do` | Solo *Arpegio en Do* — subcadena, no prefijo |
| 4 | Tipear `zzz` | Mensaje de sin coincidencias y botón Limpiar |
| 5 | Reproducir track 1 y buscar `arpegio` | La música **no** se corta; la barra inferior sigue mostrando *Maqueta Nocturna* |
| 6 | Dar like, luego tipear y borrar | El botón sigue en *♥ Te gusta* deshabilitado y el contador conserva el valor nuevo |
| 7 | Apagar el servidor, pulsar Reintentar, volver a levantarlo | El texto tecleado sigue en el input |
| 8 | DevTools ▸ Network mientras se tipea | **Cero requests** y cero navegaciones de documento |
| 9 | Tipear rápido | El cursor nunca se pierde |

El paso 8 demuestra la decisión D1; el paso 6 es el que fallaría sin el arreglo 5.1.

## 10. Archivos afectados

| Archivo | Cambio |
|---|---|
| `frontend/js/search.js` | **Nuevo.** ~30 líneas, puro, sin DOM |
| `frontend/js/views/catalog.js` | Esqueleto + grid, `likedIds`, listeners del buscador |
| `frontend/index.html` | Mover `aria-live` fuera del `<main>` |
| `frontend/css/styles.css` | `.search-bar`, `.search-summary`, estado sin coincidencias |
| `README.md` | Sección de verificación manual del buscador |
| `docs/memory.md` | Bitácora del hito |

El backend no se modifica. El contrato de la API queda igual.

## 11. Fase siguiente

1. Mover el filtrado al backend con `?q=` sobre `GET /api/songs` (un solo call site en el frontend, más debounce y estado de carga).
2. Automatizar la tabla de la sección 9 con un servidor MCP de Playwright.
