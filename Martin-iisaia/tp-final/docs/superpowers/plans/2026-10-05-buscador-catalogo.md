# Buscador del catálogo — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Filtrar el catálogo de IndieStream por título o artista desde el frontend, mientras el usuario escribe, sin recargar la página y sin interrumpir la reproducción.

**Architecture:** Un módulo puro `search.js` (sin DOM, sin fetch) concentra toda la lógica de coincidencia. `catalog.js` pasa a tener un esqueleto estable —título, barra de búsqueda, línea de resumen y una `<section>` vacía— y en cada tecla reemplaza únicamente el contenido de esa `<section>`, de modo que el input nunca se destruye. El backend no se toca.

**Tech Stack:** Vanilla JS con ES Modules, sin build ni dependencias. FastAPI sirve el frontend como archivos estáticos. Navegador para toda la verificación.

**Spec:** `docs/superpowers/specs/2026-10-05-buscador-catalogo-design.md`

## Global Constraints

- **Prohibido introducir Node.js o cualquier herramienta de build en el frontend.** Sigue siendo Vanilla JS con ES Modules servido estáticamente por FastAPI.
- Prohibido `location.reload()` y `<a href>` de navegación (`.claude/rules/frontend.md`).
- Ningún archivo supera las 300 líneas; ninguna función, las 50 (`CLAUDE.md`).
- Todo texto proveniente del servidor o del usuario se inserta con `textContent`, vía el helper `el()` de `ui.js`. Nunca `innerHTML`.
- El backend no se modifica. El contrato de `GET /api/songs` y `POST /api/songs/{id}/like` queda igual.
- El elemento `<audio>` y `player.js` no se tocan en ninguna tarea.
- Idioma de todo el texto visible y de los comentarios: español, como el resto del proyecto.

**Arranque del servidor, idéntico en todas las tareas** (desde `tp-final/`):

```bash
uv run fastapi dev backend/main.py
```

La app queda en `http://localhost:8000`. Recargá con `Ctrl+Shift+R` después de cada cambio en JS o CSS, porque el navegador cachea los módulos.

## Review Focus

Cinco entradas que el spec implica pero que es fácil dejar sin cubrir. Cada una tiene su verificación asignada a la tarea que posee el código.

1. **Query de solo espacios** (`"   "`) debe comportarse como "sin búsqueda" y mostrar las 3 canciones, no como "0 resultados". → Tarea 1 y Tarea 4.
2. **Query en mayúsculas y con acento** (`TRANVÍAS`) debe encontrar a *Los Tranvías*: hay que bajar a minúsculas **y** quitar diacríticos, en ese orden. → Tarea 1.
3. **Query con caracteres HTML** (`<b>hola</b>`) debe aparecer literal dentro del mensaje de "sin coincidencias", nunca interpretarse como marcado. → Tarea 4.
4. **<kbd>Esc</kbd> con el input ya vacío** debe ser un no-op: ni error, ni re-render, ni pérdida de foco. → Tarea 4.
5. **La canción que suena se filtra y después vuelve**: al limpiar la búsqueda, su tarjeta debe recuperar el borde verde y el texto `❚❚ Pausar`. → Tarea 4.

---

## Estructura de archivos

| Archivo | Responsabilidad | Tarea |
|---|---|---|
| `frontend/js/search.js` | **Nuevo.** Lógica de coincidencia, pura y sin DOM. Única pieza que cambia al migrar a `?q=` | 1 |
| `frontend/js/views/catalog.js` | Esqueleto + grid, estado de la vista, listeners del buscador y del like | 2, 3, 4 |
| `frontend/css/styles.css` | Estilos de la barra, el resumen y el estado sin coincidencias | 4 |
| `frontend/index.html` | Mover `aria-live` fuera del `<main>` | 5 |
| `README.md` | Checklist de verificación manual del buscador | 6 |
| `docs/memory.md` | Bitácora del hito | 6 |

---

### Task 1: Módulo de búsqueda puro

**Files:**
- Create: `frontend/js/search.js`
- Test: verificación en la consola de DevTools (no hay runner; ver Global Constraints)

