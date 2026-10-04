# Plan: IndieStream — SPA de música para artistas independientes

## Context

IndieStream es el TP final: una SPA donde se listan maquetas de artistas independientes, se reproducen con un reproductor persistente y se les puede dar "Me gusta". Se arranca desde cero; el MVP anterior (commit `8a69c08`) solo sirve de referencia.

Decisiones cerradas:
- **Arquitectura Shell:** `index.html` es la única página. El `<audio>` vive en una barra inferior fija y nunca se recrea. La vista central (catálogo) se re-renderiza por DOM tras `fetch` a `/api`. Prohibidos `location.reload()` y `<a href>` que cambien el documento.
- **Una sola vista:** catálogo de canciones (Reproducir + Like + contador).
- **Identidad:** nickname libre guardado en `localStorage`. Un like por par (canción, nickname); si se repite → `409 Conflict`.
- **Audio:** los `.mp3` viven en `backend/static/audio/` y se sirven con `StaticFiles` en `/static`. La DB solo guarda el path (`/static/audio/xxx.mp3`). No hay upload; las canciones entran por un seed idempotente.
- **Stack:** Python 3.11+, FastAPI, SQLModel, SQLite (`music.db` relativo al paquete `backend/`), `uv`. Frontend en Vanilla JS con ES Modules, sin build.
- **Guardrails (CLAUDE.md):** ≤300 líneas por archivo, ≤50 por función, type hints, `response_model` explícito, `Depends` para la sesión, 404 para recursos inexistentes, "Cargando..." y errores visibles en toda acción async.

## Estructura objetivo

```text
tp-final/
├── pyproject.toml          fastapi[standard], sqlmodel
├── uv.lock
├── .gitignore              *.db, __pycache__/, .venv/
├── CLAUDE.md
├── .claude/rules/{api,frontend}.md
├── docs/{plan.md,memory.md}
├── backend/
│   ├── __init__.py
│   ├── main.py             app, lifespan, include_router(/api), mounts /static y /
│   ├── config.py           BASE_DIR, DB_PATH, STATIC_DIR, FRONTEND_DIR (pathlib)
│   ├── db.py               engine, create_db(), get_session() (generator)
│   ├── models.py           Song, Like (SQLModel, table=True)
│   ├── schemas.py          SongOut, LikeIn, LikeOut, ErrorOut (Pydantic)
│   ├── seed.py             seed_songs(session) idempotente
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── songs.py        GET /songs, GET /songs/{id}
│   │   └── likes.py        POST /songs/{id}/like
│   └── static/audio/       2–3 mp3 de prueba
└── frontend/
    ├── index.html          shell: header (nickname), <main id="view">, <footer> con <audio>
    ├── css/styles.css      tema oscuro, barra fija abajo
    └── js/
        ├── main.js         entrypoint: initPlayer, initNickname, mountCatalog
        ├── api.js          request() genérico + getSongs, likeSong
        ├── player.js       único dueño del <audio>; playTrack, eventos
        ├── nickname.js     get/set en localStorage
        ├── ui.js           helpers: setLoading(btn), showError(msg), el()
        └── views/catalog.js render del catálogo y handlers de Play/Like
```

## Paso 0 — Preparar el entorno de reglas

1. Las reglas de `.claude/rules/*.md` tienen `paths:` sin delimitadores `---`, así que no se leen como frontmatter. Envolverlas en `---` … `---` para que el scoping por path funcione.
2. `.gitignore`: `*.db`, `__pycache__/`, `.venv/`.
3. `uv init` o un `pyproject.toml` a mano con `fastapi[standard]` y `sqlmodel`, y después `uv sync`.
4. Commit: `chore: scaffolding IndieStream`.

## Paso 1 — Backend: configuración y DB

