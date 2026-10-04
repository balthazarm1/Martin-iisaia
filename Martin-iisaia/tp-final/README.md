# Trabajo Práctico Final — Título

La aplicación completa: interfaz, servidor y datos que persisten. Se presenta y se defiende en la última clase.

Además de lo que pide cada entrega anterior, acá se espera que el repositorio conserve la evidencia del proceso: la especificación y el plan como archivos en disco, el historial de commits, las branches y los pull requests. Para cuando llegues a esta entrega vas a tener las herramientas para que eso salga solo, como subproducto de trabajar bien.

## Cómo se ejecuta

Requisitos: [uv](https://docs.astral.sh/uv/) (instala Python 3.11+ si hace falta). No hay variables de entorno.

```bash
cd tp-final
uv sync
uv run fastapi dev backend/main.py
```

Abrir <http://localhost:8000>. La documentación interactiva de la API está en <http://localhost:8000/docs>.
La base `backend/music.db` se crea sola al arrancar, con 3 canciones de prueba. Para empezar de cero alcanza con borrarla.

## Arquitectura

Un solo proceso FastAPI sirve la API, los audios y el frontend, así que no hay CORS.

```text
Navegador ── GET /            → frontend/ (StaticFiles, index.html = Shell)
          ── GET /api/...     → routers (songs, likes) → SQLite (SQLModel)
          ── GET /static/...  → backend/static/audio/*.mp3|wav
```

**Datos**
- `Song`: `id`, `title`, `artist`, `audio_path` (solo la ruta, el archivo vive en disco), `duration_s`.
- `Like`: `id`, `song_id` (FK), `nickname`, `created_at`. Hay una restricción única sobre `(song_id, nickname)`.

**Contrato API**

| Method | Path | Body | Respuestas |
|---|---|---|---|
| GET | `/api/songs` | — | 200 `SongOut[]` |
| GET | `/api/songs/{id}` | — | 200 `SongOut` · 404 |
| POST | `/api/songs/{id}/like` | `{"nickname": "juan"}` | 201 `LikeOut` · 404 · 409 (like repetido) · 422 |

`SongOut = {id, title, artist, audio_url, likes_count}` y `LikeOut = {id, song_id, nickname, created_at, likes_count}`. Los errores siempre vienen como `{"detail": "..."}`.

**Frontend (Vanilla JS, ES Modules, sin build)**
- `index.html` es la Shell. El `<audio>` vive en la barra inferior y nunca se recrea.
- `js/player.js` es el único módulo que toca el `<audio>`. Avisa los cambios con el evento `player:change`.
- `js/views/catalog.js` renderiza el catálogo por DOM después del `fetch`. Muestra "Cargando...", tiene reintento y marca la tarjeta que está sonando.
- `js/api.js` normaliza los errores en `ApiError(status, message)`. `js/ui.js` tiene los helpers de DOM y el banner de errores.

## Qué decidí yo

- **Shell con reproductor persistente.** La página nunca se recarga y la música no se corta.
- **Una sola vista (catálogo)** para el MVP.
- **Identidad liviana:** un nickname en `localStorage`, sin login. Se permite un like por canción y nickname, y el repetido devuelve 409.
- **Sin upload:** los audios se cargan con un seed idempotente y la DB solo guarda el path.
- **Arranque desde cero:** el MVP anterior (commit `8a69c08`) se descartó y quedó como referencia.

## Cómo gestioné el contexto

Un proyecto de varios archivos y varias sesiones no entra entero en la ventana de contexto. Cómo lo resolviste: qué persististe, qué aislaste, cómo hiciste para que el agente no perdiera el hilo entre sesiones.

## Qué salió mal

Los desvíos grandes: dónde el agente se fue para otro lado, cómo lo detectaste y cómo lo corregiste.