**Interfaces:**
- Consumes: nada. El módulo no importa nada y no toca el DOM.
- Produces:
  - `normalize(text: string) -> string`
  - `songMatches(song: {title: string, artist: string}, normalizedQuery: string) -> boolean`
  - `filterSongs(songs: Song[], query: string) -> Song[]` — devuelve el mismo array recibido (sin copiar) cuando la query normalizada es `''`

- [ ] **Step 1: Escribir el arnés de verificación que falla**

Levantá el servidor, abrí `http://localhost:8000`, abrí DevTools ▸ Console y pegá esto. Guardalo también en el portapapeles: lo vas a reusar en el Step 4.

```js
const s = await import('/js/search.js');
const songs = [
  { id: 1, title: 'Maqueta Nocturna', artist: 'Luna Ferro' },
  { id: 2, title: 'Garage Session #2', artist: 'Los Tranvías' },
  { id: 3, title: 'Arpegio en Do',    artist: 'Synth Casero' },
];
const t = (label, actual, expected) => console.log(
  JSON.stringify(actual) === JSON.stringify(expected)
    ? `PASS  ${label}`
    : `FAIL  ${label} → ${JSON.stringify(actual)} (esperaba ${JSON.stringify(expected)})`
);
const ids = (q) => s.filterSongs(songs, q).map((x) => x.id);

t('normalize quita acentos',        s.normalize('Los Tranvías'), 'los tranvias');
t('normalize baja mayus acentuadas', s.normalize('TRANVÍAS'),     'tranvias');
t('normalize recorta espacios',      s.normalize('   '),          '');
t('busca sin tilde',        ids('tranvias'), [2]);
t('ignora mayusculas',      ids('LUNA'),     [1]);
t('mayus + tilde',          ids('TRANVÍAS'), [2]);
t('subcadena, no prefijo',  ids('do'),       [3]);
t('sin coincidencias',      ids('zzz'),      []);
t('query vacia devuelve todo',   ids(''),    [1, 2, 3]);
t('solo espacios devuelve todo', ids('   '), [1, 2, 3]);
t('matchea por artista',    ids('synth'),    [3]);
```

- [ ] **Step 2: Ejecutarlo para confirmar que falla**

Expected: la primera línea revienta con `Failed to fetch dynamically imported module: http://localhost:8000/js/search.js` (404 — el archivo todavía no existe). Ninguna línea `PASS`.

- [ ] **Step 3: Escribir la implementación mínima**

Crear `frontend/js/search.js`:

```js
// Filtrado del catálogo. Módulo puro: sin DOM, sin fetch, sin imports.
// Es la única pieza que cambia cuando el filtrado pase al backend (?q=).

const DIACRITICOS = /\p{Diacritic}/gu;

/**
 * Lleva un texto a su forma comparable: sin espacios al borde, en minúsculas
 * y sin acentos. "Los Tranvías" -> "los tranvias".
 */
export function normalize(text) {
    return String(text ?? '')
        .trim()
        .toLocaleLowerCase('es')
        .normalize('NFD')
        .replace(DIACRITICOS, '');
}

/**
 * True si la consulta aparece en el título o en el artista.
 * Espera `normalizedQuery` YA normalizada: se normaliza una vez por búsqueda,
 * no una vez por canción.
 */
export function songMatches(song, normalizedQuery) {
    return normalize(song.title).includes(normalizedQuery)
        || normalize(song.artist).includes(normalizedQuery);
}

/**
 * Filtra el catálogo. Una query vacía o de solo espacios devuelve la lista
 * original tal cual, sin copiarla.
 */
export function filterSongs(songs, query) {
    const normalizada = normalize(query);
    if (normalizada === '') return songs;
    return songs.filter((song) => songMatches(song, normalizada));
}
```

Sobre el orden de `toLocaleLowerCase('es')` y `normalize('NFD')`: respetá el de arriba, pero
sabé que **no es load-bearing**. Se comprobó con `TRANVÍAS`, `Los Tranvías`, `NIÑO`, `Ángela`
y `ÉXITO` que invertirlos da exactamente el mismo resultado, porque quitar diacríticos y
bajar a minúsculas conmutan en el rango latino. Se mantiene minúsculas primero por una razón
menor: así `normalize` se lee como "pasar a forma canónica y después limpiar", y la operación
de locale opera sobre el texto original en vez de sobre uno ya mutilado.