- `config.py`: `BASE_DIR = Path(__file__).resolve().parent`, `DB_PATH = BASE_DIR / "music.db"`, `STATIC_DIR = BASE_DIR / "static"`, `FRONTEND_DIR = BASE_DIR.parent / "frontend"`. Usar paths absolutos evita depender del cwd, que era un riesgo del MVP anterior con `directory="backend/static"`.
- `db.py`: `engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})`, `create_db() -> None`, `get_session() -> Iterator[Session]` con `with Session(engine) as s: yield s`.

## Paso 2 — Backend: modelos y esquemas (separados)

**models.py**
- `Song`: `id: int | None (PK)`, `title: str`, `artist: str`, `audio_path: str` (único), `duration_s: int | None`.
- `Like`: `id`, `song_id: int (FK song.id, index)`, `nickname: str (index)`, `created_at: datetime` (UTC, `default_factory`). `UniqueConstraint("song_id", "nickname")` en `__table_args__`.

**schemas.py**
- `SongOut`: `id, title, artist, audio_url, likes_count: int`.
- `LikeIn`: `nickname: str` (`min_length=2, max_length=30`, strip y regex `^[\w\- ]+$`).
- `LikeOut`: `id, song_id, nickname, created_at, likes_count` (el total actualizado, así el front no tiene que volver a pedirlo).
- `ErrorOut`: `detail: str` (para documentar 404 y 409 en `responses=`).

## Paso 3 — Backend: seed y routers

- `seed.py`: `seed_songs(session) -> None`. Si `select(Song).limit(1)` devuelve algo, sale sin hacer nada. Si no, inserta 3 canciones con `audio_path="/static/audio/trackN.mp3"`. Además valida con `(STATIC_DIR / ...).exists()` y emite un warning en el log si falta un archivo.
- `routers/songs.py` (`APIRouter(prefix="/songs", tags=["songs"])`):
  - `GET ""` → `list[SongOut]`, con `outerjoin` a Like y `func.count` agrupado por Song. Helper `_to_song_out(song, count)`.
  - `GET "/{song_id}"` → `SongOut` o 404.
- `routers/likes.py` (`APIRouter(prefix="/songs", tags=["likes"])`):
  - `POST "/{song_id}/like"` → `201 LikeOut`. 404 si la canción no existe, 409 si se captura `IntegrityError` (like duplicado; se hace rollback), 422 automático de Pydantic.
- Todos los endpoints con `response_model`, type hints y `session: Session = Depends(get_session)`.

## Paso 4 — Backend: main.py

Orden de montaje (importa):
1. `lifespan`: `create_db()` y después `seed_songs()`.
2. `app.include_router(songs.router, prefix="/api")` y `app.include_router(likes.router, prefix="/api")`.
3. `app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")`.
4. `app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")`, **siempre al final**.

Checkpoint: `uv run fastapi dev backend/main.py` y probar `/docs`. Commit: `feat(api): songs y likes`.

## Paso 5 — Frontend: shell e infraestructura

- `index.html`: `<header>` con input de nickname, `<main id="view" aria-live="polite">` y un `<footer id="player-bar">` con `<audio id="audio" preload="none">`, título actual y botón play/pause. Un único `<script type="module" src="/js/main.js">`. Sin `<a href>` de navegación.
- `api.js`: `request(path, options)` hace `fetch('/api'+path)`, revisa `res.ok`, parsea `detail` y lanza `ApiError(status, message)`. Encima de eso, `getSongs()` y `likeSong(id, nickname)`.
- `ui.js`: `withLoading(button, label, asyncFn)` deshabilita el botón, muestra "Cargando..." y restaura en `finally`. También `showError(msg)` (banner descartable) y `el(tag, attrs, children)`, que crea nodos con `textContent` y nunca con `innerHTML` para datos del servidor (evita XSS).
- `nickname.js`: `getNickname()` y `setNickname(v)` sobre `localStorage['indiestream.nickname']`.

## Paso 6 — Frontend: player persistente

