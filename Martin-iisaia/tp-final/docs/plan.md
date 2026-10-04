# Plan: Plataforma de Streaming de Música (TP final)

## Context

El proyecto es el MVP de una plataforma web de música estilo Spotify/YouTube Music orientada a artistas independientes. El objetivo principal es poder listar maquetas, reproducirlas de forma continua y permitir a los usuarios dejar un "Me gusta".

Decisiones de arquitectura ya tomadas:
- **Frontend** en HTML/CSS/JS vanilla con ES modules, sin paso de build ni frameworks. Arquitectura tipo "Shell" para que el `<audio>` persista sin cortarse al navegar.
- **Identificación:** El usuario ingresa un nickname simple para dejar un "like" (sin sistema complejo de login/JWT).
- **Backend** en FastAPI + SQLite (SQLModel) con listado de canciones y registro de likes.
- **Almacenamiento:** Los archivos `.mp3` no van a la base de datos. Se sirven desde una carpeta estática local (`backend/static/audio/`), la DB solo guarda la ruta relativa.
- Los límites de `CLAUDE.md` aplican: menos de 300 líneas por archivo, menos de 50 por función, manejo explícito de errores y estados de "Cargando...".

## Estructura

```text
tp-final/
├── README.md              informe completo
├── pyproject.toml         fastapi[standard], sqlmodel (uv)
├── uv.lock
├── .gitignore             *.db, __pycache__/
├── docs/plan.md           este archivo
├── backend/
│   ├── main.py            app, lifespan (crea tablas + seed), routers, StaticFiles
│   ├── db.py              engine SQLite, get_session
│   ├── models.py          tablas Song y Like (SQLModel)
│   ├── schemas.py         Esquemas Pydantic separados para Input/Output
│   ├── routes.py          Endpoints de la API
│   └── static/
│       └── audio/         (Aquí irán 2 o 3 archivos mp3 de prueba)
└── frontend/
    ├── index.html         Shell principal (Catálogo + Reproductor inferior)
    ├── css/styles.css
    └── js/
        ├── api.js         fetch wrappers con manejo de errores
        ├── app.js         lógica de renderizado del catálogo
        └── player.js      lógica de la etiqueta <audio> nativa

```

## Backend

**Modelo de datos (SQLModel):**

* `Song`: `id`, `title` (str), `artist` (str), `audio_url` (str)
* `Like`: `id`, `song_id` (FK), `player_nickname` (str), `created_at` (datetime UTC)

Seed idempotente en el lifespan: Al arrancar el servidor, si la tabla `Song` está vacía, debe insertar automáticamente 2 o 3 canciones de prueba apuntando a `/static/audio/track1.mp3`, etc. El archivo de base de datos será `music.db` relativo al paquete.

**Endpoints (bajo `/api`):**

| Method | Path | Respuesta |
| --- | --- | --- |
| GET | `/api/songs` | 200 `SongOut[]` (Lista de canciones con cantidad total de likes) |
| POST | `/api/songs/{id}/like` | 201 `LikeOut` / 404 si la canción no existe / 422 si la validación falla |

`main.py` montará `StaticFiles(directory="frontend", html=True)` en `/` **después** de incluir el router `/api`. Así un solo proceso sirve todo sin problemas de CORS. Los audios se servirán montando otra ruta estática en `/static`.

## Frontend

* **`index.html`**: Estructura dividida. Un contenedor central para la lista de canciones y una barra inferior fija (bottom bar) que contiene la etiqueta nativa `<audio>` y los controles de play/pause.
* **`app.js`**: Llama a `GET /api/songs`. Muestra "Cargando catálogo..." y luego renderiza las tarjetas de las canciones. Cada tarjeta tiene un botón "Reproducir" y un botón "Like". Al dar Like, envía `POST /api/songs/{id}/like` bloqueando el botón hasta tener éxito.
* **`player.js`**: Expone una función global o evento para recibir una `audio_url`. Al dispararse, actualiza el `src` de la etiqueta `<audio>` y llama a `.play()`. Se encarga de manejar el cambio de canciones sin recargar la página.
* **CSS**: Diseño sobrio, tema oscuro por defecto (modo dark), y barra inferior anclada (`position: fixed; bottom: 0;`).

## Verificación Mínima

1. `uv run fastapi dev backend/main.py`.
2. Probar API con curl o `/docs`:
* `GET /api/songs` debe devolver el seed.
* `POST /api/songs/1/like` con `{ "player_nickname": "juan" }` devuelve 201.


3. Prueba UI:
* Abrir `localhost:8000`. Ver el catálogo.
* Hacer clic en "Reproducir" y confirmar que la música suena y no se corta al dar "Like" a otra canción.