- [ ] **Step 4: Ejecutar el arnés para confirmar que pasa**

Recargá con `Ctrl+Shift+R` (el import dinámico se cachea) y volvé a pegar el bloque del Step 1.
Expected: **11 líneas `PASS`, cero `FAIL`.**

- [ ] **Step 5: Commit**

```bash
git add frontend/js/search.js
git commit -m "feat(frontend): módulo puro de búsqueda del catálogo

normalize/songMatches/filterSongs sin DOM ni fetch. Coincidencia por
subcadena insensible a mayúsculas y acentos sobre título y artista.
Aislado a propósito: es el único punto que cambia al migrar a ?q=."
```

---

### Task 2: Partir el render de la vista en esqueleto y grid

Esta tarea **no cambia nada visible**. Prepara el terreno: separa lo que se dibuja una vez de lo que se redibuja en cada filtrado. Un revisor debe poder aprobarla o rechazarla mirando solo si la separación es correcta.

**Files:**
- Modify: `frontend/js/views/catalog.js:35-41` (`renderList`) y `:94-104` (`mountCatalog`)
- Test: verificación en el navegador y en la consola

**Interfaces:**
- Consumes: `el`, `showError`, `withLoading` de `../ui.js`; `getCurrentSongId`, `isPlaying`, `playTrack` de `../player.js`; `getSongs`, `likeSong`, `ApiError` de `../api.js`.
- Produces, como estado y funciones de módulo que las Tareas 3 y 4 van a usar:
  - `allSongs: Song[]` — fuente de verdad, en el orden del servidor
  - `gridEl: HTMLElement | null` — la `<section class="song-grid">` viva
  - `renderSkeleton(container: HTMLElement) -> void` — dibuja el esqueleto una sola vez por montaje
  - `renderGrid() -> void` — recalcula y reemplaza **solo** el contenido de `gridEl`

- [ ] **Step 1: Escribir la verificación que falla**

Con el servidor arriba y `http://localhost:8000` cargado, en la consola:

```js
const mod = await import('/js/views/catalog.js');
console.log('exporta renderGrid?', typeof mod.renderGrid);
console.log('hay .song-grid?', Boolean(document.querySelector('.song-grid')));
```

- [ ] **Step 2: Ejecutarlo para confirmar que falla**

Expected: `exporta renderGrid? undefined`. (La segunda línea ya dice `true` hoy, porque el grid existe; lo que falta es poder redibujarlo solo a él.)

- [ ] **Step 3: Escribir la implementación**

En `frontend/js/views/catalog.js`, agregar el estado de módulo junto a `songsById`:

```js
const songsById = new Map();
let allSongs = [];
let gridEl = null;
let listenersReady = false;
```

Borrar `renderList` por completo y poner en su lugar:

```js
function renderSkeleton(container) {
    gridEl = el('section', { className: 'song-grid' });
    container.replaceChildren(
        el('h2', { className: 'view-title', text: 'Catálogo' }),
        gridEl,
    );
}

export function renderGrid() {
    gridEl.replaceChildren(...allSongs.map(renderSongCard));
    highlightPlaying(getCurrentSongId(), isPlaying());
}
```

Y reemplazar el cuerpo de `mountCatalog` por:

```js
export async function mountCatalog(container) {
    setupListeners(container);
    renderStatus(container, 'Cargando catálogo...');
    try {
        const songs = await getSongs();
        if (songs.length === 0) {
            renderStatus(container, 'Todavía no hay canciones');
            return;
        }
        allSongs = songs;
        songsById.clear();
        songs.forEach((song) => songsById.set(song.id, song));
        renderSkeleton(container);
        renderGrid();
    } catch (err) {
        renderStatus(container, `No se pudo cargar el catálogo: ${err.message}`, true);
    }
}
```

Dos cosas a tener presentes:

- `renderGrid` se exporta **solo** para poder verificarlo desde la consola en ésta y en la Tarea 3. No lo importa ningún otro módulo.
- Cuando `renderStatus` toma el control (catálogo vacío o error), reemplaza el contenedor entero y `gridEl` queda apuntando a un nodo desconectado. Es inofensivo: en esos caminos no hay input ni listener que pueda llamar a `renderGrid`.

- [ ] **Step 4: Verificar que pasa**

Recargá con `Ctrl+Shift+R` y comprobá en orden:

1. El catálogo se ve **exactamente igual que antes**: las 3 tarjetas, cada una con ▶ Reproducir, ♥ Like y su contador.
2. `▶ Reproducir` en *Maqueta Nocturna* suena y la tarjeta toma el borde verde.
3. En la consola, con la música sonando:
   ```js
   const mod = await import('/js/views/catalog.js');
   mod.renderGrid();
   ```
   Expected: el grid se repinta, **la música no se corta**, y la tarjeta que suena conserva el borde verde y el texto `❚❚ Pausar` (eso prueba que `renderGrid` llama a `highlightPlaying` al final).
4. DevTools ▸ Network: ningún request nuevo al ejecutar `renderGrid()`.

- [ ] **Step 5: Commit**

```bash
git add frontend/js/views/catalog.js
git commit -m "refactor(frontend): separar esqueleto y grid en la vista de catálogo

renderSkeleton dibuja una vez por montaje; renderGrid reemplaza solo el
contenido de la <section>. Sin cambios visibles. Habilita re-renderizar
la lista sin destruir los controles de la vista."
```

---

### Task 3: Que el estado de "ya di like" sobreviva al re-render

Arregla un defecto preexistente: hoy "ya di like" vive únicamente en el DOM, así que el re-render de la Tarea 2 lo borraría. Sin esto, cada tecla de la Tarea 4 revertiría los botones y mostraría contadores viejos.

**Files:**
- Modify: `frontend/js/views/catalog.js` — `renderSongCard`, `handleLike`, estado de módulo

**Interfaces:**
- Consumes: `allSongs`, `songsById`, `renderGrid` de la Tarea 2.
- Produces: `likedIds: Set<number>` como fuente de verdad del estado "likeado". `renderSongCard` pasa a derivar el aspecto del botón de ese `Set`.

- [ ] **Step 1: Escribir la verificación que falla**

Recargá la página. Dale ♥ Like a *Maqueta Nocturna* con un nickname válido en el header y anotá el contador que queda (por ejemplo `1`). Después, en la consola:

```js
const mod = await import('/js/views/catalog.js');
mod.renderGrid();
const card = document.querySelector('.song-card');
const btn = card.querySelector('[data-action="like"]');
console.log('texto del boton:', btn.textContent);        // esperado: ♥ Te gusta
console.log('deshabilitado:',   btn.disabled);           // esperado: true
console.log('contador:',        card.querySelector('.like-count').textContent);
```

- [ ] **Step 2: Ejecutarlo para confirmar que falla**

Expected, **antes** del arreglo:
```
texto del boton: ♥ Like
deshabilitado:   false
contador:        0
```
El like se perdió de la pantalla y el contador volvió al valor del fetch inicial. Éste es exactamente el bug que la Tarea 4 dispararía en cada tecla.

- [ ] **Step 3: Escribir la implementación**

Agregar el `Set` al estado de módulo:

```js
const songsById = new Map();
const likedIds = new Set();
let allSongs = [];
let gridEl = null;
let listenersReady = false;
```

Reemplazar `renderSongCard` entera para que derive el botón del `Set`:

```js
function renderSongCard(song) {
    const liked = likedIds.has(song.id);
    const likeBtn = el('button', {
        type: 'button',
        className: liked ? 'btn btn-like is-liked' : 'btn btn-like',
        text: liked ? '♥ Te gusta' : '♥ Like',
        dataset: { action: 'like', id: song.id },
    });
    likeBtn.disabled = liked;
    return el('article', { className: 'song-card', dataset: { songId: song.id } }, [
        el('div', { className: 'song-meta' }, [
            el('h3', { className: 'song-title', text: song.title }),
            el('p', { className: 'song-artist', text: song.artist }),
        ]),
        el('div', { className: 'song-actions' }, [
            el('button', { type: 'button', className: 'btn btn-play', text: '▶ Reproducir', dataset: { action: 'play', id: song.id } }),
            likeBtn,
            el('span', { className: 'like-count', text: String(song.likes_count) }),
        ]),
    ]);
}
```