- `player.js` es el único módulo que toca el `<audio>`. Expone:
  - `initPlayer()`: cablea play/pause y los eventos `playing`, `pause`, `ended` y `error`. En `error` muestra "No se pudo cargar el audio".
  - `playTrack({id, title, artist, audio_url})`: si es la misma pista alterna play/pause; si no, cambia `src` y llama a `.play()` con `catch` del error de autoplay.
  - Al cambiar de estado despacha `CustomEvent('player:change', {detail:{songId, playing}})` en `document`.
- El catálogo escucha `player:change` para resaltar la tarjeta activa. Re-renderizar el catálogo nunca toca el `<audio>`.

## Paso 7 — Frontend: vista catálogo

- `views/catalog.js`, `mountCatalog(container)`:
  1. Muestra "Cargando catálogo...".
  2. Hace `await getSongs()` dentro de `try/catch`. Si falla, muestra un mensaje de error y un botón "Reintentar" que vuelve a llamar a `mountCatalog` sin recargar.
  3. Lista vacía: "Todavía no hay canciones".
  4. `renderSongCard(song)` arma la tarjeta con título, artista, contador, ▶ Reproducir y ♥ Like.
- El handler de Like:
  - Si no hay nickname, enfoca el input y muestra un aviso.
  - Si hay, llama a `withLoading(btn, "Cargando...", () => likeSong(...))` y actualiza el contador con `likes_count` de la respuesta.
  - Si vuelve 409, muestra "Ya diste like" y deja el botón marcado. Cualquier otro error va a `showError`.
- Delegación de eventos: un solo listener en el contenedor, con `data-action` y `data-id`.

## Paso 8 — CSS

Tema oscuro con variables CSS en `:root` y grid responsive de tarjetas. `#player-bar { position: fixed; bottom: 0; }`, más `padding-bottom` en `main` para que la barra no tape contenido. Estados visibles para `.is-loading`, `.is-playing`, `.is-liked` y `[disabled]`.

## Paso 9 — Cierre de hito

- Revisar los guardrails: `wc -l` por archivo (≤300) y funciones ≤50 líneas.
- Sobrescribir `docs/memory.md` con lo logrado, las decisiones y el próximo paso.
- Completar el README (cómo se ejecuta, arquitectura, decisiones).
- Commits atómicos por paso en una branch `feat/indiestream` y PR a `main`.

## Contrato API

| Method | Path | Body | Respuestas |
|---|---|---|---|
| GET | `/api/songs` | — | 200 `SongOut[]` |
| GET | `/api/songs/{id}` | — | 200 `SongOut` · 404 |
| POST | `/api/songs/{id}/like` | `{"nickname": "juan"}` | 201 `LikeOut` · 404 · 409 · 422 |
| GET | `/static/audio/{file}` | — | archivo mp3 (StaticFiles) |

## Verificación

1. `uv sync` y luego `uv run fastapi dev backend/main.py`.
2. API (curl o `/docs`):
   - `GET /api/songs` devuelve las 3 canciones con `likes_count: 0`.
   - `GET /api/songs/999` devuelve 404.
   - `POST /api/songs/1/like` con `{"nickname":"juan"}` devuelve 201, `likes_count: 1`; repetido devuelve 409; con `{"nickname":""}` devuelve 422; en `/api/songs/999/like` devuelve 404.
   - `GET /static/audio/track1.mp3` devuelve 200 `audio/mpeg`.
   - Reiniciar el servidor no duplica el seed.
3. UI en `http://localhost:8000`:
   - Se ve "Cargando catálogo..." y después las tarjetas.
   - Al dar ▶ suena el audio. Dar Like en otra tarjeta no corta la música y el botón muestra "Cargando...".
   - El segundo like con el mismo nickname muestra "Ya diste like".
   - Con el servidor apagado, Reintentar muestra un error claro y no recarga la página.
   - En DevTools > Network no aparece ninguna navegación de documento después de la carga inicial.