En `handleLike`, registrar el like en el estado además de en el DOM. El bloque `try/catch` queda así:

```js
    try {
        const like = await withLoading(button, 'Cargando...', () => likeSong(songId, nickname));
        songsById.get(songId).likes_count = like.likes_count;
        likedIds.add(songId);
        button.parentElement.querySelector('.like-count').textContent = String(like.likes_count);
        markLiked(button);
    } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
            likedIds.add(songId);
            markLiked(button);
            showError('Ya diste like a esta canción');
        } else {
            showError(`No se pudo registrar el like: ${err.message}`);
        }
    }
```

`markLiked(button)` se conserva sin cambios: sigue siendo útil para actualizar el botón ya montado sin repintar el grid entero. La diferencia es que ahora es un **derivado** de `likedIds`, no el origen del estado.

Por qué `songsById.get(songId)` y no buscar en `allSongs`: el `Map` guarda referencias a los mismos objetos del array, así que una sola asignación actualiza ambas vistas del dato. Y en el `409` no se toca `likes_count` a propósito: esa respuesta no trae un total nuevo.

- [ ] **Step 4: Verificar que pasa**

Recargá con `Ctrl+Shift+R`. El like de la verificación anterior ya está en la base, así que esta vez el `POST` va a devolver `409` — es un caso igual de válido para la prueba. Dale ♥ Like a *Maqueta Nocturna*, aceptá el banner "Ya diste like a esta canción", y volvé a correr el bloque del Step 1.

Expected:
```
texto del boton: ♥ Te gusta
deshabilitado:   true
contador:        1
```

Si querés probar el camino del `201` en limpio, cambiá el nickname del header por uno nuevo y repetí.

- [ ] **Step 5: Commit**

```bash
git add frontend/js/views/catalog.js
git commit -m "fix(frontend): el estado de like deja de vivir solo en el DOM

likedIds pasa a ser la fuente de verdad y renderSongCard lo deriva, de
modo que el botón marcado y el contador sobreviven a un re-render del
grid. markLiked queda como actualización puntual del botón montado."
```

---

### Task 4: Barra de búsqueda, resumen y estado sin coincidencias

La funcionalidad en sí. Incluye su CSS, porque sin estilos el control es inusable y no se puede revisar.

**Files:**
- Modify: `frontend/js/views/catalog.js` — `renderSkeleton`, `renderGrid`, funciones nuevas
- Modify: `frontend/css/styles.css` — agregar al final

**Interfaces:**
- Consumes: `filterSongs` de `../search.js` (Tarea 1); `allSongs`, `gridEl`, `renderSkeleton`, `renderGrid` (Tarea 2); `likedIds`, `renderSongCard` (Tarea 3).
- Produces: estado `query: string` y los elementos `searchEl` y `summaryEl`. Ninguna otra parte del proyecto los consume.

- [ ] **Step 1: Escribir la verificación que falla**

Recargá y, en la consola:

```js
const campo = document.querySelector('.search-input');
console.log('existe la barra?', Boolean(campo));
console.log('existe el resumen?', Boolean(document.querySelector('.search-summary')));
```

- [ ] **Step 2: Ejecutarlo para confirmar que falla**

Expected: `existe la barra? false` y `existe el resumen? false`.

- [ ] **Step 3: Escribir la implementación**

Agregar el import al principio de `catalog.js`, respetando el orden alfabético que ya usa el archivo:

```js
import { filterSongs } from '../search.js';
```

Sumar al estado de módulo:

```js
let query = '';
let summaryEl = null;
let searchEl = null;
```

Reemplazar `renderSkeleton` por esta versión, que además recupera la query al remontar después de un "Reintentar":

```js
function renderSkeleton(container) {
    searchEl = el('input', {
        type: 'search',
        className: 'search-input',
        placeholder: 'Buscar por título o artista…',
        'aria-label': 'Buscar canciones por título o artista',
        autocomplete: 'off',
    });
    searchEl.value = query;
    summaryEl = el('p', { className: 'search-summary', 'aria-live': 'polite' });
    gridEl = el('section', { className: 'song-grid' });
    container.replaceChildren(
        el('h2', { className: 'view-title', text: 'Catálogo' }),
        el('div', { className: 'search-bar' }, [searchEl]),
        summaryEl,
        gridEl,
    );
    searchEl.addEventListener('input', onSearchInput);
    searchEl.addEventListener('keydown', onSearchKeydown);
}
```

Agregar los tres helpers nuevos, justo antes de `renderGrid`:

```js
function onSearchInput() {
    query = searchEl.value;
    renderGrid();
}

function onSearchKeydown(event) {
    // Escape con el campo ya vacío no hace nada: ni repinta ni roba el foco.
    if (event.key !== 'Escape' || searchEl.value === '') return;
    clearSearch();
}

function clearSearch() {
    searchEl.value = '';
    query = '';
    renderGrid();
    searchEl.focus();
}

function describeResults(visibles, total) {
    const plural = total === 1 ? 'canción' : 'canciones';
    if (query.trim() === '') return `${total} ${plural}`;
    return `Mostrando ${visibles} de ${total} ${plural}`;
}

function renderNoMatches() {
    const limpiar = el('button', { type: 'button', className: 'btn', text: 'Limpiar búsqueda' });
    limpiar.addEventListener('click', clearSearch);
    return el('div', { className: 'status no-matches' }, [
        el('p', { text: `Ninguna canción coincide con «${query.trim()}»` }),
        limpiar,
    ]);
}
```

Y reemplazar `renderGrid` por:

```js
export function renderGrid() {
    const visibles = filterSongs(allSongs, query);
    summaryEl.textContent = describeResults(visibles.length, allSongs.length);
    if (visibles.length === 0) gridEl.replaceChildren(renderNoMatches());
    else gridEl.replaceChildren(...visibles.map(renderSongCard));
    highlightPlaying(getCurrentSongId(), isPlaying());
}
```

El mensaje de "sin coincidencias" se arma con `el({ text })`, que escribe por `textContent`. Eso es lo que hace que una query como `<b>hola</b>` se muestre literal en vez de interpretarse como HTML; no lo cambies por una plantilla con `innerHTML`.

Agregar al final de `frontend/css/styles.css`:

```css
.search-bar { margin: 0 0 .5rem; }

.search-input {
    width: 100%;
    max-width: 420px;
    padding: .55rem .8rem;
    border-radius: var(--radius);
    border: 1px solid var(--surface-2);
    background: var(--surface);
    color: var(--text);
    font-size: 1rem;
}
.search-input:focus { outline: none; border-color: var(--accent); }
/* La ✕ nativa de type="search" viene casi negra y se pierde sobre el tema oscuro. */
.search-input::-webkit-search-cancel-button { filter: invert(.8); cursor: pointer; }

.search-summary { margin: 0 0 1rem; color: var(--muted); font-size: .85rem; }

/* El bloque de "sin coincidencias" ocupa todo el ancho del grid. */
.song-grid > .no-matches { grid-column: 1 / -1; }
.no-matches p { margin: 0 0 1rem; }
```

- [ ] **Step 4: Verificar que pasa**

Recargá con `Ctrl+Shift+R` y recorré la tabla completa. Las filas 6 a 9 son las del Review Focus.

| # | Acción | Esperado |
|---|---|---|
| 1 | Cargar la página | Barra visible, resumen `3 canciones`, las 3 tarjetas |
| 2 | Tipear `tranvias` | Solo *Garage Session #2*; resumen `Mostrando 1 de 3 canciones` |
| 3 | Tipear `LUNA` | Solo *Maqueta Nocturna* |
| 4 | Tipear `do` | Solo *Arpegio en Do* |
| 5 | Tipear `zzz` | `Mostrando 0 de 3 canciones` y el bloque con el botón **Limpiar búsqueda**; al pulsarlo vuelven las 3 y el foco queda en el campo |
| 6 | Tipear tres espacios | Las 3 canciones y resumen `3 canciones` — **no** el estado de sin coincidencias |
| 7 | Tipear `<b>hola</b>` | El mensaje muestra `«<b>hola</b>»` **como texto literal**; nada en negrita, nada interpretado |
| 8 | <kbd>Esc</kbd> con el campo vacío | No pasa nada: sin error en consola, el resumen no parpadea |
| 9 | ▶ en *Maqueta Nocturna*, luego tipear `arpegio`, luego <kbd>Esc</kbd> | La música **no se corta** en ningún momento; la barra inferior sigue mostrando *Maqueta Nocturna*; al limpiar, su tarjeta reaparece con borde verde y `❚❚ Pausar` |
| 10 | Dar like, después tipear y borrar | El botón sigue en *♥ Te gusta* deshabilitado y el contador conserva el valor nuevo |
| 11 | Tipear rápido una frase larga | El cursor nunca se pierde ni salta al principio |
| 12 | DevTools ▸ Network mientras se tipea | **Cero requests** y cero navegaciones de documento |

Falta un caso que no se puede provocar desde la interfaz: **el catálogo vacío no debe
mostrar la barra de búsqueda**, porque buscar sobre cero canciones no tiene sentido.
Para forzarlo, cortá el servidor y:

1. En `backend/seed.py`, cambiá a mano la línea 31 de `session.add_all(...)` por `return`,
   de modo que `seed_songs` salga sin insertar nada.
2. Borrá la base y levantá el servidor:
   ```bash
   rm backend/music.db
   uv run fastapi dev backend/main.py
   ```

Expected en `http://localhost:8000`: el mensaje *"Todavía no hay canciones"* **sin barra de
búsqueda, sin resumen y sin grid**. En la consola, `document.querySelector('.search-input')`
devuelve `null`.

3. Restaurá el archivo y la base:
   ```bash
   git checkout backend/seed.py
   rm backend/music.db
   git status --short backend/   # no debe listar nada
   ```

Volvé a levantar el servidor y confirmá que las 3 canciones y la barra reaparecen antes de
commitear. `music.db` está en `.gitignore`, así que borrarla no ensucia el repo.

- [ ] **Step 5: Commit**

```bash
git add frontend/js/views/catalog.js frontend/css/styles.css
git commit -m "feat(frontend): barra de búsqueda del catálogo

Filtra por título o artista mientras se escribe, reemplazando solo el
contenido del grid: el input conserva foco, texto y cursor. Resumen de
resultados, estado propio para cero coincidencias y limpieza con Esc o
con la ✕ nativa. Filtrado local y síncrono: sin requests ni debounce."
```

---

### Task 5: Mover `aria-live` fuera del `<main>`

Segundo defecto preexistente que el re-render activa: con `aria-live` en el contenedor, un lector de pantalla releería el catálogo entero en cada tecla.

**Files:**
- Modify: `frontend/index.html:23`

**Interfaces:**
- Consumes: el nodo `.search-summary` con `aria-live="polite"` que crea `renderSkeleton` (Tarea 4).
- Produces: nada que otro módulo consuma.

- [ ] **Step 1: Escribir la verificación que falla**

Con la página cargada, en la consola:

```js
console.log('main anuncia?',    document.getElementById('view').getAttribute('aria-live'));
console.log('resumen anuncia?', document.querySelector('.search-summary').getAttribute('aria-live'));
```

- [ ] **Step 2: Ejecutarlo para confirmar que falla**

Expected: `main anuncia? polite` y `resumen anuncia? polite`. **Las dos regiones anuncian a la vez**: por cada tecla, el lector lee el resumen y además las tres tarjetas completas.

- [ ] **Step 3: Escribir la implementación**

En `frontend/index.html`, línea 23, quitar el atributo:

```html
    <main id="view"></main>
```

- [ ] **Step 4: Verificar que pasa**

Recargá con `Ctrl+Shift+R` y volvé a correr el bloque del Step 1.
Expected: `main anuncia? null` y `resumen anuncia? polite`.

Después comprobá que no se rompió nada de lo anterior: tipear `luna` sigue filtrando, el resumen sigue actualizándose y ▶ sigue reproduciendo.

Si tenés un lector de pantalla a mano (Narrador de Windows, <kbd>Ctrl</kbd>+<kbd>Win</kbd>+<kbd>Enter</kbd>), tipear en la barra debe anunciar solo *"Mostrando 1 de 3 canciones"* y no la lista entera. Es deseable, no obligatorio.

- [ ] **Step 5: Commit**

```bash
git add frontend/index.html
git commit -m "fix(frontend): mover aria-live del <main> al resumen de resultados

Con el grid re-renderizándose en cada tecla, una región live en el
contenedor hacía que el lector de pantalla releyera el catálogo completo.
El resumen es el nodo que realmente condensa el cambio."
```

---

### Task 6: Documentación y cierre del hito

**Files:**
- Modify: `README.md`
- Modify: `docs/memory.md`

**Interfaces:**
- Consumes: todo lo construido en las Tareas 1 a 5.
- Produces: nada de código.

- [ ] **Step 1: Verificar los guardrails antes de documentar**

```bash
wc -l frontend/js/search.js frontend/js/views/catalog.js frontend/css/styles.css frontend/index.html
```

Expected: `search.js` ~35 líneas, `catalog.js` por debajo de 200, todos muy lejos del tope de 300. Si `catalog.js` se acercara a 300, extraé la barra de búsqueda a `js/views/catalog-search.js` antes de seguir.

Revisá también a ojo que ninguna función nueva pase de 50 líneas; la más larga es `renderSongCard`, de unas 20.

- [ ] **Step 2: Agregar la sección de verificación al README**

Agregar al `README.md`, dentro de la sección de verificación existente:

```markdown
### Buscador del catálogo

Filtrado local: la barra filtra la lista que ya devolvió `GET /api/songs`,
sin pedirle nada al servidor. Con el seed por defecto:

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

Limpiar la búsqueda: tecla <kbd>Esc</kbd> o la ✕ nativa del campo.
```

- [ ] **Step 3: Ejecutar el paso 7 de esa tabla, que ninguna tarea anterior cubrió**

Es el único camino que no se probó todavía, porque cruza dos tareas.

1. Con la app cargada, tipeá `luna` en la barra.
2. Cortá el servidor con `Ctrl+C`.
3. Recargá la página: aparece *"No se pudo cargar el catálogo…"* con **Reintentar**.
4. Volvé a levantar el servidor y pulsá **Reintentar**.

Expected: el catálogo vuelve y la barra reaparece con `luna` ya escrito, filtrando a *Maqueta Nocturna*. Esto comprueba que `renderSkeleton` restaura `searchEl.value = query`.

Nota: tras recargar la página el estado del módulo se reinicia, así que para ver la query preservada hay que tipear **antes** de que falle el fetch. Si preferís reproducirlo sin recargar, cortá el servidor y pulsá Reintentar desde la misma sesión.

- [ ] **Step 4: Sobrescribir `docs/memory.md`**

Como pide `CLAUDE.md`, reemplazá el contenido completo por:

```markdown
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

- Mover el filtrado al backend con `?q=` sobre `GET /api/songs`. Al volverse asíncrono
  va a necesitar debounce y estado de carga.
- Automatizar la tabla de verificación del README con un servidor MCP de Playwright.
- Pushear `feature/buscador-catalogo` y abrir el PR a `main`.
```

- [ ] **Step 5: Commit**

```bash
git add README.md docs/memory.md
git commit -m "docs: verificación del buscador y bitácora del hito"
```

---

## Cierre

Con las seis tareas commiteadas, el branch `feature/buscador-catalogo` queda listo para revisión. Antes de abrir el PR conviene pasar el skill `superpowers:requesting-code-review`, y `superpowers:finishing-a-development-branch` para decidir cómo integrarlo.

Lo que **no** entra en este plan y está deliberadamente fuera de alcance: debounce, el parámetro `?q=` en el backend, persistir la búsqueda en la URL o en `localStorage`, resaltar el fragmento coincidente, ordenar u ofrecer otros campos de filtrado, y cualquier runner de tests en el frontend.
